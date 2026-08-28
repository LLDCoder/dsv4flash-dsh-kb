import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1201RuleStrategyValidatePayload } from "@/services/services";
import { getSubjectList } from "@/services/services";
import { getTypeDictionaryList } from "@/services/userProfile";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
  resolveSelectTableSingleValue,
} from "../ruleStrategyPayloadShared";
import {
  coerceBoolean,
  coerceNumber,
  coerceString,
  findLookupId,
  getFirstDefined,
  resolveTermsAccepted,
  resolveUploadUrl,
  unwrapResponseRows,
} from "../ruleStrategyPayloadUtils";

type Service1201ActivityRule = {
  isElectronic: boolean;
  isMagazine: boolean;
  releaseTypeId: number;
  periodicalTypeId?: number;
};

type LanguageItem = {
  languageId: number;
  name: string;
};

const SERVICE_1201_ACTIVITY_RULES: Record<number, Service1201ActivityRule> = {
  1008: { isElectronic: false, isMagazine: false, releaseTypeId: 1, periodicalTypeId: 1 },
  1010: { isElectronic: false, isMagazine: false, releaseTypeId: 1, periodicalTypeId: 2 },
  1029: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 2 },
  1031: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 3 },
  1011: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 4 },
  1012: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 5 },
  1014: { isElectronic: false, isMagazine: true, releaseTypeId: 1, periodicalTypeId: 6 },
  1015: { isElectronic: false, isMagazine: false, releaseTypeId: 2, periodicalTypeId: 1 },
  1016: { isElectronic: false, isMagazine: false, releaseTypeId: 2, periodicalTypeId: 2 },
  1030: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 2 },
  1032: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 3 },
  1017: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 4 },
  1018: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 5 },
  1019: { isElectronic: false, isMagazine: true, releaseTypeId: 2, periodicalTypeId: 6 },
  1020: { isElectronic: true, isMagazine: false, releaseTypeId: 0, periodicalTypeId: undefined },
  2093: { isElectronic: true, isMagazine: false, releaseTypeId: 0, periodicalTypeId: 1 },
  2094: { isElectronic: true, isMagazine: false, releaseTypeId: 0, periodicalTypeId: 2 },
  2095: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 2 },
  2096: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 3 },
  2097: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 4 },
  2098: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 5 },
  2099: { isElectronic: true, isMagazine: true, releaseTypeId: 0, periodicalTypeId: 6 },
};

const resolveActivityId = (
  selectTableSingle?: {
    selectedKey?: string | number | Array<string | number>;
    tableData?: Array<{ Id?: unknown }>;
  },
) => {
  const selectedKey = get(selectTableSingle, "selectedKey");
  const firstSelectedKey = Array.isArray(selectedKey) ? selectedKey[0] : selectedKey;

  return coerceNumber(
    getFirstDefined([firstSelectedKey, get(selectTableSingle, "tableData.0.Id")]),
  );
};

const resolveFirstObject = (
  formValuesList: Array<Record<string, unknown>>,
  paths: string[],
) => {
  return formValuesList
    .map((formValues) => getFirstDefined(paths.map((path) => get(formValues, path))))
    .find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;
};

const resolvePublicationName = (
  formValuesList: Array<Record<string, unknown>>,
  selectTableSingleRecord: Record<string, unknown> | undefined,
) => {
  return coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "NewspaperMagazineName"),
        get(formValues, "newspaperMagazineName"),
        get(formValues, "publicationName"),
        get(formValues, "publicationTitle"),
        get(formValues, "title"),
        get(formValues, "SelectTableSingle.NewspaperMagazineName"),
        get(formValues, "SelectTableSingle.publicationName"),
        get(formValues, "SelectTableSingle.publicationTitle"),
      
        get(selectTableSingleRecord, "NewspaperMagazineName"),
        get(selectTableSingleRecord, "publicationName"),
        get(selectTableSingleRecord, "publicationTitle"),
       
      ]),
    ),
  );
};

