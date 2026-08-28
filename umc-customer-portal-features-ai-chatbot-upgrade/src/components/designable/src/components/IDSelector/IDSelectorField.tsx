import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { observer, useField, useForm } from "@formily/react";
import { Radio } from "antd";
import type { RadioChangeEvent } from "antd";
import { OcrModal, OCR_DOCUMENT_TYPE } from "@/components/common/ocr";
import type {
  OcrApplyPayload,
  OcrDocumentType,
  OcrPreviewFileType,
} from "@/components/common/ocr";
import "./styles.less";
import EmiratesIdFields from "./sections/EmiratesIdFields";
import PassportFields from "./sections/PassportFields";
import UidFields from "./sections/UidFields";
import {
  type IDSelectorFieldProps,
  type IDSelectorValue,
  type IdSelectorType,
  SUB_FIELD_NAMES,
  QUERY_FIELD_BY_TYPE,
  buildIdSelectorTypeChangeValue,
  getAvailableOptions,
  getShowList,
  normalizePassportNumberInput,
  normalizeIdSelectorRuntimeValue,
  resolveCurrentType,
  stripIcpLookupMetadata,
} from "./idSelectorUtils";
import useIdSelectorIcp from "./useIdSelectorIcp";
import useIdSelectorValidators from "./useIdSelectorValidators";
import { useTranslation } from "react-i18next";

interface FeedbackSubField {
  setValue?: (value: unknown) => void;
  setFeedback: (feedback: { type: string; messages: string[] }) => void;
  setValidator: (validator: (value: unknown) => string) => void;
  validate?: () => Promise<unknown> | unknown;
}

interface FormilyFieldLike {
  value?: unknown;
  address: string;
  path: string;
  pattern?: string;
  setValue: (value: IDSelectorValue | undefined) => void;
  query: (pattern: string) => { take: () => FeedbackSubField | undefined };
}

const formatOcrDate = (value: unknown): string | undefined => {
  if (!value) return undefined;

  const date = moment.isMoment(value) ? value : moment(value as moment.MomentInput);
  return date.isValid() ? date.format("YYYY-MM-DD") : undefined;
};

const mapOcrGender = (value: unknown): IDSelectorValue["gender"] => {
  if (Number(value) === 1) return "male";
  if (Number(value) === 2) return "female";
  return undefined;
};

const hasOcrValue = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== "";

