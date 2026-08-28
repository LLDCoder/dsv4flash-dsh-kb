const mockData = {
    "isSuccess": true,
    "statusCode": 200,
    "message": "Request successful",
    "data": {
        "transactionRefNo": "UMC-ICP-016297",
        "responseCode": "0000",
        "responseDescription": "Success",
        "responseDescriptionArabic": "تم بنجاح",
        "personProfile": {
            "unifiedNumber": "123456789",
            "identityCard": {
                "emiratesId": "784111111111111",
                "idnBackNumber": "999999999",
                "issueDate": "2024-01-01T00:00:00",
                "expiryDate": "2034-01-01T00:00:00",
                "cardSerialNo": "MOCK-CARD-001"
            },
            "nationality": {
                "id": 784,
                "descriptionArabic": "الإمارات العربية المتحدة",
                "descriptionEnglish": "United Arab Emirates"
            },
            "title": {
                "id": 1,
                "descriptionArabic": "السيد",
                "descriptionEnglish": "Mr"
            },
            "personName": {
                "firstNameArabic": "أحمد",
                "firstNameEnglish": "Ahmed",
                "secondNameArabic": "محمد",
                "secondNameEnglish": "Mohammed",
                "thirdNameArabic": "سالم",
                "thirdNameEnglish": "Salem",
                "fourthNameArabic": "الهاشمي",
                "fourthNameEnglish": "Al Hashemi",
                "fullNameArabic": "أحمد محمد سالم الهاشمي",
                "fullNameEnglish": "Ahmed Mohammed Salem Al Hashemi",
                "familyNameArabic": "الهاشمي",
                "familyNameEnglish": "Al Hashemi",
                "clanNameArabic": "بني هاشم",
                "clanNameEnglish": "false",
                "tribe": {
                    "id": 100,
                    "descriptionArabic": "بني ياس",
                    "descriptionEnglish": "Bani Yas"
                }
            },
            "khulasitQaidNo": "KH-10001",
            "familyBookNo": "FB-20002",
            "familyBookStartDate": "2000-01-01T00:00:00",
            "familyBookCreateDate": "2000-01-02T00:00:00",
            "citizenshipStartDate": "1990-05-20T00:00:00",
            "familyBookRelation": 1,
            "edbarahNo": "ED-30003",
            "gender": {
                "id": 1,
                "descriptionArabic": "ذكر",
                "descriptionEnglish": "Male"
            },
            "birthDate": "1990-05-20T00:00:00",
            "birthCountry": {
                "id": 784,
                "descriptionArabic": "الإمارات العربية المتحدة",
                "descriptionEnglish": "United Arab Emirates"
            },
            "birthEmirate": {
                "id": 1,
                "descriptionArabic": "أبوظبي",
                "descriptionEnglish": "Abu Dhabi"
            },
            "birthCity": {
                "id": 1,
                "descriptionArabic": "أبوظبي",
                "descriptionEnglish": "Abu Dhabi"
            },
            "birthPlaceArabic": "أبوظبي",
            "birthPlaceEnglish": "Abu Dhabi",
            "birthCertificateNo": "BC-40004",
            "maritalStatus": {
                "id": 2,
                "descriptionArabic": "متزوج",
                "descriptionEnglish": "Married"
            },
            "religion": {
                "id": 1,
                "descriptionArabic": "الإسلام",
                "descriptionEnglish": "Islam"
            },
            "primaryLangCode": 1,
            "passport": {
                "passportNo": "P1234567",
                "passportType": {
                    "id": 1,
                    "descriptionArabic": "عادي",
                    "descriptionEnglish": "Normal"
                },
                "issueDate": "2023-01-01T00:00:00",
                "expiryDate": "2033-01-01T00:00:00",
                "issueCountry": {
                    "id": 784,
                    "descriptionArabic": "الإمارات العربية المتحدة",
                    "descriptionEnglish": "United Arab Emirates"
                },
                "issuePlace": "Abu Dhabi"
            },
            "sponsor": {
                "nameArabic": "شركة تجريبية",
                "nameEnglish": "Mock Sponsor LLC",
                "department": {
                    "id": 10,
                    "descriptionArabic": "إدارة الموارد",
                    "descriptionEnglish": "Resource Department"
                },
                "sponsorIdn": "784111111111111",
                "sponsorNo": 500500,
                "addresses": [
                    {
                        "emirate": {
                            "id": 1,
                            "descriptionArabic": "أبوظبي",
                            "descriptionEnglish": "Abu Dhabi"
                        },
                        "city": {
                            "id": 1,
                            "descriptionArabic": "أبوظبي",
                            "descriptionEnglish": "Abu Dhabi"
                        },
                        "area": {
                            "id": 101,
                            "descriptionArabic": "الخالدية",
                            "descriptionEnglish": "Al Khalidiyah"
                        },
                        "street": {
                            "id": 1001,
                            "descriptionArabic": "شارع الكورنيش",
                            "descriptionEnglish": "Corniche Street"
                        },
                        "buildingNumber": "12",
                        "building": "Mock Sponsor Tower",
                        "poBoxNo": "12345",
                        "mobileNo": "0501111111",
                        "secondMobileNo": "0502222222",
                        "homePhone": "026111111",
                        "workPhone": "026222222",
                        "fax": "026333333",
                        "emailAddress": "sponsor@mock.ae",
                        "abroadAddress": {
                            "country": {
                                "id": 840,
                                "descriptionArabic": "الولايات المتحدة",
                                "descriptionEnglish": "United States"
                            },
                            "phoneNo": "+1-555-123456",
                            "details": "Mock abroad sponsor address"
                        }
                    }
                ],
                "sponsorType": {
                    "id": 1,
                    "descriptionArabic": "صاحب عمل",
                    "descriptionEnglish": "Employer"
                }
            },
            "faith": {
                "id": 1,
                "descriptionArabic": "مسلم",
                "descriptionEnglish": "Muslim"
            },
            "personType": {
                "id": 1,
                "descriptionArabic": "مواطن",
                "descriptionEnglish": "Citizen"
            },
            "personClassification": 1,
            "immigrationFile": {
                "status": {
                    "id": 1,
                    "descriptionArabic": "فعال",
                    "descriptionEnglish": "Active"
                },
                "fileNo": "FILE-2026-001",
                "department": {
                    "id": 7,
                    "descriptionArabic": "إدارة الإقامة",
                    "descriptionEnglish": "Residency Department"
                },
                "year": 2026,
                "fileType": {
                    "id": 1,
                    "descriptionArabic": "إقامة",
                    "descriptionEnglish": "Residency"
                },
                "fileSequence": "000123",
                "issueDate": "2024-06-01T00:00:00",
                "expiryDate": "2026-06-01T00:00:00"
            },
            "occupation": {
                "id": 501,
                "descriptionArabic": "مهندس برمجيات",
                "descriptionEnglish": "Software Engineer"
            },
            "companyTypeCode": 2,
            "companyCode": 778899,
            "companyAr": "شركة الاختبار التقنية",
            "companyEn": "Mock Technology LLC",
            "motherNameArabic": "فاطمة",
            "motherNameEnglish": "Fatima",
            "motherFirstNameArabic": "فاطمة",
            "motherFirstNameEnglish": "Fatima",
            "previousNationality": {
                "id": 682,
                "descriptionArabic": "المملكة العربية السعودية",
                "descriptionEnglish": "Saudi Arabia"
            },
            "addresses": [
                {
                    "emirate": {
                        "id": 1,
                        "descriptionArabic": "أبوظبي",
                        "descriptionEnglish": "Abu Dhabi"
                    },
                    "city": {
                        "id": 1,
                        "descriptionArabic": "أبوظبي",
                        "descriptionEnglish": "Abu Dhabi"
                    },
                    "area": {
                        "id": 101,
                        "descriptionArabic": "الخالدية",
                        "descriptionEnglish": "Al Khalidiyah"
                    },
                    "street": {
                        "id": 1001,
                        "descriptionArabic": "شارع الكورنيش",
                        "descriptionEnglish": "Corniche Street"
                    },
                    "buildingNumber": "21A",
                    "building": "Mock Tower",
                    "poBoxNo": "54321",
                    "mobileNo": "0500000000",
                    "secondMobileNo": "0509999999",
                    "homePhone": "026444444",
                    "workPhone": "026555555",
                    "fax": "026666666",
                    "emailAddress": "mock.person@uaemc.gov.ae",
                    "abroadAddress": {
                        "country": {
                            "id": 826,
                            "descriptionArabic": "المملكة المتحدة",
                            "descriptionEnglish": "United Kingdom"
                        },
                        "phoneNo": "+44-20-123456",
                        "details": "Mock foreign address details"
                    }
                }
            ],
            "qualification": {
                "country": {
                    "id": 784,
                    "descriptionArabic": "الإمارات العربية المتحدة",
                    "descriptionEnglish": "United Arab Emirates"
                },
                "academyName": "Khalifa University",
                "specialization": {
                    "id": 900,
                    "descriptionArabic": "علوم الحاسب",
                    "descriptionEnglish": "Computer Science"
                },
                "grade": "A",
                "qualificationDate": "2012-06-30T00:00:00",
                "note": "Mock qualification note"
            },
            "wivesCount": "1",
            "wives": [
                {
                    "name": {
                        "firstNameArabic": "نورة",
                        "firstNameEnglish": "Noura",
                        "secondNameArabic": "محمد",
                        "secondNameEnglish": "Mohammed",
                        "thirdNameArabic": "سالم",
                        "thirdNameEnglish": "Salem",
                        "fourthNameArabic": "الهاشمي",
                        "fourthNameEnglish": "Al Hashemi",
                        "fullNameArabic": "نورة محمد سالم الهاشمي",
                        "fullNameEnglish": "Noura Mohammed Salem Al Hashemi",
                        "familyNameArabic": "الهاشمي",
                        "familyNameEnglish": "Al Hashemi",
                        "clanNameArabic": "بني هاشم",
                        "clanNameEnglish": "false",
                        "tribe": {
                            "id": 100,
                            "descriptionArabic": "بني ياس",
                            "descriptionEnglish": "Bani Yas"
                        }
                    },
                    "nationality": {
                        "id": 784,
                        "descriptionArabic": "الإمارات العربية المتحدة",
                        "descriptionEnglish": "United Arab Emirates"
                    },
                    "birthDate": "1992-02-10T00:00:00",
                    "unifiedNumber": "987654321",
                    "identityCard": {
                        "emiratesId": "784555555555555",
                        "idnBackNumber": "888888888",
                        "issueDate": "2023-01-01T00:00:00",
                        "expiryDate": "2033-01-01T00:00:00",
                        "cardSerialNo": null
                    }
                }
            ],
            "relatives": [
                {
                    "relation": {
                        "id": 1,
                        "descriptionArabic": "أب",
                        "descriptionEnglish": "Father"
                    },
                    "name": {
                        "firstNameArabic": "محمد",
                        "firstNameEnglish": "Mohammed",
                        "secondNameArabic": "سالم",
                        "secondNameEnglish": "Salem",
                        "thirdNameArabic": "حمد",
                        "thirdNameEnglish": "Hamad",
                        "fourthNameArabic": "الهاشمي",
                        "fourthNameEnglish": "Al Hashemi",
                        "fullNameArabic": "محمد سالم حمد الهاشمي",
                        "fullNameEnglish": "Mohammed Salem Hamad Al Hashemi",
                        "familyNameArabic": "الهاشمي",
                        "familyNameEnglish": "Al Hashemi",
                        "clanNameArabic": "بني هاشم",
                        "clanNameEnglish": "false",
                        "tribe": {
                            "id": 100,
                            "descriptionArabic": "بني ياس",
                            "descriptionEnglish": "Bani Yas"
                        }
                    },
                    "nationality": {
                        "id": 784,
                        "descriptionArabic": "الإمارات العربية المتحدة",
                        "descriptionEnglish": "United Arab Emirates"
                    },
                    "birthDate": "1965-01-01T00:00:00",
                    "unifiedNumber": "111222333",
                    "identityCard": {
                        "emiratesId": "784666666666666",
                        "idnBackNumber": "777777777",
                        "issueDate": "2020-01-01T00:00:00",
                        "expiryDate": "2030-01-01T00:00:00",
                        "cardSerialNo": null
                    }
                }
            ],
            "isBlackListed": false,
            "isInsideCountry": true,
            "familyCount": 5,
            "familyMaleCount": 3,
            "familyFemaleCount": 2,
            "motherChildCount": 2,
            "motherChildren": [
                {
                    "emiratesId": "784777777777777"
                }
            ],
            "disability": 0,
            "freeEducation": 1,
            "freeHealth": 1,
            "bloodType": "O+",
            "socialSupportStatus": 0,
            "hasSpecialNationality": 0,
            "lastExitDate": "2025-12-01T00:00:00",
            "lastEntryDate": "2025-12-10T00:00:00",
            "icaDenied": "N",
            "fatherHasOnlySon": 0,
            "motherHasOnlySon": 0,
            "signature": "TW9ja1NpZ25hdHVyZUJhc2U2NA==",
            "portrait": "TW9ja1BvcnRyYWl0QmFzZTY0",
            "prPortrait": "TW9ja1BST1BvcnRyYWl0QmFzZTY0"
        }
    }
}