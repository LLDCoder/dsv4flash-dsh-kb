"""Automatic UMC customer-portal authentication.

The UMC portal encrypts the password in the browser before calling
``/api/User/Login``.  This client mirrors that small, fixed AES-CBC envelope so
the test console can obtain a short-lived UMC token without asking an operator
to paste credentials or tokens into the page.
"""

import asyncio
import base64
import time
from collections.abc import Mapping
from typing import Any

import httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from .config import Settings


class UMCAuthError(RuntimeError):
    """A safe, user-facing UMC login failure without credential material."""


class UMCAuthClient:
    _AES_KEY = b"rRgORced0ZjzOhgiciT2oonGfO2DbZ7Z"
    _AES_IV = b"IT3tqtrHxunSiS5b"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._token = ""
        self._expires_at = 0.0
        self._lock = asyncio.Lock()

    @classmethod
    def _encrypt_password(cls, password: str) -> str:
        # CryptoJS's Pkcs7 padding is equivalent to the 16-byte block padding
        # used by cryptography's AES-CBC primitive.
        raw = password.encode("utf-8")
        padding = 16 - (len(raw) % 16)
        padded = raw + bytes([padding]) * padding
        encryptor = Cipher(algorithms.AES(cls._AES_KEY), modes.CBC(cls._AES_IV)).encryptor()
        encrypted = encryptor.update(padded) + encryptor.finalize()
        return base64.b64encode(encrypted).decode("ascii")

    @staticmethod
    def _payload_data(payload: Any) -> Mapping[str, Any]:
        if not isinstance(payload, Mapping):
            return {}
        data = payload.get("data")
        if isinstance(data, Mapping):
            return data
        return payload

    @staticmethod
    def _message(payload: Any) -> str:
        if not isinstance(payload, Mapping):
            return ""
        for source in (payload, payload.get("data")):
            if isinstance(source, Mapping):
                for key in ("message", "error", "detail", "title"):
                    value = source.get(key)
                    if isinstance(value, str) and value.strip():
                        return value.strip()[:240]
        return ""

    @staticmethod
    def _mask_email(email: str) -> str:
        local, separator, domain = email.partition("@")
        if not separator:
            return "configured account"
        visible = local[:2] if len(local) > 2 else local[:1]
        return f"{visible}***@{domain}"

    async def get_session(self, *, force_refresh: bool = False) -> dict[str, Any]:
        now = time.monotonic()
        if not force_refresh and self._token and now < self._expires_at:
            return {
                "token": self._token,
                "tokenType": "Bearer",
                "expiresInMinutes": max(1, int((self._expires_at - now) / 60)),
                "account": self._mask_email(self.settings.umc_login_email),
            }

        async with self._lock:
            now = time.monotonic()
            if not force_refresh and self._token and now < self._expires_at:
                return {
                    "token": self._token,
                    "tokenType": "Bearer",
                    "expiresInMinutes": max(1, int((self._expires_at - now) / 60)),
                    "account": self._mask_email(self.settings.umc_login_email),
                }
            email = (self.settings.umc_login_email or "").strip().lower()
            password = self.settings.umc_login_password or ""
            url = (self.settings.umc_login_url or "").strip()
            if not email or not password or not url:
                raise UMCAuthError("UMC 自动登录未配置账号、密码或登录地址")
            request_body = {
                "loginProvider": email,
                "providerKey": self._encrypt_password(password),
                "loginType": 2,
            }
            try:
                async with httpx.AsyncClient(timeout=self.settings.umc_login_timeout_seconds, follow_redirects=True) as client:
                    response = await client.post(url, json=request_body)
            except httpx.HTTPError as exc:
                raise UMCAuthError(f"无法连接 UMC 登录服务：{exc.__class__.__name__}") from exc

            try:
                payload = response.json()
            except ValueError:
                payload = {}
            if response.status_code >= 400:
                detail = self._message(payload)
                suffix = f"：{detail}" if detail else ""
                raise UMCAuthError(f"UMC 登录失败（HTTP {response.status_code}）{suffix}")

            data = self._payload_data(payload)
            if data.get("twoFactorEnabled") is True or data.get("requiresTwoFactor") is True:
                raise UMCAuthError("UMC 账号要求二次验证，当前无法自动完成登录")
            token = data.get("token") or data.get("accessToken") or data.get("access_token")
            if not isinstance(token, str) or not token.strip():
                detail = self._message(payload)
                suffix = f"：{detail}" if detail else ""
                raise UMCAuthError(f"UMC 登录响应未返回 Token{suffix}")
            token = token.strip()
            if token.lower().startswith("bearer "):
                token = token[7:].strip()
            try:
                expire_minutes = float(data.get("tokenExpireMinutes") or data.get("expiresInMinutes") or 15)
            except (TypeError, ValueError):
                expire_minutes = 15.0
            # Refresh one minute before expiry so uploads and WS authentication
            # do not race a token that is about to expire.
            self._token = token
            self._expires_at = time.monotonic() + max(60.0, expire_minutes * 60.0 - 60.0)
            return {
                "token": token,
                "tokenType": "Bearer",
                "expiresInMinutes": max(1, int(expire_minutes)),
                "account": self._mask_email(email),
            }
