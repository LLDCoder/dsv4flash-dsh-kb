import { nowGst, toApi } from "@/utils/gstTime";
import type { Service20RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveApplicantUserTypeCode,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

type TeamMemberItem = Record<string, unknown>;
type LocationItem = Record<string, unknown>;

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

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const normalizeDateTime = (value: unknown): string | undefined => {
  const normalized = coerceString(value);
  if (!normalized) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00`;
  }

  const ddMmYyyyMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return `${year}-${month}-${day}T00:00:00`;
  }

  return normalized;
};

const resolveStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => coerceString(item))
    .filter((item): item is string => Boolean(item));
};

const resolveTermsAgreed = (formValuesList: Array<Record<string, unknown>>) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTableSingle.termsAccepted"),
          get(formValues, "SelectTableSingle.termsAgreed"),
          get(formValues, "SelectTableSingle.terms.isAgreed"),
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

const resolveLocations = (formValuesList: Array<Record<string, unknown>>) => {
  const rawLocations = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "filmingLocations"),
      get(formValues, "locations"),
      get(formValues, "FilmingLocations"),
    ]),
  );

  if (!Array.isArray(rawLocations)) return [];

  return rawLocations
    .map((item) => {
      const location = item as LocationItem;
      return {
        emirate: coerceString(
          getFirstDefined([
            get(location, "emirate"),
            get(location, "emirateName"),
            get(location, "emirateLabel"),
            get(location, "emirateText"),
            get(location, "emirateCode"),
            get(location, "emirateId"),
          ]),
        ),
        community: coerceString(
          getFirstDefined([
            get(location, "community"),
            get(location, "communityName"),
            get(location, "region"),
            get(location, "regionName"),
            get(location, "area"),
            get(location, "areaName"),
            get(location, "district"),
            get(location, "districtName"),
            get(location, "areaId"),
            get(location, "regionId"),
          ]),
        ),
        street: coerceString(
          getFirstDefined([
            get(location, "street"),
            get(location, "streetName"),
            get(location, "address"),
            get(location, "addressLine"),
          ]),
        ),
      };
    })
    .filter(
      (location) =>
        location.emirate !== undefined ||
        location.community !== undefined ||
        location.street !== undefined,
    );
};

const resolveTeamMembers = (formValuesList: Array<Record<string, unknown>>) => {
  const rawTeamMembers = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "FilmingTeam"),
      get(formValues, "Filming Team"),
      get(formValues, "teamMembers"),
      get(formValues, "TeamMembers"),
    ]),
  );

  if (!Array.isArray(rawTeamMembers)) return [];

  return rawTeamMembers
    .map((item) => {
      const member = item as TeamMemberItem;
      return {
        fullName:
          coerceString(
            getFirstDefined([
              get(member, "fullName"),
              get(member, "fullNameEnglish"),
              get(member, "fullNameArabic"),
              get(member, "name"),
            ]),
          ) ?? "",
        emiratesId: coerceString(
          getFirstDefined([get(member, "emiratesId"), get(member, "eid")]),
        ),
        passportNumber: coerceString(
          getFirstDefined([get(member, "passportNumber"), get(member, "passportNo")]),
        ),
        unifiedNumber: coerceString(
          getFirstDefined([
            get(member, "unifiedNumber"),
            get(member, "unifiedNo"),
            get(member, "uid"),
          ]),
        ),
        nationalityCode: coerceString(
          getFirstDefined([
            get(member, "nationalityCode"),
            get(member, "countryCode"),
            get(member, "nationalityAlpha2"),
            get(member, "nationalityAbbr"),
            get(member, "nationality"),
          ]),
        ),
        roleCode: coerceString(
          getFirstDefined([get(member, "roleCode"), get(member, "role"), get(member, "occupation")]),
        ),
        passportType: coerceString(get(member, "passportType")),
        placeOfIssueEn: coerceString(get(member, "placeOfIssueEn")),
        placeOfIssueAr: coerceString(get(member, "placeOfIssueAr")),
        passportExpiryDate: normalizeDateTime(get(member, "passportExpiryDate")),
        emirateId: coerceNumber(get(member, "emirateId")),
        regionId: coerceNumber(get(member, "regionId")),
        areaId: coerceNumber(get(member, "areaId")),
        street: coerceString(get(member, "street")),
        mobileNo: coerceString(get(member, "mobileNo")),
        telephoneNo: coerceString(get(member, "telephoneNo")),
        fax: coerceString(get(member, "fax")),
        workNo: coerceString(get(member, "workNo")),
        areaCode: coerceString(get(member, "areaCode")),
        emailAddress: coerceString(get(member, "emailAddress")),
      };
    })
    .filter(
      (member) =>
        member.fullName ||
        member.emiratesId ||
        member.passportNumber ||
        member.unifiedNumber,
    );
};

export const buildService20Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service20RuleStrategyValidatePayload => {
  const purposeCodes = resolveStringArray(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "FilmingPurpose.purposeOfPhotography"),
        get(formValues, "purposeCodes"),
        get(formValues, "PurposeOfPhotography"),
      ]),
    ),
  );

  const sharedPermitReference = coerceString(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "FilmingPurpose.textPermit"),
        get(formValues, "textPermit"),
        get(formValues, "printingPermitReference"),
        get(formValues, "PrintingPermitId"),
      ]),
    ),
  );

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      applicantUserTypeCode: resolveApplicantUserTypeCode(userInfo, currentProfileId),
      photographyTypeCode:
        coerceString(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "photographyTypeCode"),
              get(formValues, "FilmingPurpose.photographyTypeCode"),
              get(formValues, "PhotographKindCode"),
              get(formValues, "photographKindCode"),
            ]),
          ),
        ) ?? "03",
      purposeCodes,
      startDate: normalizeDateTime(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "FilmingPurpose.photographyStartingDate"),
            get(formValues, "startDate"),
            get(formValues, "photographyStartingDate"),
          ]),
        ),
      ),
      endDate: normalizeDateTime(
        getFirstDefined(
          formValuesList.flatMap((formValues) => [
            get(formValues, "FilmingPurpose.photographyEndingDate"),
            get(formValues, "endDate"),
            get(formValues, "photographyEndingDate"),
          ]),
        ),
      ),
      filmScreenplayPermitReference:
        coerceString(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "FilmingPurpose.filmScreenplayPermitReference"),
              get(formValues, "filmScreenplayPermitReference"),
              get(formValues, "FilmingPurpose.filmTextPermit"),
            ]),
          ),
        ) ?? sharedPermitReference,
      seriesScriptPermitReference:
        coerceString(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "FilmingPurpose.seriesScriptPermitReference"),
              get(formValues, "seriesScriptPermitReference"),
              get(formValues, "FilmingPurpose.seriesTextPermit"),
            ]),
          ),
        ) ?? sharedPermitReference,
      termsAgreed: resolveTermsAgreed(formValuesList),
      submissionMode,
      requestTime: toApi(nowGst()),
      locations: resolveLocations(formValuesList),
      teamMembers: resolveTeamMembers(formValuesList),
    },
  };
};
