import { nowGst, toApi } from "@/utils/gstTime";
import type { Service4RuleStrategyValidatePayload } from "@/services/services";
import get from "lodash/get";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveApplicantUserTypeCode,
  resolveEstablishmentId,
  resolveIdSelectorValue,
  toGenderId,
  toVisaType,
} from "../ruleStrategyPayloadShared";

export const buildService4Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service4RuleStrategyValidatePayload => {
  const idSelectorValue = resolveIdSelectorValue(formValuesList);
  if (!idSelectorValue) {
    throw new Error("IDSelector data is missing for service 4.");
  }

  const visaType = toVisaType(idSelectorValue.type);
  const officialLetterUrl = String(
    formValuesList
      .map(
        (formValues) =>
          get(formValues, ["OfficialLetter"]) ??
          get(formValues, ["SelectTable", "OfficialLetter"]),
      )
      .find((value) => value !== undefined && value !== null && value !== "") ??
      "",
  );
  const countryId = idSelectorValue.nationality
    ? Number(idSelectorValue.nationality)
    : undefined;
  const genderId = toGenderId(idSelectorValue.gender);
  const occupation =
    idSelectorValue.occupation == null
      ? undefined
      : String(idSelectorValue.occupation);
  const visaExpiryDate =
    idSelectorValue.visaExpiryDate == null
      ? undefined
      : String(idSelectorValue.visaExpiryDate);
  const passportCopySource =
    visaType === 3 ? idSelectorValue.PassportScan : idSelectorValue.Passport;

  const person = {
    visaType,
    dateOfBirth: String(idSelectorValue.dateOfBirth ?? ""),
    emiratesId:
      visaType === 1 ? String(idSelectorValue.emiratesId ?? "") : undefined,
    unifiedNumber: visaType === 2 ? idSelectorValue.uid : undefined,
    passportNumber: visaType === 3 ? idSelectorValue.passportNumber : undefined,
    name: String(idSelectorValue.fullNameEnglish ?? ""),
    nameAr: String(idSelectorValue.fullNameArabic ?? ""),
    genderId,
    countryId,
    photoUrl: String(idSelectorValue.PersonalPhoto ?? ""),
    emiratesIdCopyUrl:
      visaType === 1 ? String(idSelectorValue.EmiratesID ?? "") : undefined,
    passportCopyUrl:
      visaType === 3 || visaType === 2
        ? String(passportCopySource ?? "")
        : undefined,
    visaCopyUrl: visaType === 2 ? String(idSelectorValue.Visa) : undefined,
    inquiryResult: {
      nationalityId: countryId,
      genderId,
      occupation,
      emiratesIdExpiryDate:
        visaType === 1
          ? String(idSelectorValue.emiratesIdexpiryDate)
          : undefined,
      visaExpiryDate,
      unifiedNumber: visaType === 2 ? idSelectorValue.uid : undefined,
    },
    occupation,
    emiratesIdExpiryDate:
      visaType === 1 ? String(idSelectorValue.emiratesIdexpiryDate) : undefined,
    passportExpiryDate:
    visaType === 3 || visaType === 2 ? String(idSelectorValue.passportExpiryDate) : undefined,
    visaExpiryDate,
  };

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
        termsAccepted: true,
        officialLetterUrl,
        person,
      },
      submissionMode,
      requestTime: toApi(nowGst()),
    },
  };
};