const resolveSubjectCategoryValues = (
  formValuesList: Array<Record<string, unknown>>,
  selectTableSingleRecord: Record<string, unknown> | undefined,
) => {
  const rawValue = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "subjectCategoryIds"),
      get(formValues, "SubjectCategoryIds"),
      get(formValues, "subjectCategories"),
      get(formValues, "SubjectCategories"),
      get(formValues, "subjectCategory"),
      get(formValues, "SubjectCategory"),
      get(formValues, "4c9mtw3c1cp"),
      get(formValues, "SelectTableSingle.subjectCategoryIds"),
      get(formValues, "SelectTableSingle.subjectCategories"),
      get(formValues, "SelectTableSingle.SubjectCategory"),
      get(formValues, "SelectTableSingle.4c9mtw3c1cp"),
      get(selectTableSingleRecord, "subjectCategoryIds"),
      get(selectTableSingleRecord, "subjectCategories"),
      get(selectTableSingleRecord, "SubjectCategory"),
      get(selectTableSingleRecord, "4c9mtw3c1cp"),
    ]),
  );

  if (!Array.isArray(rawValue)) return [];

  return rawValue.filter((item) => item !== undefined && item !== null);
};

const resolveLanguageItems = (
  formValuesList: Array<Record<string, unknown>>,
  selectTableSingleRecord: Record<string, unknown> | undefined,
  publicationName: string | undefined,
): LanguageItem[] => {
  const rawDataList = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "dataList"),
      get(formValues, "DataList"),
      get(formValues, "languageItems"),
      get(formValues, "LanguageItems"),
      get(formValues, "SelectTableSingle.dataList"),
      get(formValues, "SelectTableSingle.DataList"),
      get(selectTableSingleRecord, "dataList"),
      get(selectTableSingleRecord, "DataList"),
    ]),
  );

  if (Array.isArray(rawDataList)) {
    const items = rawDataList
      .map((item) => {
        const languageId = coerceNumber(
          getFirstDefined([
            get(item, "languageId"),
            get(item, "LanguageId"),
            get(item, "Language"),
            get(item, "language"),
            get(item, "value"),
            get(item, "id"),
          ]),
        );
        const name = coerceString(
          getFirstDefined([
            get(item, "suggested_name"),
            get(item, "suggestedName"),
            get(item, "publicationName"),
            get(item, "publicationTitle"),
            get(item, "name"),
          ]),
        );

        if (languageId === undefined || !name) return undefined;

        return {
          languageId,
          name,
        };
      })
      .filter((item): item is LanguageItem => item !== undefined);

    if (items.length > 0) return items;
  }

  const rawLanguages = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "Languages"),
      get(formValues, "languageIds"),
      get(formValues, "Language"),
      get(formValues, "languageId"),
      get(formValues, "SelectTableSingle.Languages"),
      get(formValues, "SelectTableSingle.Language"),
      get(selectTableSingleRecord, "Languages"),
      get(selectTableSingleRecord, "Language"),
    ]),
  );

  const languageValues = Array.isArray(rawLanguages) ? rawLanguages : [rawLanguages];

  return languageValues
    .map((languageValue) => {
      const languageId = coerceNumber(languageValue);
      if (languageId === undefined || !publicationName) return undefined;

      return {
        languageId,
        name: publicationName,
      };
    })
    .filter((item): item is LanguageItem => item !== undefined);
};

const resolveIdSelector = (formValuesList: Array<Record<string, unknown>>) => {
  return resolveFirstObject(formValuesList, [
    "idSelector",
    "SelectTableSingle.idSelector",
    "SelectTable.idSelector",
  ]);
};

