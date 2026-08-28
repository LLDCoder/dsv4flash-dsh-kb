import React from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, useForm, Field } from "@formily/react";
import { Radio, Card as AntdCard, Divider } from "antd";
import type { RadioChangeEvent } from "antd";
import { useServicesStore } from "@/store/services";
import { IDSelectorField } from "../IDSelector/IDSelectorField";
import type { IDSelectorValue } from "../IDSelector/idSelectorUtils";
import {
  SUB_FIELD_NAMES,
  getAvailableOptions,
  getIdSelectorValidatorRules,
  resolveCurrentType,
} from "../IDSelector/idSelectorUtils";
import type { GuardianConsentDetailsValue } from "../GuardianConsentDetails/GuardianConsentDetailsField";
import moment, { type Moment } from "moment";
import "./styles.less";

type SocialMediaManagerValue = {
  managesSocialMedia?: string;
  idSelector?: IDSelectorValue;
  guardianConsentDetails?: GuardianConsentDetailsValue;
};

type FormilyFeedback = {
  type: string;
  messages: string[];
};

type ResettableField = {
  setFeedback?: (feedback: FormilyFeedback) => void;
  setValidator?: (validator: (value: unknown) => string) => void;
  setValue?: (value: unknown) => void;
  setState?: (updater: (state: Record<string, unknown>) => void) => void;
};

type SocialMediaManagerFormField = {
  address: string;
  value?: SocialMediaManagerValue;
  pattern?: string;
  selfErrors?: string[];
  decoratorProps?: Record<string, unknown>;
  setValue: (value: SocialMediaManagerValue) => void;
  setSelfErrors: (messages?: string[]) => void;
  setDecoratorProps: (props: Record<string, unknown>) => void;
  setValidator: (validator: (value?: SocialMediaManagerValue) => string) => void;
  query: (pattern: string) => { take: () => ResettableField | undefined };
};

type SocialMediaManagerFieldProps = {
  disabled?: boolean;
  editable?: boolean;
  showEmiratesId?: boolean;
  showUID?: boolean;
  showPassport?: boolean;
  autoRefreshEmiratesIdExpiry?: boolean;
  [key: string]: unknown;
};

const ELIGIBLE_MIN_AGE = 15;
const ELIGIBLE_MAX_AGE = 18;
const GUARDIAN_SUB_FIELD_NAMES: Array<keyof GuardianConsentDetailsValue> = [
  "consentFile",
  "fullName",
  "passportNumber",
  "nationalityId",
  "guardianDateOfBirth",
  "gender",
  "occupation",
  "email",
  "phoneNumber",
  "phoneNumberCountryCode",
  "phoneNumberLocalNumber",
];

const parseDateValue = (value: unknown): Moment | null => {
  if (!value) return null;
  if (moment.isMoment(value)) return value.clone();
  if (value instanceof Date) return moment(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const strictFormats = [
      "YYYY-MM-DD",
      "YYYY-MM-DDTHH:mm:ss",
      "YYYY-MM-DDTHH:mm:ss.SSSZ",
      "DD/MM/YYYY",
    ];
    for (const format of strictFormats) {
      const parsed = moment(trimmed, format, true);
      if (parsed.isValid()) return parsed;
    }
    const loose = moment(trimmed);
    return loose.isValid() ? loose : null;
  }
  return null;
};

const computeAge = (value: unknown): number | null => {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  return moment().diff(parsed, "years", true);
};

const shouldShowGuardianByDob = (value: unknown) => {
  const age = computeAge(value);
  return age != null && age >= ELIGIBLE_MIN_AGE && age < ELIGIBLE_MAX_AGE;
};

const hasAnyGuardianValue = (
  value: GuardianConsentDetailsValue | undefined
) => {
  if (!value) return false;
  return Object.values(value).some((item) => {
    if (typeof item === "number") return true;
    return String(item ?? "").trim() !== "";
  });
};

const hasIdSelectorValidationError = (
  value: IDSelectorValue | undefined,
  options: Pick<
    SocialMediaManagerFieldProps,
    "showEmiratesId" | "showPassport" | "showUID"
  >,
) => {
  const idSelectorValue = value || {};
  const currentType = resolveCurrentType(
    idSelectorValue,
    getAvailableOptions(options),
  );
  const rules = getIdSelectorValidatorRules(
    currentType,
    true,
    idSelectorValue,
  );

  return Object.entries(rules).some(([fieldName, validator]) => {
    if (!validator) return false;
    return !!validator(
      idSelectorValue[fieldName as keyof IDSelectorValue],
    );
  });
};

