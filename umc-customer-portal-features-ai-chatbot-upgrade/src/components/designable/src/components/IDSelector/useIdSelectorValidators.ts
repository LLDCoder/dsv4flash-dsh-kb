import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  type IDSelectorValue,
  type IdSelectorType,
  getIdSelectorValidatorRules,
} from "./idSelectorUtils";

interface ValidatorSubField {
  setValidator: (validator: (value: unknown) => string) => void;
  setFeedback: (feedback: { type: string; messages: string[] }) => void;
}

interface ValidatorField {
  value?: unknown;
  address: string;
  query: (pattern: string) => { take: () => ValidatorSubField | undefined };
}

interface UseIdSelectorValidatorsParams {
  field: ValidatorField;
  current: IDSelectorValue;
  currentType: IdSelectorType;
  showList: boolean;
  enablePassportExtendedFields?: boolean;
}

const CLEAR_FIELDS_BY_TYPE: Record<IdSelectorType, Array<keyof IDSelectorValue>> = {
  emiratesId: [
    "uid",
    "passportNumber",
    "passportType",
    "placeOfIssueEn",
    "placeOfIssueAr",
    "passportExpiryDate",
    "visaExpiryDate",
    "emirateId",
    "regionId",
    "areaId",
    "street",
    "mobileNo",
    "mobileNoCountryCode",
    "mobileNoLocalNumber",
    "telephoneNo",
    "fax",
    "workNo",
    "areaCode",
    "emailAddress",
    "Passport",
    "Visa",
    "PassportScan",
  ],
  uid: [
    "emiratesId",
    "passportNumber",
    "passportType",
    "placeOfIssueEn",
    "placeOfIssueAr",
    "emiratesIdexpiryDate",
    "emirateId",
    "regionId",
    "areaId",
    "street",
    "mobileNo",
    "mobileNoCountryCode",
    "mobileNoLocalNumber",
    "telephoneNo",
    "fax",
    "workNo",
    "areaCode",
    "emailAddress",
    "EmiratesID",
    "PassportScan",
  ],
  passport: [
    "emiratesId",
    "uid",
    "emiratesIdexpiryDate",
    "visaExpiryDate",
    "EmiratesID",
    "Passport",
    "Visa",
  ],
};

export const useIdSelectorValidators = ({
  field,
  current,
  currentType,
  showList,
  enablePassportExtendedFields = false,
}: UseIdSelectorValidatorsParams) => {
  const { i18n } = useTranslation();
  useEffect(() => {
    const setupSubFieldValidator = (
      fieldName: keyof IDSelectorValue,
      validator: (value: unknown) => string,
    ) => {
      const subField = field.query(`${field.address}.${fieldName}`).take();
      if (subField) {
        subField.setValidator(validator);
      }
    };

    const clearSubFieldValidator = (fieldName: keyof IDSelectorValue) => {
      const subField = field.query(`${field.address}.${fieldName}`).take();
      if (subField) {
        subField.setValidator(() => "");
        subField.setFeedback({ type: "error", messages: [] });
      }
    };

    const value = (field.value || {}) as IDSelectorValue;
    const type = value.type || currentType;
    const hasDetails =
      showList &&
      (!!value.emiratesId || !!value.uid || !!value.passportNumber);

    const rules = getIdSelectorValidatorRules(
      type,
      hasDetails,
      value,
      enablePassportExtendedFields,
    );
    Object.entries(rules).forEach(([fieldName, validator]) => {
      if (validator) {
        setupSubFieldValidator(
          fieldName as keyof IDSelectorValue,
          validator,
        );
      }
    });

    CLEAR_FIELDS_BY_TYPE[type].forEach(clearSubFieldValidator);
  }, [current, currentType, enablePassportExtendedFields, field, i18n.language, showList]);
};

export default useIdSelectorValidators;
