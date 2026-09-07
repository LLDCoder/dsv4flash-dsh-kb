import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import audit_identity_from_payloads, audit_identity_from_user_info


class AuditIdentityTests(unittest.TestCase):
    def test_extracts_login_account_and_current_role_from_verified_umc_identity(self):
        identity = audit_identity_from_user_info({
            "data": {
                "email": "customer@example.test",
                "currentRoleName": "Customer Account Owner",
            }
        })

        self.assertEqual(identity, {"account": "customer@example.test", "currentRole": "Customer Account Owner"})

    def test_uses_the_first_role_when_no_current_role_is_supplied(self):
        identity = audit_identity_from_user_info({
            "data": {
                "loginAccount": "customer@example.test",
                "roles": ["Customer User", "Customer Manager"],
            }
        })

        self.assertEqual(identity, {"account": "customer@example.test", "currentRole": "Customer User"})

    def test_uses_customer_portal_list_roles_display_name(self):
        identity = audit_identity_from_user_info({
            "data": {
                "email": "customer@example.test",
                "listRoles": [
                    {"nameEn": "Foreign Media Manager", "name": "foreign-media-manager", "nameAr": "مدير الإعلام الأجنبي"},
                ],
            }
        })

        self.assertEqual(identity, {"account": "customer@example.test", "currentRole": "Foreign Media Manager"})

    def test_uses_the_latest_message_identity_for_the_audit_overview(self):
        identity = audit_identity_from_payloads([
            {"auditIdentity": {"account": "new@example.test", "currentRole": "Customer Account Owner"}},
            {"auditIdentity": {"account": "old@example.test", "currentRole": "Former Role"}},
        ])

        self.assertEqual(identity, {"account": "new@example.test", "currentRole": "Customer Account Owner"})


if __name__ == "__main__":
    unittest.main()
