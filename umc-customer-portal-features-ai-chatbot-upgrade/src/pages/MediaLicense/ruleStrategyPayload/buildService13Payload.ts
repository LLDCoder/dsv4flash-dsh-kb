import { nowGst, toApi } from "@/utils/gstTime";
import type { Service13RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveApplicantUserTypeCode,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

type EquipmentItem = Record<string, unknown>;
type MemberItem = Record<string, unknown>;
type EmiratePortValue = {
  id?: unknown;
  emirateId?: unknown;
};

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

const getEmiratePortField = (value: unknown): EmiratePortValue | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as EmiratePortValue;
};

const normalizeDateTime = (value: unknown): string | undefined => {
  const normalized = coerceString(value);
  if (!normalized) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? `${normalized}T00:00:00`
    : normalized;
};

const resolveUploadUrl = (value: unknown): string | undefined => {
  if (typeof value === "string") return coerceString(value);
  if (Array.isArray(value)) {
    return resolveUploadUrl(value[0]);
  }
  if (value && typeof value === "object") {
    return coerceString(
      getFirstDefined([
        get(value, ["url"]),
        get(value, ["fileUrl"]),
        get(value, ["path"]),
        get(value, ["response", "data"]),
        get(value, ["response", "url"]),
        get(value, ["name"]),
      ]),
    );
  }
  return undefined;
};

const resolveEquipmentName = (equipment: EquipmentItem) => {
  return coerceString(
    getFirstDefined([
      equipment.photoEquipmentNameEn,
      equipment.equipmentName,
      equipment.equipment,
      equipment.photoEquipment,
      equipment.label,
      equipment.name,
    ]),
  );
};

const resolveEquipmentId = (equipment: EquipmentItem) => {
  return coerceNumber(
    getFirstDefined([
      equipment.PhotoEquipmentId,
      equipment.photoEquipmentId,
      equipment.equipmentId,
      equipment.photoEquipment,
    ]),
  );
};

const resolveTermsAccepted = (formValuesList: Array<Record<string, unknown>>) => {
  return (
    coerceBoolean(
      getFirstDefined(
        formValuesList.flatMap((formValues) => [
          get(formValues, "SelectTableSingle.termsAccepted"),
          get(formValues, "SelectTableSingle.termsAgreed"),
          get(formValues, "SelectTableSingle.terms.isAgreed"),
          get(formValues, "termsAccepted"),
          get(formValues, "termsAgreed"),
          get(formValues, "terms.isAgreed"),
        ]),
      ),
    ) ?? true
  );
};

export const buildService13Payload = async ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Promise<Service13RuleStrategyValidatePayload> => {
  const rawPort = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "SelectTableSingle.Port"),
      get(formValues, "SelectTableSingle.EmiratePort"),
      get(formValues, "SelectTableSingle.port"),
      get(formValues, "SelectTableSingle.portId"),
      get(formValues, "Port"),
      get(formValues, "EmiratePort"),
      get(formValues, "port"),
      get(formValues, "portId"),
    ]),
  );
  const emiratePortField = getEmiratePortField(rawPort);

  const rawEquipmentList = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "SelectTableSingle.dataList"),
      get(formValues, "SelectTableSingle.DataList"),
      get(formValues, "dataList"),
      get(formValues, "DataList"),
    ]),
  );
  const equipments = Array.isArray(rawEquipmentList)
    ? rawEquipmentList.map((item) => {
        const equipment = item as EquipmentItem;
        const photoEquipmentNameEn = resolveEquipmentName(equipment);

        return {
          photoEquipmentId: resolveEquipmentId(equipment),
          photoEquipmentNameEn,
          otherText: coerceString(
            getFirstDefined([
              equipment.otherText,
              equipment.Description,
              equipment.description,
              equipment.otherEquipmentText,
              equipment.other_equipment_text,
            ]),
          ),
          number: coerceNumber(equipment.number),
        };
      })
    : [];

  const rawMembers = getFirstDefined(
    formValuesList.flatMap((formValues) => [
      get(formValues, "SelectTableSingle.PersonsinCharge"),
      get(formValues, "SelectTableSingle.PersonsInCharge"),
      get(formValues, "SelectTableSingle.personsInCharge"),
      get(formValues, "SelectTableSingle.members"),
      get(formValues, "PersonsinCharge"),
      get(formValues, "PersonsInCharge"),
      get(formValues, "personsInCharge"),
      get(formValues, "members"),
    ]),
  );
  const members = Array.isArray(rawMembers)
    ? rawMembers.map((item) => {
        const member = item as MemberItem;
        return {
          person: {
            emiratesId: coerceString(member.emiratesId),
            passportNumber: coerceString(member.passportNumber),
            name:
              coerceString(
                getFirstDefined([member.fullNameEnglish, member.fullNameArabic, member.name]),
              ) ?? "",
            title: coerceString(getFirstDefined([member.occupation, member.title])),
            countryId: coerceNumber(getFirstDefined([member.nationality, member.countryId])),
            photoUrl: resolveUploadUrl(getFirstDefined([member.PersonalPhoto, member.photoUrl])),
          },
        };
      })
    : [];

  return {
    actionType: 1,
    request: {
      serviceId: config.serviceId,
      applicant: {
        userId: currentProfileId || "",
        userTypeCode: resolveApplicantUserTypeCode(userInfo, currentProfileId),
        establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      },
      form: {
        purpose:
          coerceString(
            getFirstDefined(
              formValuesList.flatMap((formValues) => [
                get(formValues, "SelectTableSingle.PurposeOfEntries"),
                get(formValues, "SelectTableSingle.purpose"),
                get(formValues, "SelectTableSingle.Purpose"),
                get(formValues, "PurposeOfEntries"),
                get(formValues, "purpose"),
                get(formValues, "Purpose"),
              ]),
            ),
          ) ?? "",
        arrivalDate: normalizeDateTime(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "SelectTableSingle.ArrivalDate"),
              get(formValues, "SelectTableSingle.arrivalDate"),
              get(formValues, "ArrivalDate"),
              get(formValues, "arrivalDate"),
            ]),
          ),
        ),
        emirateId: coerceNumber(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "SelectTableSingle.Emirate"),
              get(formValues, "SelectTableSingle.emirateId"),
              get(formValues, "SelectTableSingle.emirate"),
              get(formValues, "Emirate"),
              get(formValues, "emirateId"),
              get(formValues, "emirate"),
              emiratePortField?.emirateId,
            ]),
          ),
        ),
        portId: coerceNumber(emiratePortField?.id ?? rawPort),
        requestUrl: resolveUploadUrl(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "SelectTableSingle.CustomsDeclaration"),
              get(formValues, "SelectTableSingle.requestUrl"),
              get(formValues, "CustomsDeclaration"),
              get(formValues, "requestUrl"),
            ]),
          ),
        ),
        purposeUrl: resolveUploadUrl(
          getFirstDefined(
            formValuesList.flatMap((formValues) => [
              get(formValues, "SelectTableSingle.EntityRequestLetter"),
              get(formValues, "SelectTableSingle.purposeUrl"),
              get(formValues, "EntityRequestLetter"),
              get(formValues, "purposeUrl"),
            ]),
          ),
        ),
        termsAccepted: resolveTermsAccepted(formValuesList),
        equipments,
        members,
      },
      submissionMode,
      requestTime: toApi(nowGst()),
    },
  };
};
