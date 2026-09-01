import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[2] / "platform-gateway" / "app.py"
SPEC = importlib.util.spec_from_file_location("dsh_platform_gateway", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class PlatformGatewayControlTests(unittest.TestCase):
    def test_confirmed_is_not_forwarded_to_umc(self):
        self.assertEqual(
            MODULE._upstream_parameters({"appealId": 13, "confirmed": True}),
            {"appealId": 13},
        )

    def test_business_fields_are_preserved(self):
        payload = {
            "violationId": 30,
            "reasonId": 3,
            "remark": "Evidence dispute",
            "attachmentUrl1": "evidence.pdf",
        }
        self.assertEqual(MODULE._upstream_parameters(payload), payload)


if __name__ == "__main__":
    unittest.main()
