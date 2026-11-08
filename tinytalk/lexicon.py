"""Shared vocabulary: places, units, time words and number words in Malayalam, Hindi and English."""

LANGS = ("ml", "hi", "en")

# place id -> names; the first name of each language is the one the templates print.
PLACES: dict[str, dict[str, list[str]]] = {
    "aluva": {"en": ["Aluva"], "hi": ["आलुवा"], "ml": ["ആലുവ"]},
    "chalakudy": {
        "en": ["Chalakudy", "Chalakkudy", "Chalakudi"],
        "hi": ["चालाकुडी"],
        "ml": ["ചാലക്കുടി"],
    },
    "kuttanad": {"en": ["Kuttanad"], "hi": ["कुट्टनाड"], "ml": ["കുട്ടനാട്"]},
    "pathanamthitta": {
        "en": ["Pathanamthitta"],
        "hi": ["पत्तनमतिट्टा"],
        "ml": ["പത്തനംതിട്ട"],
    },
    "thrissur": {"en": ["Thrissur", "Trichur"], "hi": ["त्रिशूर"], "ml": ["തൃശ്ശൂർ", "തൃശൂർ"]},
    "kochi": {"en": ["Kochi", "Cochin"], "hi": ["कोच्चि", "कोची"], "ml": ["കൊച്ചി"]},
    "alappuzha": {"en": ["Alappuzha", "Alleppey"], "hi": ["अलप्पुझा"], "ml": ["ആലപ്പുഴ"]},
    "kottayam": {"en": ["Kottayam"], "hi": ["कोट्टयम"], "ml": ["കോട്ടയം"]},
    "ernakulam": {"en": ["Ernakulam"], "hi": ["एर्नाकुलम"], "ml": ["എറണാകുളം"]},
    "idukki": {"en": ["Idukki"], "hi": ["इडुक्की"], "ml": ["ഇടുക്കി"]},
    "wayanad": {"en": ["Wayanad"], "hi": ["वायनाड"], "ml": ["വയനാട്"]},
    "kozhikode": {"en": ["Kozhikode", "Calicut"], "hi": ["कोझिकोड"], "ml": ["കോഴിക്കോട്"]},
}

# unit id -> word beginnings (a token that starts with one of these is that unit).
# Malayalam words ending in a chillu (ർ) change when a suffix joins (മീറ്റർ + ആകും -> മീറ്ററാകും),
# so those stems stop before the last letter.
UNIT_STEMS: dict[str, list[str]] = {
    "people": ["people", "person", "लोग", "व्यक्ति", "ആളുക", "പേർ"],
    "boats": ["boat", "नाव", "नौका", "ബോട്ട"],
    "km": ["kilomet", "kilometer", "km", "किलोमीटर", "കിലോമീറ്റ"],
    "metres": ["metre", "meter", "मीटर", "മീറ്റ"],
    "litres": ["litre", "liter", "लीटर", "ലിറ്റ"],
    "food_packets": ["food", "packet", "पैकेट", "खाने", "ഭക്ഷണ", "പൊതി"],
}

CLOCK_WORDS = ("am", "pm", "बजे", "മണി")  # a number right before one of these is an hour
PERIOD_STEMS = {
    "am": ["am", "सुबह", "सवेरे", "രാവിലെ"],
    "pm": ["pm", "शाम", "ഉച്ച", "വൈകുന്നേര", "വൈകീട്ട്"],
}

HUNDRED = ["hundred", "सौ", "നൂറ്", "നൂറു"]

NUMBER_WORDS: dict[str, int] = {
    # English
    **dict(
        zip(
            "zero one two three four five six seven eight nine ten eleven twelve thirteen "
            "fourteen fifteen sixteen seventeen eighteen nineteen".split(),
            range(20),
            strict=True,
        )
    ),
    **dict(
        zip(
            "twenty thirty forty fifty sixty seventy eighty ninety".split(),
            range(20, 100, 10),
            strict=True,
        )
    ),
    # Hindi 1-99 (common spellings; other spellings are not covered)
    **dict(
        zip(
            "एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस "
            "इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस "
            "पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चौवालीस पैंतालीस छियालीस "
            "सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ "
            "इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर "
            "पचहत्तर छिहत्तर सतहत्तर अठहत्तर उनासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी "
            "अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे".split(),
            range(1, 100),
            strict=True,
        )
    ),
    # Malayalam 1-20 and tens (compound numbers such as 21 are not covered)
    "ഒന്ന്": 1,
    "ഒരു": 1,
    "രണ്ട്": 2,
    "മൂന്ന്": 3,
    "നാല്": 4,
    "നാൽ": 4,
    "അഞ്ച്": 5,
    "ആറ്": 6,
    "ഏഴ്": 7,
    "എട്ട്": 8,
    "ഒമ്പത്": 9,
    "ഒൻപത്": 9,
    "പത്ത്": 10,
    "പതിനൊന്ന്": 11,
    "പന്ത്രണ്ട്": 12,
    "പതിമൂന്ന്": 13,
    "പതിനാല്": 14,
    "പതിനഞ്ച്": 15,
    "പതിനാറ്": 16,
    "പതിനേഴ്": 17,
    "പതിനെട്ട്": 18,
    "പത്തൊമ്പത്": 19,
    "ഇരുപത്": 20,
    "മുപ്പത്": 30,
    "നാല്പത്": 40,
    "നാൽപത്": 40,
    "അമ്പത്": 50,
    "അറുപത്": 60,
    "എഴുപത്": 70,
    "എൺപത്": 80,
    "തൊണ്ണൂറ്": 90,
}
