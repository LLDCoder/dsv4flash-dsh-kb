import unittest

from app.profile_scope import ProfileContext, ProfileReference, profile_context_from_payload, requested_profile
from app.service import DSHService


class AuthorizedTargetChoiceTests(unittest.TestCase):
    def setUp(self):
        self.profiles=(ProfileReference('gov','Agency','establishment',('جهة حكومية',)),ProfileReference('one','Trading Company','establishment',('شركة أولى',)),ProfileReference('two','Trading Company','establishment',('شركة ثانية',)))

    def test_duplicate_names_never_fall_through_to_current_records(self):
        context=ProfileContext('gov','Agency',False,self.profiles)
        for language,question in [('en','Show my Trading Company applications.'),('ar','أرني طلباتي في ملف Trading Company')]:
            result=DSHService.profile_scope_guard(question,language,context)
            self.assertEqual(result['code'],'profile_choice_required')
            self.assertEqual([p['profileId'] for p in result['profileAction']['candidateProfiles']],['one','two'])
            self.assertIn('Agency',result['content'])

    def test_current_identity_is_not_automatically_swapped_for_its_namesake(self):
        context=ProfileContext('one','Trading Company',False,self.profiles)
        self.assertIsNone(requested_profile('Show my Trading Company applications',context))
        self.assertEqual(DSHService.profile_scope_guard('Show my Trading Company applications','en',context)['code'],'profile_choice_required')

    def test_explicit_choice_can_only_confirm_token_selected_identity(self):
        payload={'activeProfileId':'one','activeProfileName':'Trading Company','confirmedTargetProfileId':'one','profiles':[{'profileId':p.profile_id,'profileName':p.name,'nameAliases':list(p.aliases)} for p in self.profiles]}
        context=profile_context_from_payload(payload,trusted_profile_id='one')
        self.assertIsNone(DSHService.profile_scope_guard('Show my Trading Company applications','en',context))
        payload['confirmedTargetProfileId']='two'
        context=profile_context_from_payload(payload,trusted_profile_id='one')
        self.assertIsNone(context.confirmed_target_id)
        self.assertEqual(DSHService.profile_scope_guard('Show my Trading Company applications','en',context)['code'],'profile_choice_required')

    def test_current_context_and_distinct_destination_resolve_destination(self):
        context=ProfileContext('gov','Agency',False,(self.profiles[0],ProfileReference('other','Other Company')))
        target=requested_profile('I am using Agency; show my Other Company applications',context)
        self.assertEqual(target.profile_id,'other')

    def test_unknown_owner_stays_target_free_even_with_authorized_name(self):
        context=ProfileContext('gov','Agency',False,self.profiles)
        result=DSHService.profile_scope_guard('Show outside.owner.42 licenses in Trading Company','en',context)
        self.assertEqual(result['code'],'external_account_lookup')
        self.assertNotIn('profileAction',result)

    def test_dotted_authorized_names_can_offer_choice_without_account_enumeration(self):
        context=ProfileContext('gov','Agency',False,(ProfileReference('one','Owned.Company'),ProfileReference('two','Owned.Company')))
        result=DSHService.profile_scope_guard('Show my applications in Owned.Company','en',context)
        self.assertEqual(result['code'],'profile_choice_required')

    def test_authorized_name_removal_does_not_turn_punctuation_into_an_owner(self):
        context=ProfileContext('one','Trading Company',False,self.profiles)
        for suffix in ('.','...','؟','!','?','،'):
            with self.subTest(suffix=suffix):
                result=DSHService.profile_scope_guard('اعرض طلباتي الخاصة بملف Agency'+suffix,'ar',context)
                self.assertEqual(result['code'],'profile_switch_required')
                self.assertEqual(result['profileAction']['targetProfile']['profileId'],'gov')
                denied=DSHService.profile_scope_guard('أرني تراخيص myzzz.notexist.9x والغرامات والمهام المعلقة'+suffix,'ar',context)
                self.assertEqual(denied['code'],'external_account_lookup')
                self.assertNotIn('profileAction',denied)

    def test_proper_names_do_not_change_the_questions_response_language(self):
        context=ProfileContext('gov','Agency',False,self.profiles)
        self.assertEqual(DSHService.profile_question_language('أرني طلباتي في ملف Trading Company.',context),'ar')
        context=ProfileContext('one','Trading Company',False,(ProfileReference('gov','جهة حكومية ذات اسم عربي طويل للغاية'),))
        self.assertEqual(DSHService.profile_question_language('Show my applications in جهة حكومية ذات اسم عربي طويل للغاية.',context),'en')


if __name__=='__main__':unittest.main()
