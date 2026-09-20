import base64
import os
import tempfile
from pathlib import Path

import httpx
import pytesseract
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from PIL import Image

OCR_MODEL = os.getenv("OCR_MODEL_NAME", "tesseract-lstm")
OCR_LANG = os.getenv("OCR_LANG", "eng")


class LayoutParsingRequest(BaseModel):
    file: str = Field(min_length=1)
    fileType: int | None = Field(default=None, ge=0, le=1)
    mimeType: str | None = None
    model_config = {"extra": "allow"}


app = FastAPI(title="DSH CPU OCR", version="0.2.0")


async def _materialize(value: str, file_type: int | None, mime_type: str | None) -> tuple[str, bool, bool]:
    if value.startswith("data:"):
        _, encoded = value.split(",", 1)
        data = base64.b64decode(encoded)
    elif value.startswith("http://") or value.startswith("https://"):
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.get(value)
            response.raise_for_status()
            data = response.content
    else:
        try:
            data = base64.b64decode(value, validate=True)
        except Exception as exc:
            raise ValueError("file must be an HTTP URL or Base64 payload") from exc
    normalized_mime = (mime_type or "").split(";", 1)[0].strip().lower()
    is_text = normalized_mime in {"text/plain", "text/markdown", "text/csv", "application/json"}
    suffix = ".pdf" if file_type == 0 else ".txt" if is_text else ".png"
    handle = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    handle.write(data)
    handle.close()
    return handle.name, suffix == ".pdf", is_text


def _parse_text(path: str) -> list[dict]:
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    rows = []
    for index, line in enumerate(text.splitlines()[:5000]):
        value = line[:4000].strip()
        if not value:
            continue
        y = index * 20
        rows.append({"text": value, "score": 1.0, "box": [[0, y], [4000, y], [4000, y + 20], [0, y + 20]]})
    return rows


def _parse_image(path: str) -> list[dict]:
    image = Image.open(path)
    data = pytesseract.image_to_data(image, lang=OCR_LANG, output_type=pytesseract.Output.DICT)
    rows = []
    for i, text in enumerate(data.get("text", [])):
        text = (text or "").strip()
        try:
            score = float(data["conf"][i]) / 100.0
        except (ValueError, TypeError, KeyError):
            score = 0.0
        if not text or score < 0:
            continue
        x, y, w, h = (int(data[k][i]) for k in ("left", "top", "width", "height"))
        rows.append({"text": text, "score": score, "box": [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]})
    return rows


@app.get("/health")
async def health():
    return {"status": "ok", "provider": "Tesseract-CPU", "model": OCR_MODEL}


@app.post("/layout-parsing")
async def layout_parsing(payload: LayoutParsingRequest):
    path = None
    try:
        path, is_pdf, is_text = await _materialize(payload.file, payload.fileType, payload.mimeType)
        if is_text:
            return {"provider": "DSH-Text-Local", "model": "plain-text", "pages": [{"page": 1, "lines": _parse_text(path)}]}
        if is_pdf:
            import pypdfium2 as pdfium

            pdf = pdfium.PdfDocument(path)
            pages = []
            for index in range(len(pdf)):
                bitmap = pdf[index].render(scale=2.0)
                image_path = f"{path}.{index}.png"
                bitmap.to_pil().save(image_path)
                pages.append({"page": index + 1, "lines": _parse_image(image_path)})
                Path(image_path).unlink(missing_ok=True)
            return {"provider": "Tesseract-CPU", "model": OCR_MODEL, "pages": pages}
        return {"provider": "Tesseract-CPU", "model": OCR_MODEL, "pages": [{"page": 1, "lines": _parse_image(path)}]}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"CPU OCR unavailable: {exc}") from exc
    finally:
        if path:
            Path(path).unlink(missing_ok=True)