const IDSelectorFieldContent: React.FC<IDSelectorFieldProps> = observer((props) => {
  const { t } = useTranslation();
  const {
    showEmiratesId,
    showPassport,
    showUID,
    enablePassportExtendedFields = false,
    useAllEmirates = false,
    editableFieldKeys,
    autoRefreshEmiratesIdExpiry = false,
    onValueChange,
    runtimeType,
  } = props;
  const field = useField() as unknown as FormilyFieldLike;
  const form = useForm();
  const [ocrModalDocumentType, setOcrModalDocumentType] = useState<
    OcrDocumentType | null
  >(null);
  const current = useMemo(
    () => ((field.value || {}) as IDSelectorValue),
    [field.value],
  );
  const availableOptions = useMemo(
    () => {
      const options =
        runtimeType === undefined
          ? getAvailableOptions({ showEmiratesId, showPassport, showUID })
          : getAvailableOptions({
              showEmiratesId: runtimeType === "emiratesId",
              showUID: runtimeType === "uid",
              showPassport: runtimeType === "passport",
            });
      return options.map(
        (option) => ({
          ...option,
          label: t(`IDSelector.type.${option.value}`),
        }),
      );
    },
    [runtimeType, showEmiratesId, showPassport, showUID, t],
  );
  const currentType = useMemo(
    () => resolveCurrentType(current, availableOptions),
    [availableOptions, current],
  );
  const isReviewMode = field.pattern === "readPretty";
  /** Form-level pattern (e.g. FormliyView preview uses form.setPattern("disabled")) does not always mirror onto object fields — check both. */
  const isFormLocked =
    form.pattern === "disabled" ||
    form.pattern === "readOnly" ||
    form.pattern === "readPretty";
  const isDisabled =
    !!props.disabled ||
    field.pattern === "disabled" ||
    field.pattern === "readOnly" ||
    isReviewMode ||
    isFormLocked;
  const editableFieldKeySet = useMemo(
    () => new Set(editableFieldKeys || []),
    [editableFieldKeys],
  );
  const hasEditRestriction = editableFieldKeySet.size > 0;
  const isTypeSelectionDisabled = isDisabled || hasEditRestriction;

  const isFieldEditable = useCallback(
    (key: keyof IDSelectorValue) => {
      if (isDisabled) return false;
      if (!hasEditRestriction) return true;
      return editableFieldKeySet.has(key);
    },
    [editableFieldKeySet, hasEditRestriction, isDisabled],
  );

  const {
    nationalityList,
    lookupStateMap,
    isIcpInfoLoaded,
    triggerQuery,
    resetLookupState,
  } = useIdSelectorIcp({
    field,
    current,
    currentType,
    autoQueryEnabled: !isDisabled && !hasEditRestriction,
    autoRefreshEmiratesIdExpiry:
      autoRefreshEmiratesIdExpiry && !isDisabled,
    onIcpLoadedChange: props.onIcpLoadedChange,
    onValueChange,
  });

  const showList =
    autoRefreshEmiratesIdExpiry &&
    currentType === "emiratesId" &&
    !!current.emiratesId
      ? true
      : getShowList(currentType, lookupStateMap[currentType], current);

  const resetCurrentLookup = useCallback(() => {
    resetLookupState();
    (["dateOfBirth", QUERY_FIELD_BY_TYPE[currentType]] as const).forEach(
      (fieldName) => {
        field
          .query(`${field.address}.${fieldName}`)
          .take()
          ?.setFeedback({ type: "error", messages: [] });
      },
    );
  }, [currentType, field, resetLookupState]);

  useIdSelectorValidators({
    field,
    current,
    currentType,
    showList,
    enablePassportExtendedFields,
  });

  const handleTypeChange = useCallback(
    (event: RadioChangeEvent) => {
      if (isTypeSelectionDisabled) return;
      const nextType = event.target.value as IdSelectorType;

      SUB_FIELD_NAMES.forEach((fieldName) => {
        const subField = field.query(`${field.address}.${fieldName}`).take();
        if (subField) {
          subField.setFeedback({
            type: "error",
            messages: [],
          });
        }
      });

      resetLookupState();

      const initialValue = form.getInitialValuesIn(field.path) as
        | IDSelectorValue
        | undefined;
      const nextValue = buildIdSelectorTypeChangeValue(nextType, initialValue);

      field.setValue(nextValue);
      onValueChange?.(nextValue);
    },
    [
      field,
      form,
      isTypeSelectionDisabled,
      onValueChange,
      resetLookupState,
    ],
  );

  const handleFieldChange = useCallback(
    <K extends keyof IDSelectorValue>(key: K, value: IDSelectorValue[K]) => {
      if (!isFieldEditable(key)) return;
      const currentValue = (field.value || current) as IDSelectorValue;
      const changedValue = {
        ...currentValue,
        type: currentType,
        [key]: value,
      };
      const isQueryInput =
        key === "dateOfBirth" || key === QUERY_FIELD_BY_TYPE[currentType];
      const nextValue = isQueryInput
        ? stripIcpLookupMetadata(changedValue)
        : changedValue;

      if (key === "PersonalPhoto" || key === "EmiratesID") {
        console.log("[IDSelectorField] upload field change", {
          key,
          value,
          currentType,
          currentValue,
          nextValue,
        });
      }

      field.setValue(nextValue);
      onValueChange?.(nextValue);

      if (isQueryInput) {
        resetCurrentLookup();
      }

      const subField = field.query(`${field.address}.${key}`).take();
      subField?.setValue?.(value);
      subField?.setFeedback({
        type: "error",
        messages: [],
      });
    },
    [
      current,
      currentType,
      field,
      isFieldEditable,
      onValueChange,
      resetCurrentLookup,
    ],
  );

  const handleFieldsChange = useCallback(
    (changes: Partial<IDSelectorValue>) => {
      if (!isFieldEditable("mobileNo")) return;

      const currentValue = (field.value || current) as IDSelectorValue;
      const nextValue = {
        ...currentValue,
        type: currentType,
        ...changes,
      };

      field.setValue(nextValue);
      onValueChange?.(nextValue);

      Object.keys(changes).forEach((fieldName) => {
        const key = fieldName as keyof IDSelectorValue;
        const subField = field.query(`${field.address}.${key}`).take();
        subField?.setValue?.(nextValue[key]);
        subField?.setFeedback({
          type: "error",
          messages: [],
        });
      });
    },
    [current, currentType, field, isFieldEditable, onValueChange],
  );

  const handleOcrApply = useCallback(
    (
      payload: OcrApplyPayload,
      documentType: OcrDocumentType,
      previewFileType: OcrPreviewFileType,
    ) => {
      const currentValue = (field.value || current) as IDSelectorValue;
      const mappedPayload: Partial<IDSelectorValue> = {};
      const addOcrField = (
        fieldName: keyof IDSelectorValue,
        value: IDSelectorValue[keyof IDSelectorValue],
      ) => {
        if (hasOcrValue(value)) {
          mappedPayload[fieldName] = value as never;
        }
      };

      addOcrField("dateOfBirth", formatOcrDate(payload.dateOfBirth));

      if (documentType === OCR_DOCUMENT_TYPE.EMIRATES_ID) {
        addOcrField("emiratesId", payload.emiratesId);
        addOcrField("emiratesIdexpiryDate", formatOcrDate(
          payload.emiratesIdExpiryDate,
        ));

        if (previewFileType === "pdf") {
          addOcrField("EmiratesID", payload.emiratesIdUrl);
        }
      } else {
        addOcrField(
          "passportNumber",
          normalizePassportNumberInput(payload.passportNumber || ""),
        );
        addOcrField("fullNameArabic", payload.fullNameAr);
        addOcrField("fullNameEnglish", payload.fullNameEn);
        addOcrField("nationality", payload.nationalityId);
        addOcrField("gender", mapOcrGender(payload.gender));
        addOcrField("passportExpiryDate", formatOcrDate(
          payload.passportExpiryDate,
        ));

        if (previewFileType === "pdf") {
          addOcrField("PassportScan", payload.passportScanUrl);
        }
      }

      const mappedFieldNames = Object.keys(mappedPayload) as Array<
        keyof IDSelectorValue
      >;
      const mappedQueryInput = mappedFieldNames.some(
        (fieldName) =>
          fieldName === "dateOfBirth" ||
          fieldName === QUERY_FIELD_BY_TYPE[currentType],
      );
      const mappedValue = mappedFieldNames.reduce<IDSelectorValue>(
        (next, fieldName) => {
          next[fieldName] = mappedPayload[fieldName] as never;
          return next;
        },
        { ...currentValue },
      );
      const nextValue = mappedQueryInput
        ? stripIcpLookupMetadata(mappedValue)
        : mappedValue;

      field.setValue(nextValue);
      onValueChange?.(nextValue);

      if (mappedQueryInput) {
        resetCurrentLookup();
      }

      mappedFieldNames.forEach((fieldName) => {
        const subField = field.query(`${field.address}.${fieldName}`).take();
        subField?.setValue?.(nextValue[fieldName]);
        subField?.setFeedback({
          type: "error",
          messages: [],
        });
      });

      setOcrModalDocumentType(null);
    },
    [current, currentType, field, onValueChange, resetCurrentLookup],
  );

  const commonSectionProps = {
    current,
    showList,
    enablePassportExtendedFields,
    useAllEmirates,
    showQueryButton: !isDisabled && !hasEditRestriction,
    isFieldEditable,
    nationalityList,
    onFieldChange: handleFieldChange,
    onFieldsChange: handleFieldsChange,
    onQuery: () => triggerQuery(currentType),
    onOpenOcr:
      currentType === "emiratesId"
        ? () => setOcrModalDocumentType(OCR_DOCUMENT_TYPE.EMIRATES_ID)
        : currentType === "passport"
          ? () => setOcrModalDocumentType(OCR_DOCUMENT_TYPE.PASSPORT)
          : undefined,
    queryLoading: lookupStateMap[currentType].status === "loading",
    isQuerySuccess: isIcpInfoLoaded,
  };

  const renderFields = () => {
    if (currentType === "uid") return <UidFields {...commonSectionProps} />;
    if (currentType === "passport") {
      return <PassportFields {...commonSectionProps} />;
    }
    return <EmiratesIdFields {...commonSectionProps} />;
  };

  return (
    <div className="idselector-container Formily-Modal-Form">
      {runtimeType === undefined ? (
        <Radio.Group
          value={currentType}
          onChange={handleTypeChange}
          disabled={isTypeSelectionDisabled}
          className="idselector-radio-group"
        >
          {availableOptions.map((option) => (
            <Radio
              key={option.value}
              value={option.value}
              disabled={isTypeSelectionDisabled}
            >
              {option.label}
            </Radio>
          ))}
        </Radio.Group>
      ) : null}
      {renderFields()}
      {ocrModalDocumentType && (
        <OcrModal
          visible={!!ocrModalDocumentType}
          documentType={ocrModalDocumentType}
          nationalityList={nationalityList}
          onApply={(payload, context) =>
            handleOcrApply(
              payload,
              ocrModalDocumentType,
              context.previewFileType,
            )
          }
          onClose={() => setOcrModalDocumentType(null)}
        />
      )}
    </div>
  );
});

export const IDSelectorField: React.FC<IDSelectorFieldProps> = observer(
  (props) => {
    const field = useField() as unknown as FormilyFieldLike;
    const { onValueChange, runtimeType } = props;

    useEffect(() => {
      if (runtimeType === undefined) return;

      const currentValue = field.value as IDSelectorValue | undefined;
      const nextValue = normalizeIdSelectorRuntimeValue(
        currentValue,
        runtimeType,
      );
      if (JSON.stringify(currentValue) === JSON.stringify(nextValue)) return;

      field.setValue(nextValue);
      onValueChange?.(nextValue);
    }, [field, onValueChange, runtimeType]);

    if (runtimeType === null) return null;
    return <IDSelectorFieldContent {...props} />;
  },
);

export default IDSelectorField;
