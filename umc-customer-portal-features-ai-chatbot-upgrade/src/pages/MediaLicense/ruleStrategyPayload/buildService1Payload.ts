import { nowGst, toApi } from "@/utils/gstTime";
import type { Service1RuleStrategyValidatePayload } from "@/services/services";
import type { NationalityInfo } from "@/services/userProfile";
import { getNationalityList } from "@/services/userProfile";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveApplicantUserTypeCode,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

type ResponsiblePersonItem = Record<string, unknown>;

const isFilledValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const getFirstDefined = (values: unknown[]) => values.find(isFilledValue);

const coerceString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const resolveNationalityId = (
  rawValue: unknown,
  nationalityList: NationalityInfo[],
): number | undefined => {
  if (rawValue === undefined || rawValue === null) return undefined;

  const asNumber = coerceNumber(rawValue);
  if (asNumber !== undefined) {
    const matchedById = nationalityList.find((item) => item.id === asNumber);
    if (matchedById) return matchedById.id;

    const matchedByNumericCode = nationalityList.find(
      (item) => item.numericCode === asNumber,
    );
    if (matchedByNumericCode) return matchedByNumericCode.id;

    return asNumber;
  }

  const normalized = coerceString(rawValue)?.toUpperCase();
  if (!normalized) return undefined;

  const matchedByIso2 = nationalityList.find(
    (item) => item.isocode2?.toUpperCase() === normalized,
  );
  if (matchedByIso2) return matchedByIso2.id;

  const matchedByIso3 = nationalityList.find(
    (item) => item.isocode3?.toUpperCase() === normalized,
  );
  if (matchedByIso3) return matchedByIso3.id;

  const matchedByName = nationalityList.find((item) =>
    [item.nameEn, item.nameAr, item.fullNameEn, item.fullNameAr]
      .filter(Boolean)
      .some((name) => String(name).trim().toUpperCase() === normalized),
  );
  return matchedByName?.id;
};

const resolveUploadUrl = (value: unknown): string | undefined => {
  if (typeof value === "string") return coerceString(value);
  if (Array.isArray(value)) return resolveUploadUrl(value[0]);
  if (value && typeof value === "object") {
    return coerceString(
      getFirstDefined([
        get(value, "url"),
        get(value, "fileUrl"),
        get(value, "path"),
        get(value, "response.data"),
        get(value, "response.url"),
        get(value, "name"),
      ]),
    );
  }
  return undefined;
};

const normalizeIdentityType = (
  explicitIdentityType: string | undefined,
  emiratesId: string | undefined,
  passportNumber: string | undefined,
) => {
  if (explicitIdentityType === "passport") return "passport";
  if (explicitIdentityType === "uid") return "uid";
  if (explicitIdentityType === "emiratesid") return "emiratesId";
  if (passportNumber) return "passport";
  if (emiratesId) return "emiratesId";
  return undefined;
};

const resolveTermsAccepted = (formValuesList: Array<Record<string, unknown>>) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTable.termsAccepted"),
          get(formValues, "SelectTable.termsAgreed"),
          get(formValues, "SelectTable.terms.isAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "termsAgreed"),
          get(formValues, "terms.isAgreed"),
        ]),
      ),
    ) ?? true
  );
};

const resolveResponsiblePersons = (
  formValuesList: Array<Record<string, unknown>>,
  nationalityList: NationalityInfo[],
) => {
  const rawResponsiblePersons = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "SelectTable.PersonsinCharge"),
      get(formValues, "SelectTable.PersonsInCharge"),
      get(formValues, "SelectTable.personsInCharge"),
      get(formValues, "PersonsinCharge"),
      get(formValues, "PersonsInCharge"),
      get(formValues, "personsInCharge"),
    ]),
  );

  const acquaintanceForm = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "acquaintanceForm"),
      get(formValues, "SelectTable.acquaintanceForm"),
    ]),
  ) as Record<string, unknown> | undefined;

  if (!Array.isArray(rawResponsiblePersons)) return [];

  return rawResponsiblePersons.map((item) => {
    const responsiblePerson = item as ResponsiblePersonItem;
    const explicitIdentityType = coerceString(responsiblePerson.type)?.toLowerCase();
    const emiratesId = coerceString(responsiblePerson.emiratesId);
    const passportNumber = coerceString(responsiblePerson.passportNumber);

    return {
      personId: coerceNumber(
        getFirstDefined([responsiblePerson.personId, responsiblePerson.id]),
      ),
      name:
        coerceString(
          getFirstDefined([
            responsiblePerson.fullNameEnglish,
            responsiblePerson.fullNameArabic,
            responsiblePerson.name,
          ]),
        ) ?? "",
      countryId: resolveNationalityId(
        getFirstDefined([responsiblePerson.nationality, responsiblePerson.countryId]),
        nationalityList,
      ),
      photoUrl: resolveUploadUrl(
        getFirstDefined([responsiblePerson.PersonalPhoto, responsiblePerson.photoUrl]),
      ),
      emiratesId,
      passportNumber,
      identityType: normalizeIdentityType(
        explicitIdentityType,
        emiratesId,
        passportNumber,
      ),
      acquaintancePersonId: coerceNumber(
        getFirstDefined([
          responsiblePerson.acquaintancePersonId,
          responsiblePerson.acquaintanceFormPersonId,
          get(acquaintanceForm, "acquaintancePersonId"),
          get(acquaintanceForm, "personId"),
          get(acquaintanceForm, "id"),
        ]),
      ),
    };
  });
};