export const SocialMediaManagerField: React.FC<SocialMediaManagerFieldProps> = observer((props) => {
  const { t } = useTranslation();
  const field = useField<SocialMediaManagerFormField>();
  const form = useForm();
  if (!field) return null;

  const current = React.useMemo<SocialMediaManagerValue>(
    () => field.value || {},
    [field.value]
  );
  const {
    disabled = false,
    editable = true,
    showEmiratesId = true,
    showPassport = true,
    showUID = true,
    autoRefreshEmiratesIdExpiry = false,
  } = props;
  const effectiveDisabled =
    disabled ||
    editable === false ||
    field.pattern === "disabled" ||
    field.pattern === "readOnly" ||
    field.pattern === "readPretty" ||
    form.pattern === "disabled" ||
    form.pattern === "readOnly" ||
    form.pattern === "readPretty";
  const serviceCode = String(
    useServicesStore((state) => state.userInfo.servicesCode ?? "")
  ).trim();
  const shouldHideUID =
      serviceCode === "8006" ||
      serviceCode === "8007" ||
      serviceCode === "80011" ||
      serviceCode === "80012";
  const effectiveShowUID = shouldHideUID ? false : showUID;
  const guardianDob = current.idSelector?.dateOfBirth;
  const shouldShowGuardian =
    current.managesSocialMedia === "No" && shouldShowGuardianByDob(guardianDob);
  const previousShouldShowGuardianRef = React.useRef(shouldShowGuardian);
  const managementChoiceValidator = React.useCallback(
    (value?: SocialMediaManagerValue) => {
      if (!value?.managesSocialMedia) {
        return t("SocialMediaManager.validation.required");
      }

      if (
        value.managesSocialMedia === "No" &&
        hasIdSelectorValidationError(value.idSelector, {
          showEmiratesId,
          showPassport,
          showUID: effectiveShowUID,
        })
      ) {
        return t("SocialMediaManager.validation.idSelectorRequired");
      }

      return "";
    },
    [effectiveShowUID, showEmiratesId, showPassport, t],
  );

  React.useEffect(() => {
    field.setValidator(managementChoiceValidator);
  }, [field, managementChoiceValidator]);

  React.useEffect(() => {
    field.setDecoratorProps({
      ...field.decoratorProps,
      enableOutlineFeedback: false,
      feedbackLayout: "none",
    });
  }, [field]);

  const resetFieldState = React.useCallback((path: string) => {
    const targetField = field.query(path).take();
    if (!targetField) return;

    targetField.setFeedback?.({
      type: "error",
      messages: [],
    });
    targetField.setValidator?.(() => "");
    targetField.setValue?.(undefined);
    targetField.setState?.((state) => {
      state.selfErrors = [];
      state.selfWarnings = [];
      state.selfSuccesses = [];
      state.selfValidating = false;
      state.validating = false;
    });
  }, [field]);

  const clearIdSelectorState = React.useCallback(() => {
    resetFieldState(`${field.address}.idSelector`);
    SUB_FIELD_NAMES.forEach((fieldName) => {
      resetFieldState(`${field.address}.idSelector.${fieldName}`);
    });
  }, [field.address, resetFieldState]);

  const clearGuardianState = React.useCallback(() => {
    resetFieldState(`${field.address}.guardianConsentDetails`);
    GUARDIAN_SUB_FIELD_NAMES.forEach((fieldName) => {
      resetFieldState(`${field.address}.guardianConsentDetails.${fieldName}`);
    });
  }, [field.address, resetFieldState]);

  const handleRadioChange = (e: RadioChangeEvent) => {
    const val = e.target.value;
    const newValue: SocialMediaManagerValue = {
      ...current,
      managesSocialMedia: val,
    };
    if (val === "Yes") {
      clearIdSelectorState();
      clearGuardianState();
      newValue.idSelector = undefined;
      newValue.guardianConsentDetails = undefined;
    }
    field.setValue(newValue);
    field.setSelfErrors([]);
  };

  React.useEffect(() => {
    if (!shouldShowGuardian) {
      const wasVisible = previousShouldShowGuardianRef.current;
      const hasGuardianValue = hasAnyGuardianValue(current.guardianConsentDetails);

      if (wasVisible || hasGuardianValue) {
        clearGuardianState();
      }

      if (hasGuardianValue) {
        field.setValue({
          ...current,
          guardianConsentDetails: undefined,
        });
      }
    }

    previousShouldShowGuardianRef.current = shouldShowGuardian;
  }, [
    clearGuardianState,
    current,
    field,
    shouldShowGuardian,
  ]);

  const content = (
    <>
      <div className="smm-field-item">
        <div className="smm-label">
          {t("SocialMediaManager.label.managesSocialMedia")}
          <span className="smm-required">*</span>
        </div>
        <Radio.Group
          className="smm-radio-group"
          disabled={effectiveDisabled}
          value={current.managesSocialMedia}
          onChange={handleRadioChange}
        >
          <Radio value="Yes">{t("SocialMediaManager.common.yes")}</Radio>
          <Radio value="No">{t("SocialMediaManager.common.no")}</Radio>
        </Radio.Group>
        {!!field.selfErrors?.length && (
          <div className="smm-field-item__feedback" role="alert">
            {field.selfErrors[0]}
          </div>
        )}
      </div>

      {current.managesSocialMedia === "No" && (
        <>
          <Divider />
          <Field
            name="idSelector"
            component={[
              IDSelectorField,
              {
                disabled: effectiveDisabled,
                showEmiratesId,
                showUID: effectiveShowUID,
                showPassport,
                autoRefreshEmiratesIdExpiry,
              },
            ]}
          />
          {/* {shouldShowGuardian && (
            <>
              <Divider />
              <Field
                name="guardianConsentDetails"
                component={[
                  GuardianConsentDetailsField,
                  {
                    disabled,
                    disableAutoVisibility: true,
                  },
                ]}
              />
            </>
          )} */}
        </>
      )}
    </>
  );

  return (
    <div className="social-media-manager-container" {...props}>
      {disabled ? content : (
        <AntdCard title={t("SocialMediaManager.title")}>{content}</AntdCard>
      )}
    </div>
  );
});

SocialMediaManagerField.displayName = "SocialMediaManagerField";

export default SocialMediaManagerField;