const resolveChiefEditor = (
  formValuesList: Array<Record<string, unknown>>,
  educationRows: unknown[],
  releaseTypeId: number,
) => {
  const idSelector = resolveIdSelector(formValuesList);
  const qualificationId = coerceNumber(
    findLookupId(
      educationRows,
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "EducationalQualification"),
          get(formValues, "educationalQualification"),
          get(formValues, "qualificationId"),
          get(formValues, "SelectTableSingle.EducationalQualification"),
        ]),
      ),
    ),
  );
  const chiefEditor = {
    fullName:
      coerceString(
        getFirstDefined([
          get(idSelector, "fullNameEnglish"),
          get(idSelector, "fullNameArabic"),
          get(idSelector, "name"),
        ]),
      ) ?? "",
    phoneNumber:
      coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "PhoneNumber"),
            get(formValues, "phoneNumber"),
            get(formValues, "hisn2tjbrar"),
            get(formValues, "SelectTableSingle.PhoneNumber"),
          ]),
        ),
      ) ?? "",
    email:
      coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "Email"),
            get(formValues, "email"),
            get(formValues, "2h8r9yj9wac"),
            get(formValues, "SelectTableSingle.Email"),
          ]),
        ),
      ) ?? "",
    qualificationId,
    qualificationCopyUrl: resolveUploadUrl(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "QualificationCopy"),
          get(formValues, "Qualification Copy"),
          get(formValues, "qualificationCopyUrl"),
          get(formValues, "kuken7l5dg4"),
          get(formValues, "SelectTableSingle.QualificationCopy"),
        ]),
      ),
    ),
    yearsOfExperience: coerceNumber(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "YearsOfExperience"),
          get(formValues, "YearsofExperience"),
          get(formValues, "yearsOfExperience"),
          get(formValues, "3vswhqc0n78"),
          get(formValues, "SelectTableSingle.YearsOfExperience"),
        ]),
      ),
    ),
    photoUrl: resolveUploadUrl(
      getFirstDefined([
        get(idSelector, "PersonalPhoto"),
        get(idSelector, "photoUrl"),
      ]),
    ),
  };

  const hasChiefEditorData = Boolean(
    chiefEditor.fullName ||
      chiefEditor.phoneNumber ||
      chiefEditor.email ||
      chiefEditor.qualificationId !== undefined ||
      chiefEditor.qualificationCopyUrl ||
      chiefEditor.yearsOfExperience !== undefined ||
      chiefEditor.photoUrl,
  );

  if (!hasChiefEditorData && releaseTypeId !== 1) return undefined;

  return chiefEditor;
};

export const buildService1201Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1201RuleStrategyValidatePayload> => {
  const selectTableSingle = resolveSelectTableSingleValue(formValuesList);
  const selectTableSingleRecord = resolveFirstObject(formValuesList, ["SelectTableSingle"]);

  if (!selectTableSingle) {
    throw new Error("SelectTableSingle data is missing for service 1201.");
  }

  const activityId = resolveActivityId(selectTableSingle);
  const activityRule = activityId ? SERVICE_1201_ACTIVITY_RULES[activityId] : undefined;
  if (!activityRule) {
    throw new Error("Unable to derive service 1201 publication type from selected activity.");
  }

  const [subjectListResponse, educationListResponse] = await Promise.all([
    getSubjectList(),
    getTypeDictionaryList("Education"),
  ]);
  const subjectRows = unwrapResponseRows(subjectListResponse);
  const educationRows = unwrapResponseRows(educationListResponse);

  const publicationName = resolvePublicationName(formValuesList, selectTableSingleRecord);
  const subjectCategoryIds = resolveSubjectCategoryValues(
    formValuesList,
    selectTableSingleRecord,
  )
    .map((value) => coerceNumber(findLookupId(subjectRows, value)))
    .filter((value): value is number => value !== undefined);
  const languageItems = resolveLanguageItems(
    formValuesList,
    selectTableSingleRecord,
    publicationName,
  );

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      submissionMode,
      requestTime: toApi(nowGst()),
      isElectronic: activityRule.isElectronic,
      isMagazine: activityRule.isMagazine,
      releaseTypeId: activityRule.releaseTypeId,
      periodicalTypeId: activityRule.periodicalTypeId,
      subjectCategoryIds,
      languageItems,
      url:coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "url"),
            get(formValues, "publicationUrl"),
            get(formValues, "NewspaperMagazineUrl"),
            get(formValues, "SelectTableSingle.SocialMediaAccountUrl"),
            get(selectTableSingleRecord, "SocialMediaAccountUrl"),
          ]),
        ),
      ),
      registrationUrl: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "url"),
            get(formValues, "publicationUrl"),
            get(formValues, "NewspaperMagazineUrl"),
            get(formValues, "SelectTableSingle.SocialMediaAccountUrl"),
            get(selectTableSingleRecord, "SocialMediaAccountUrl"),
          ]),
        ),
      ),
      ownerApprovalUrl: coerceString(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "OwnerApproval")
          ]),
        ),
      ),
      chiefEditor: resolveChiefEditor(
        formValuesList,
        educationRows,
        activityRule.releaseTypeId,
      ),
      termsAccepted:
        coerceBoolean(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "termsAccepted"),
              get(formValues, "termsAgreed"),
              get(formValues, "SelectTableSingle.termsAccepted"),
              get(formValues, "SelectTableSingle.termsAgreed"),
            ]),
          ),
        ) ?? resolveTermsAccepted(formValuesList),
    },
  };
};
