"""Language-keyed note appended when a carry-over answer is returned verbatim."""

CARRY_OVER_NOTE = {
    'en': ('\n\nCarried over from the preceding verified answer; it was not regenerated for this '
           'follow-up and no business record was refreshed. Any detail that answer did not state '
           'remains unverified.'),
    'ar': ('\n\nهذا نص الإجابة الموثّقة السابقة كما هو، ولم يُعَد توليده لهذا السؤال التالي ولم '
           'تُحدَّث أي سجلات أعمال. وأي تفصيل لم تذكره تلك الإجابة يبقى غير مؤكد.'),
    'ur': ('\n\nیہ پہلے کی تصدیق شدہ جواب کا متن ہے، اس فالو اپ کے لیے دوبارہ تیار نہیں کیا گیا '
           'اور کوئی کاروباری ریکارڈ تازہ نہیں کیا گیا۔ جو تفصیل اس جواب میں نہیں دی گئی وہ غیر '
           'تصدیق شدہ ہے۔'),
    'ml': ('\n\nഇത് മുൻപത്തെ സ്ഥിരീകരിച്ച ഉത്തരത്തിന്റെ അതേ ഉള്ളടക്കമാണ്; ഈ തുടർചോദ്യത്തിനായി '
           'ഇത് വീണ്ടും തയ്യാറാക്കിയിട്ടില്ല, ബിസിനസ് രേഖകളൊന്നും പുതുക്കിയിട്ടില്ല. ആ ഉത്തരത്തിൽ '
           'പറയാത്ത ഏതൊരു വിശദാംശവും സ്ഥിരീകരിക്കപ്പെടാത്തതാണ്.'),
    'tl': ('\n\nIto ang dating na-verify na sagot; hindi ito muling ginawa para sa follow-up na '
           'ito at walang business record na na-refresh. Anumang detalye na hindi nabanggit ng '
           'sagot na iyon ay nananatiling hindi beripikado.'),
}


def carry_over_note(language: str) -> str:
    return CARRY_OVER_NOTE.get(str(language or 'en').lower(), CARRY_OVER_NOTE['en'])


_UNVERIFIED = {
    'en': 'Not verified in that answer: {items}. Anything it did not state remains unverified; '
          'I did not re-read any records for this follow-up.',
    'ar': 'ما لم يُتحقق منه في ذلك الرد: {items}. وأي تفصيل لم يذكره يبقى غير مُتحقق؛ ولم أعد قراءة أي سجلات لهذا السؤال المتابع.',
    'ur': 'اس جواب میں جن چیزوں کی تصدیق نہیں ہوئی: {items}۔ جو تفصیل اس میں بیان نہیں ہوئی وہ غیر مصدقہ ہے؛ اس پیرو سوال کے لیے میں نے کوئی ریکارڈ دوبارہ نہیں پڑھا۔',
    'ml': 'ആ ഉത്തരത്തിൽ സ്ഥിരീകരിക്കാത്ത കാര്യങ്ങൾ: {items}. അതിൽ പറയാത്ത ഏത് വിശദാംശവും സ്ഥിരീകരിക്കപ്പെടാത്തതാണ്; ഈ തുടർച്ചോദ്യത്തിനായി ഞാൻ രേഖകൾ വീണ്ടും വായിച്ചിട്ടില്ല.',
    'tl': 'Hindi na-verify sa sagot na iyon: {items}. Anumang detalye na hindi nito binanggit ay nananatiling hindi beripikado; wala akong muling binasang rekord para sa follow-up na ito.',
}


def unverified_note(language: str, items) -> str:
    """Localized freshness boundary; private validation codes are never prose.

    Specific missing facts belong in the grounded presentation itself. ``items``
    remains accepted for compatibility but may contain internal reason codes.
    """
    default_item = {
        'ar': 'التفاصيل التي لم يذكرها الرد السابق',
        'ur': 'وہ تفصیلات جو پچھلے جواب میں بیان نہیں ہوئیں',
        'ml': 'മുൻ ഉത്തരത്തിൽ പറയാത്ത വിശദാംശങ്ങൾ',
        'tl': 'ang mga detalyeng hindi binanggit ng naunang sagot',
        'en': 'the details the previous answer did not state',
    }.get(language, 'the details the previous answer did not state')
    template = _UNVERIFIED.get(language, _UNVERIFIED['en'])
    # ``items`` is an internal validation channel, not verified localized prose.
    # A spelling/underscore filter cannot make those diagnostics safe to publish.
    # Specific missing source facts are already owned by the grounded answer.
    return template.format(items=default_item) + ' '


_REFUSAL_PRESENTATION = {
    'en': 'Confirmed: nothing was read or verified for the earlier request. Unverified: the details that request asked for. ',
    'ar': 'المؤكد: لم يُقرأ أو يُتحقق من أي شيء في الطلب السابق. غير المؤكد: التفاصيل التي طلبها ذلك الطلب. ',
    'ur': 'تصدیق شدید: پچھلی درخواست میں کچھ نہیں پڑھا اور نہ تصدیق کیا گیا۔ غیر مصدقہ: وہ تفصیلات جو اس درخواست میں مانگی گئی تھیں۔ ',
    'ml': 'സ്ഥിരീകരിച്ചത്: മുൻ അഭ്യർത്ഥനയിൽ ഒന്നും വായിച്ചിട്ടില്ല. സ്ഥിരീകരിക്കാത്തത്: ആ അഭ്യർത്ഥന ആവശ്യപ്പെട്ട വിശദാംശങ്ങൾ. ',
    'tl': 'Nakumpirma: walang binasa o na-verify para sa naunang kahilingan. Hindi pa tiyak: ang mga detalyeng hiniling ng kahilingang iyon. ',
}


def refusal_presentation_note(language: str) -> str:
    return _REFUSAL_PRESENTATION.get(language, _REFUSAL_PRESENTATION['en'])