export const buildService1Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service1RuleStrategyValidatePayload> => {
  const nationalityResponse = await getNationalityList();
  const nationalityList = nationalityResponse.data ?? [];

  const foreignOfficeNameAr =
    coerceString(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTable.NameAr"),
          get(formValues, "SelectTable.nameAr"),
          get(formValues, "SelectTable.OfficeNameAr"),
          get(formValues, "SelectTable.officeNameAr"),
          get(formValues, "SelectTable.ForeignOfficeNameAr"),
          get(formValues, "SelectTable.foreignOfficeNameAr"),
          get(formValues, "SelectTable.foreignOffice.nameAr"),
          get(formValues, "foreignOffice.nameAr"),
          get(formValues, "establishmentNameArabic"),
          get(formValues, "EstablishmentNameArabic"),
          get(formValues, "NameAr"),
          get(formValues, "nameAr"),
        ]),
      ),
    ) ?? "";

  const foreignOfficeNameEn =
    coerceString(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTable.NameEn"),
          get(formValues, "SelectTable.nameEn"),
          get(formValues, "SelectTable.OfficeNameEn"),
          get(formValues, "SelectTable.officeNameEn"),
          get(formValues, "SelectTable.ForeignOfficeNameEn"),
          get(formValues, "SelectTable.foreignOfficeNameEn"),
          get(formValues, "SelectTable.foreignOffice.nameEn"),
          get(formValues, "foreignOffice.nameEn"),
          get(formValues, "EstablishmentNameEnglish"),
          get(formValues, "establishmentNameEnglish"),
          get(formValues, "NameEn"),
          get(formValues, "nameEn"),
        ]),
      ),
    ) ?? "";

  const licenseNumber =
    coerceString(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTable.LicenseNumber"),
          get(formValues, "SelectTable.licenseNumber"),
          get(formValues, "SelectTable.OfficeLicenseNumber"),
          get(formValues, "SelectTable.officeLicenseNumber"),
          get(formValues, "SelectTable.ForeignOfficeLicenseNumber"),
          get(formValues, "SelectTable.foreignOfficeLicenseNumber"),
          get(formValues, "SelectTable.foreignOffice.licenseNumber"),
          get(formValues, "foreignOffice.licenseNumber"),
          get(formValues, "OfficeLicenseNumber"),
          get(formValues, "officeLicenseNumber"),
          get(formValues, "LicenseNumber"),
          get(formValues, "licenseNumber"),
          get(formValues, "CommercialLicenseNumber"),
        ]),
      ),
    ) ?? "";

  const countryId = resolveNationalityId(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "SelectTable.CountryOrigin"),
        get(formValues, "SelectTable.countryId"),
        get(formValues, "SelectTable.foreignOffice.foreignAddress.countryId"),
        get(formValues, "foreignOffice.foreignAddress.countryId"),
        get(formValues, "CountryOrigin"),
        get(formValues, "OriginCountry"),
        get(formValues, "countryId"),
      ]),
    ),
    nationalityList,
  );

  const phoneNumber = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "SelectTable.PhoneNumber"),
        get(formValues, "SelectTable.phoneNumber"),
        get(formValues, "SelectTable.foreignOffice.foreignAddress.phoneNumber"),
        get(formValues, "foreignOffice.foreignAddress.phoneNumber"),
        get(formValues, "PhoneNumber"),
        get(formValues, "phoneNumber"),
      ]),
    ),
  );

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicant: {
        userId: currentProfileId|| "",
        userTypeCode: resolveApplicantUserTypeCode(userInfo, currentProfileId),
        establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      },
      form: {
        foreignOffice: {
          nameAr: foreignOfficeNameAr,
          nameEn: foreignOfficeNameEn,
          licenseNumber,
          foreignAddress: {
            countryId,
            phoneNumber,
          },
        },
        termsAccepted: resolveTermsAccepted(formValuesList),
        responsiblePersons: resolveResponsiblePersons(
          formValuesList,
          nationalityList,
        ),
      },
      submissionMode,
      requestTime: toApi(nowGst()),
    },
  };
};
