import * as React from "react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { FieldValidator } from "@formily/core";
import { observer, useField, useForm } from "@formily/react";
import {
  Button,
  Modal,
  Table,
  Form,
  Select,
  Input,
  Pagination,
  Row,
  Col,
  Card as AntdCard,
  Tooltip,
} from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
// @ts-expect-error -- legacy JS module without bundled typings
import { languageOptions } from "../LanguageSelectMulti/language";
import FieldDecoratorTooltip from "@/components/designable/src/components/FormItemWithHtmlTooltip/FieldDecoratorTooltip";
import CustomButton from "@/components/common/CustomButton";
import CustomMessage from "@/components/common/CustomMessage";
import OverflowTooltip from "@/components/common/OverflowTooltip";

import {
  checkPublicationNameExists,
  getLanguages,
  getMaterialTypes,
  type MaterialTypeLookupItem,
} from "../../../../../services/services";
import { useUserStore } from "@/store/user";
import {
  SERVICE_302,
  SERVICE302_ALLOWED_OTHER_MATERIAL_CODES,
  createService302MaterialDuplicateKey,
} from "@/pages/MediaLicense/service302Utils";
import type {
  DataListSourceConfig,
  DropdownOption,
} from "./Setter/DataListSourceSetter";
import EmiratesIdInput from "@/components/common/EmiratesIdInput";
import {
  createMobileNumberFormRule,
  DEFAULT_COUNTRY_DIAL_CODE,
  FormMobileNumberInput,
} from "@/components/common/MobileNumberInput";
import {
  DATA_LIST_ROW_ID_KEY,
  EMAIL_MAX_LENGTH,
  EMAIL_REGEX,
  EMIRATES_ID_REGEX,
  FULL_NAME_MAX_LENGTH,
  createDataListLanguageCandidate,
  createDataListRowId,
  dataListUsesRowIds,
  ensureDataListRowIds,
  getDataListRowId,
  getDataListLanguageEditFallback,
  getDataListStoredLanguageFields,
  getDataListRuleViolation,
  hasReachedDataListMaxItems,
  isDuplicateDataListLanguage,
  isDuplicateDataListPublicationName,
  isDuplicateTraineeEmiratesId,
  isDuplicateTraineeEmail,
  isDuplicateTraineeMobile,
  isPublicationNameServiceCode,
  normalizeDataListMaxItems,
  normalizePublicationName,
  type PublicationNameCheckExclusions,
  resolveDataListMinItems,
} from "./dataListRules";
import "./DataList.less";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";

type DataRecord = Record<string, string | number | boolean>;
type TableDataRecord = DataRecord & { __dataListRowKey: string };
type SelectOption = { label: string; value: number | string; saveLabel?: string };
type MaterialTypeOption = SelectOption & { code?: string };
type LanguageOption = SelectOption;
type RawLookupItem = Record<string, unknown>;

type DataListProps = {
  value?: DataRecord[];
  onChange?: (value: DataRecord[]) => void;
  fieldSource?: DataListSourceConfig;
  addButtonText?: string;
  designMode?: boolean;
  title?: string;
  serviceCode?: number | string;
  required?: boolean;
  minItems?: number;
  maxItems?: number;
  uniqueLanguageRequired?: boolean;
  editable?: boolean;
  disabled?: boolean;
  publicationNameCheckExclusions?: PublicationNameCheckExclusions;
};

type FormilyFieldLike = {
  value?: unknown;
  pattern?: string;
  required?: boolean;
  selfErrors?: string[];
  validator?: FieldValidator;
  setValue?: (value: DataRecord[]) => void;
  setValidator?: (validator?: FieldValidator) => void;
  validate?: () => Promise<unknown>;
};

const DATA_LIST_RULE_VALIDATOR = Symbol("dataListRuleValidator");

type DataListRuleValidator = ((value: unknown) => string) & {
  [DATA_LIST_RULE_VALIDATOR]: true;
};

const isDataListRuleValidator = (validator: unknown) => {
  if (typeof validator === "function") {
    return DATA_LIST_RULE_VALIDATOR in validator;
  }
  if (typeof validator !== "object" || validator === null) {
    return false;
  }
  const ruleValidator = (validator as { validator?: unknown }).validator;
  return (
    typeof ruleValidator === "function" &&
    DATA_LIST_RULE_VALIDATOR in ruleValidator
  );
};

const withoutDataListRuleValidator = (validator?: FieldValidator) => {
  const validators = Array.isArray(validator)
    ? validator
    : validator
      ? [validator]
      : [];
  return validators.filter((item) => !isDataListRuleValidator(item));
};

const PAGE_SIZE = 10;
const SEARCHABLE_CHILDREN_SELECT_PROPS = {
  showSearch: true,
  optionFilterProp: "children" as const,
};
const DATA_LIST_DATA_SOURCE_VALUES = [
  "equipment_list",
  "material_list",
  "languages_name_list",
  "list_of_trainees",
] as const;
const DATA_LIST_EQUIPMENT_VALUES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;
const getFieldKey = (
  field: string | { fieldName: string; fieldKey?: string },
) => {
  if (typeof field === "object") {
    const explicitKey = field.fieldKey?.trim();
    if (explicitKey) {
      return explicitKey;
    }
    return field.fieldName.toLowerCase().replace(/\s+/g, "_");
  }
  return field.toLowerCase().replace(/\s+/g, "_");
};

const normalizeText = (value: unknown) => String(value ?? "").trim();

const getLocalizedName = (item: RawLookupItem, isAr: boolean) => {
  const candidates = isAr
    ? [
        item.nameAr,
        item.NameAr,
        item.labelAr,
        item.fullNameAr,
        item.nameEn,
        item.NameEn,
        item.labelEn,
        item.fullNameEn,
        item.name,
        item.label,
      ]
    : [
        item.nameEn,
        item.NameEn,
        item.labelEn,
        item.fullNameEn,
        item.nameAr,
        item.NameAr,
        item.labelAr,
        item.fullNameAr,
        item.name,
        item.label,
      ];
  return normalizeText(
    candidates.find((candidate) => normalizeText(candidate)),
  );
};

const isEquipmentList = (fieldSource?: DataListSourceConfig) =>
  fieldSource?.dataSource === "equipment_list";

const isMaterialList = (fieldSource?: DataListSourceConfig) =>
  fieldSource?.dataSource === "material_list";

const isLanguagesNameList = (fieldSource?: DataListSourceConfig) =>
  fieldSource?.dataSource === "languages_name_list";

const isListOfTrainees = (fieldSource?: DataListSourceConfig) =>
  fieldSource?.dataSource === "list_of_trainees";

// Trainee field formats live in dataListRules.ts (imported above) so the
// per-field rules here and the list-level isValidTraineeRecord stay in sync.
// Mobile numbers carry no pattern of their own: createMobileNumberFormRule and
// isValidPhoneNumber both come from libphonenumber-js.

// Present a stored Emirates ID (raw digits or partially formatted) using the
// system-wide 784-XXXX-XXXXXXX-X mask for list display.
const formatEmiratesIdForDisplay = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (digits.length !== 15) {
    // Not a complete Emirates ID; show the original value as-is.
    return raw;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14)}`;
};

const isLanguageNameListField = (fieldName: string) =>
  fieldName === "Language" || fieldName === "Suggested Name";

const getLanguageNameListColumnWidth = (fieldName: string) => {
  if (fieldName === "Language") return "28%";
  return undefined;
};

const DataListOverflowValue = ({
  value,
}: {
  value: string | number | boolean;
}) => {
  const displayValue = String(value ?? "");

  return (
    <OverflowTooltip
      className="datalist-overflow-value"
      title={displayValue}
    >
      {displayValue}
    </OverflowTooltip>
  );
};


const FIELD_LABEL_KEYS: Record<string, string> = {
  Equipment: "DataList.fields.equipment",
  Number: "DataList.fields.number",
  Title: "DataList.fields.title",
  Language: "DataList.fields.language",
  "Number Of Title": "DataList.fields.numberOfTitle",
  "Suggested Name": "DataList.fields.suggestedName",
  "Full Name": "DataList.fields.fullName",
  "Emirates ID Number": "DataList.fields.emiratesIdNumber",
  "Mobile Number": "DataList.fields.mobileNumber",
  Email: "DataList.fields.email",
};

const PLACEHOLDER_KEYS: Record<string, string> = {
  "Select Equipment": "DataList.placeholders.selectEquipment",
  "Enter Number": "DataList.placeholders.enterNumber",
  "Enter Title": "DataList.placeholders.enterTitle",
  "Select Language": "DataList.placeholders.selectLanguage",
  "Enter Number Of Title": "DataList.placeholders.enterNumberOfTitle",
  "Enter Suggested Name": "DataList.placeholders.enterSuggestedName",
  "Enter full name": "DataList.placeholders.enterFullName",
  "Enter Emirates ID number": "DataList.placeholders.enterEmiratesId",
  "Enter mobile number": "DataList.placeholders.enterMobile",
  "Enter email address": "DataList.placeholders.enterEmail",
};

const getEquipmentOptions = (
  fieldSource?: DataListSourceConfig,
): DropdownOption[] => {
  if (!isEquipmentList(fieldSource)) return [];
  return (
    fieldSource!.fields.find((f) => f.fieldName === "Equipment")?.options || []
  );
};

/** Matches "Other" in default equipment options (label Other, numeric id 12). */
const OTHER_EQUIPMENT_VALUE = "12";

const findEquipmentOption = (
  val: string | number | boolean | undefined | null,
  options: DropdownOption[],
): DropdownOption | undefined => {
  if (val == null || val === "") return undefined;
  const s = String(val);
  return options.find((o) => o.value === s || o.label === s);
};

const findMaterialTypeOption = (
  val: string | number | boolean | undefined | null,
  options: MaterialTypeOption[],
): MaterialTypeOption | undefined => {
  if (val == null || val === "") return undefined;
  const s = String(val);
  return options.find((o) => o.value === s || o.label === s || o.code === s);
};

const findLanguageOption = (
  val: string | number | boolean | undefined | null,
  options: LanguageOption[],
): LanguageOption | undefined => {
  if (val == null || val === "") return undefined;
  const s = String(val);
  return options.find(
    (o) => String(o.value) === s || o.label === s || o.saveLabel === s,
  );
};

const getMaterialTypeDisplayValue = (
  record: DataRecord,
  options: MaterialTypeOption[],
) => {
  const opt =
    findMaterialTypeOption(record.materialTypeId, options) ||
    findMaterialTypeOption(record.material_type, options) ||
    findMaterialTypeOption(record.materialTypeCode, options);

  if (opt?.label) {
    return opt.label;
  }

  if (typeof record.material_type === "string" && record.material_type.trim()) {
    return record.material_type;
  }

  if (
    typeof record.materialTypeCode === "string" &&
    record.materialTypeCode.trim()
  ) {
    return record.materialTypeCode;
  }

  if (record.materialTypeId != null && record.materialTypeId !== "") {
    return String(record.materialTypeId);
  }

  return "";
};

const getEquipmentIdValue = (record: DataRecord) =>
  record.photoEquipmentId ?? record.PhotoEquipmentId ?? record.equipmentId;

const getEquipmentDescriptionValue = (record: DataRecord) =>
  record.otherText ?? record.Description ?? record.description;

const normalizeEquipmentRecord = (
  record: DataRecord,
  options: DropdownOption[],
): DataRecord => {
  const equipmentId = getEquipmentIdValue(record);
  const hasEquipmentId =
    equipmentId !== undefined && equipmentId !== null && equipmentId !== "";
  if (hasEquipmentId) {
    return record;
  }
  const opt =
    findEquipmentOption(record.equipment, options) ||
    findEquipmentOption(getEquipmentIdValue(record), options);
  if (!opt) {
    return record;
  }
  return {
    ...record,
    equipmentId: Number(opt.value),
    photoEquipmentId: Number(opt.value),
    PhotoEquipmentId: Number(opt.value),
    equipment: opt.label,
  };
};

const normalizeEquipmentData = (
  rows: DataRecord[],
  fieldSource?: DataListSourceConfig,
): DataRecord[] => {
  if (!isEquipmentList(fieldSource) || rows.length === 0) {
    return rows;
  }
  const options = getEquipmentOptions(fieldSource);
  if (options.length === 0) {
    return rows;
  }
  return rows.map((row) => normalizeEquipmentRecord(row, options));
};

const areDataRecordsEqual = (left: DataRecord[], right: DataRecord[]) => {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return JSON.stringify(left) === JSON.stringify(right);
};

/** ， antd 4 Form.Item  */
const NumberOnlyInput: React.FC<
  React.ComponentProps<typeof Input> & { maxLength?: number }
> = ({ onChange, ...rest }) => (
  <Input
    {...rest}
    onChange={(e) => {
      const digitsOnly = e.target.value.replace(/\D/g, "");
      (e.target as HTMLInputElement).value = digitsOnly;
      onChange?.(e);
    }}
  />
);

const DataListInner: React.FC<DataListProps> = observer(
  ({
    value = [],
    onChange,
    fieldSource,
    addButtonText = "Add New",
    designMode,
    title,
    serviceCode,
    required,
    minItems,
    maxItems,
    uniqueLanguageRequired,
    editable,
    disabled,
    publicationNameCheckExclusions,
  }) => {
    const { t, i18n } = useTranslation();
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    const formilyField = useField() as unknown as FormilyFieldLike;
    const form = useForm();
    const fieldValue = useMemo(
      () =>
        (Array.isArray(formilyField.value)
          ? formilyField.value
          : value) as DataRecord[],
      [formilyField.value, value],
    );

    const [data, setData] = useState<DataRecord[]>(fieldValue);
    const [modalVisible, setModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [modalForm] = Form.useForm();
    const equipmentFormValue = Form.useWatch("equipment", modalForm);
    const materialTypeFormValue = Form.useWatch("material_type", modalForm);
    const currentProfileId = useUserStore((state) => state.currentProfileId);
    const userInfo = useUserStore((state) => state.userInfo);
    const isService302Mode = Number(serviceCode) === SERVICE_302;
    const isFormLocked =
      form?.pattern === "disabled" ||
      form?.pattern === "readOnly" ||
      form?.pattern === "readPretty";
    const isDisabled =
      Boolean(designMode) ||
      disabled === true ||
      editable === false ||
      formilyField.pattern === "disabled" ||
      formilyField.pattern === "readOnly" ||
      formilyField.pattern === "readPretty" ||
      isFormLocked;
    const showMaterialType = isMaterialList(fieldSource) || isService302Mode;
    const displayTitle =
      !title || title === "Data List" ? t("DataList.title") : title;
    const isListRequired = Boolean(required || formilyField.required);
    const displayAddButtonText =
      !addButtonText || addButtonText === "Add New"
        ? t("DataList.addNew")
        : addButtonText;
    const getDisplayFieldName = useCallback(
      (fieldName: string) =>
        FIELD_LABEL_KEYS[fieldName]
          ? t(FIELD_LABEL_KEYS[fieldName])
          : fieldName,
      [t],
    );
    const getDisplayPlaceholder = useCallback(
      (placeholder: string) =>
        PLACEHOLDER_KEYS[placeholder]
          ? t(PLACEHOLDER_KEYS[placeholder])
          : placeholder,
      [t],
    );
    const getDataSourceDisplayName = useCallback(
      (dataSource: string) => {
        const translationValue = DATA_LIST_DATA_SOURCE_VALUES.includes(
          dataSource as (typeof DATA_LIST_DATA_SOURCE_VALUES)[number],
        )
          ? dataSource
          : "unknown";
        return t(`DataList.dataSources.${translationValue}`);
      },
      [t],
    );
    const getEquipmentDisplayLabel = useCallback(
      (option: DropdownOption) => {
        const value = String(option.value);
        const translationValue = DATA_LIST_EQUIPMENT_VALUES.includes(
          value as (typeof DATA_LIST_EQUIPMENT_VALUES)[number],
        )
          ? value
          : "unknown";
        return t(`DataList.equipmentOptions.${translationValue}`);
      },
      [t],
    );
    const effectiveFieldSource = useMemo(() => {
      if (!isService302Mode || !fieldSource || !isMaterialList(fieldSource)) {
        return fieldSource;
      }

      const baseFields = Array.isArray(fieldSource.fields)
        ? fieldSource.fields
        : [];
      const hasTitleField = baseFields.some(
        (field) => field.fieldName === "Title",
      );
      const hasLanguageField = baseFields.some(
        (field) => field.fieldName === "Language",
      );
      const hasCountField = baseFields.some(
        (field) => field.fieldName === "Number Of Title",
      );

      return {
        ...fieldSource,
        fields: [
          ...(hasTitleField
            ? []
            : [
                {
                  fieldName: "Title",
                  fieldType: "string",
                  required: true,
                  placeholderText: "Enter Title",
                  listVisible: true,
                  formVisible: true,
                  displayType: "Text Input",
                },
              ]),
          ...(hasLanguageField
            ? []
            : [
                {
                  fieldName: "Language",
                  fieldType: "string",
                  required: true,
                  placeholderText: "Select Language",
                  listVisible: true,
                  formVisible: true,
                  displayType: "Dropdown",
                  options: [],
                },
              ]),
          ...(hasCountField
            ? []
            : [
                {
                  fieldName: "Number Of Title",
                  fieldType: "string",
                  required: true,
                  placeholderText: "Enter Number Of Title",
                  listVisible: true,
                  formVisible: true,
                  displayType: "Text Input",
                },
              ]),
          ...baseFields.filter((field) =>
            ["Title", "Language", "Number Of Title"].includes(field.fieldName),
          ),
        ],
      } as DataListSourceConfig;
    }, [fieldSource, isService302Mode]);
    const usesPublicationLanguageId = isMaterialList(effectiveFieldSource);
    const showLanguageId =
      isLanguagesNameList(effectiveFieldSource) || usesPublicationLanguageId;
    const languageRulesEnabled = isLanguagesNameList(effectiveFieldSource);
    const publicationNameValidationEnabled =
      languageRulesEnabled && isPublicationNameServiceCode(serviceCode);
    const traineeRulesEnabled = isListOfTrainees(effectiveFieldSource);
    const effectiveMinItems = resolveDataListMinItems({
      minItems,
      maxItems,
      dataSource: effectiveFieldSource?.dataSource,
      required: isListRequired,
      serviceCode,
      uniqueLanguageRequired,
    });
    const normalizedMaxItems = normalizeDataListMaxItems(maxItems);
    const dataListRulesConfigured =
      (languageRulesEnabled &&
        (effectiveMinItems !== undefined ||
          normalizedMaxItems !== undefined ||
          uniqueLanguageRequired === true)) ||
      traineeRulesEnabled;
    const reachedMinItems =
      effectiveMinItems !== undefined && data.length <= effectiveMinItems;
    const reachedMaxItems =
      (languageRulesEnabled || traineeRulesEnabled) &&
      hasReachedDataListMaxItems(data.length, normalizedMaxItems);

    useEffect(() => {
      if (!dataListRulesConfigured || !formilyField.setValidator) {
        return;
      }

      const existingValidators = withoutDataListRuleValidator(
        formilyField.validator,
      );
      const dataListRuleValidator: DataListRuleValidator = (nextValue) => {
        const violation = getDataListRuleViolation(nextValue, {
          minItems: languageRulesEnabled ? effectiveMinItems : minItems,
          maxItems,
          uniqueLanguageRequired,
          traineeRulesEnabled,
        });

        if (violation?.type === "maxItems") {
          return t("DataList.validation.maxItems", {
            max: violation.maxItems,
          });
        }
        if (violation?.type === "minItems") {
          return traineeRulesEnabled
            ? t("DataList.validation.minTrainees")
            : t("DataList.validation.minItems", {
                min: violation.minItems,
              });
        }
        if (violation?.type === "duplicateLanguage") {
          return t("DataList.validation.duplicateLanguage");
        }
        if (violation?.type === "duplicateEmiratesId") {
          return t("DataList.validation.duplicateEmiratesId");
        }
        if (
          violation?.type === "duplicateEmail" ||
          violation?.type === "duplicateMobile"
        ) {
          return t("DataList.validation.duplicateTrainee");
        }
        return "";
      };
      dataListRuleValidator[DATA_LIST_RULE_VALIDATOR] = true;

      formilyField.setValidator([
        dataListRuleValidator,
        ...existingValidators,
      ]);

      return () => {
        const currentValidator = formilyField.validator;
        const nextValidators = withoutDataListRuleValidator(currentValidator);
        const currentValidators = Array.isArray(currentValidator)
          ? currentValidator
          : currentValidator
            ? [currentValidator]
            : [];
        if (nextValidators.length !== currentValidators.length) {
          formilyField.setValidator?.(
            nextValidators.length > 0 ? nextValidators : undefined,
          );
        }
      };
    }, [
      formilyField,
      dataListRulesConfigured,
      effectiveMinItems,
      languageRulesEnabled,
      maxItems,
      minItems,
      t,
      traineeRulesEnabled,
      uniqueLanguageRequired,
    ]);

    const equipmentOptions = useMemo(
      () => getEquipmentOptions(effectiveFieldSource),
      [effectiveFieldSource],
    );
    const [materialTypeItemsRaw, setMaterialTypeItemsRaw] = useState<
      MaterialTypeLookupItem[]
    >([]);
    const [materialTypesLoading, setMaterialTypesLoading] = useState(false);
    const [languageItemsRaw, setLanguageItemsRaw] = useState<RawLookupItem[]>(
      [],
    );
    const [languagesLoading, setLanguagesLoading] = useState(false);
    const [languagesLoadFailed, setLanguagesLoadFailed] = useState(false);
    const [publicationNameChecking, setPublicationNameChecking] =
      useState(false);
    const languagesRequestedRef = useRef(false);
    const languagesRequestInFlightRef = useRef(false);
    const languagesMountedRef = useRef(true);
    // One retry per modal open. Without this the failure path below would
    // re-trigger itself through its own state update while the modal stays
    // open, hammering a down endpoint.
    const languagesRetriedForOpenRef = useRef(false);
    const materialTypeOptions = useMemo<MaterialTypeOption[]>(
      () =>
        materialTypeItemsRaw
          .map((item) => ({
            value: String(item.id),
            label:
              getLocalizedName(item as unknown as RawLookupItem, isAr) ||
              item.code ||
              String(item.id),
            saveLabel:
              item.nameEn || item.nameAr || item.code || String(item.id),
            code: item.code,
          }))
          .filter((item) => {
            if (!isService302Mode) {
              return true;
            }

            const normalizedCode = String(item.code || "").toUpperCase();
            if (!SERVICE302_ALLOWED_OTHER_MATERIAL_CODES.has(normalizedCode)) {
              return false;
            }

            return normalizedCode !== "BK";
          }),
      [isAr, isService302Mode, materialTypeItemsRaw],
    );
    const languageSelectOptions = useMemo<LanguageOption[]>(
      () =>
        languageItemsRaw
          .filter((item) => item?.id != null && normalizeText(item.nameEn))
          .map((item) => ({
            value: Number(item.id),
            label: getLocalizedName(item, isAr) || normalizeText(item.nameEn),
            saveLabel: normalizeText(item.nameEn),
          })),
      [isAr, languageItemsRaw],
    );
    // Lookup options that feed the modal's dropdowns. While any of them is
    // still in flight the modal cannot produce a correct record (the Select is
    // empty, so language/material resolution and the duplicate checks below
    // would run against an incomplete option list), which is what made users
    // reopen the modal to see the real result. Block Confirm until it settles.
    const modalLookupsLoading =
      !designMode &&
      ((showLanguageId && languagesLoading) ||
        (showMaterialType && materialTypesLoading));

    const currentUserTypeId = useMemo(() => {
      if (!currentProfileId) return "";

      const establishmentUserType = userInfo.userEstablishments?.find(
        (item) => String(item.userProfileId) === String(currentProfileId),
      )?.userTypeId;
      if (establishmentUserType) {
        return String(establishmentUserType);
      }

      if (
        userInfo.userInvitation?.userProfileId &&
        String(userInfo.userInvitation.userProfileId) ===
          String(currentProfileId)
      ) {
        return String(userInfo.userInvitation.userTypeId || "");
      }

      return "";
    }, [
      currentProfileId,
      userInfo.userEstablishments,
      userInfo.userInvitation,
    ]);

    useEffect(() => {
      if (designMode) {
        if (
          effectiveFieldSource?.fields &&
          effectiveFieldSource.fields.length > 0
        ) {
          const rows: DataRecord[] = [];
          for (let r = 0; r < 3; r++) {
            const row: DataRecord = {};
            effectiveFieldSource.fields.forEach((field) => {
              const key = getFieldKey(field);
              if (field.displayType === "Dropdown" && field.options?.[0]) {
                row[key] = field.options[r % field.options.length]?.value || "";
              } else {
                row[key] = `Sample ${field.fieldName} ${r + 1}`;
              }
            });
            rows.push(row);
          }
          if (!areDataRecordsEqual(data, rows)) {
            setData(rows);
          }
        } else {
          if (data.length > 0) {
            setData([]);
          }
        }
      } else {
        // Seed a stable per-row id on load so a later diff can tell "row edited"
        // apart from "row deleted + row added" (see ensureDataListRowIds).
        const normalized = ensureDataListRowIds(
          normalizeEquipmentData(fieldValue || [], effectiveFieldSource),
          effectiveFieldSource?.dataSource,
        );
        if (!areDataRecordsEqual(data, normalized)) {
          setData(normalized);
        }
        if (!areDataRecordsEqual(normalized, fieldValue || [])) {
          formilyField.setValue?.(normalized);
          onChange?.(normalized);
        }
      }
    }, [
      data,
      fieldValue,
      designMode,
      effectiveFieldSource,
      formilyField,
      onChange,
    ]);

    useEffect(() => {
      // Pair mount with unmount: the flag gates every setState below, so a
      // remount that never restores it would discard all responses and leave
      // the dropdown permanently empty.
      languagesMountedRef.current = true;
      return () => {
        languagesMountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      if (designMode || !showLanguageId) {
        return;
      }

      if (!modalVisible) {
        languagesRetriedForOpenRef.current = false;
      }

      const shouldPreload = !languagesRequestedRef.current;
      // A failed attempt is not "already loaded": retry it on open even when a
      // stale list is still around, otherwise the user has to close and reopen
      // the modal to ever see the real options.
      const shouldRetryOnOpen =
        modalVisible &&
        !languagesRetriedForOpenRef.current &&
        (languageItemsRaw.length === 0 || languagesLoadFailed);
      if (
        !shouldPreload &&
        (!shouldRetryOnOpen || languagesRequestInFlightRef.current)
      ) {
        return;
      }

      if (!shouldPreload) {
        languagesRetriedForOpenRef.current = true;
      }
      languagesRequestedRef.current = true;
      languagesRequestInFlightRef.current = true;
      setLanguagesLoadFailed(false);
      setLanguagesLoading(true);

      getLanguages()
        .then((res) => {
          if (!languagesMountedRef.current) return;
          const list = Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data?: RawLookupItem[] }).data ?? []
            : [];
          setLanguageItemsRaw(list);
        })
        .catch(() => {
          if (languagesMountedRef.current) {
            // Keep whatever loaded successfully before: blanking the list on a
            // failed retry would take a working dropdown away from the user.
            setLanguagesLoadFailed(true);
          }
        })
        .finally(() => {
          languagesRequestInFlightRef.current = false;
          if (languagesMountedRef.current) {
            setLanguagesLoading(false);
          }
        });
    }, [
      designMode,
      languageItemsRaw.length,
      languagesLoadFailed,
      modalVisible,
      showLanguageId,
    ]);

    useEffect(() => {
      if (designMode || !showMaterialType || !currentUserTypeId) {
        return;
      }

      let cancelled = false;
      setMaterialTypesLoading(true);

      getMaterialTypes(currentUserTypeId)
        .then((res: { data?: MaterialTypeLookupItem[] }) => {
          if (cancelled) return;
          setMaterialTypeItemsRaw(Array.isArray(res?.data) ? res.data : []);
        })
        .catch(() => {
          if (!cancelled) {
            setMaterialTypeItemsRaw([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setMaterialTypesLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [currentUserTypeId, designMode, showMaterialType]);

    const triggerChange = useCallback(
      (next: DataRecord[]) => {
        setData(next);
        formilyField.setValue?.(next);
        onChange?.(next);
        if (formilyField.selfErrors?.length) {
          void formilyField.validate?.();
        }
      },
      [formilyField, onChange],
    );

    useEffect(() => {
      if (
        designMode ||
        !usesPublicationLanguageId ||
        !languageSelectOptions.length ||
        !data.length
      ) {
        return;
      }

      let changed = false;
      const normalized = data.map((record) => {
        const option =
          findLanguageOption(record.languageId, languageSelectOptions) ||
          findLanguageOption(record.language, languageSelectOptions);
        if (!option) return record;

        const languageId = Number(option.value);
        if (
          record.language === languageId &&
          record.languageId === languageId
        ) {
          return record;
        }

        changed = true;
        return { ...record, language: languageId, languageId };
      });

      if (changed) {
        triggerChange(normalized);
      }
    }, [
      data,
      designMode,
      languageSelectOptions,
      triggerChange,
      usesPublicationLanguageId,
    ]);

    const openAddModal = useCallback(() => {
      if (designMode || isDisabled || reachedMaxItems) return;
      setEditingIndex(null);
      modalForm.resetFields();
      setModalVisible(true);
    }, [designMode, isDisabled, modalForm, reachedMaxItems]);

    const openEditModal = useCallback(
      (record: DataRecord, index: number) => {
        if (designMode || isDisabled) return;
        setEditingIndex(index);
        modalForm.resetFields();
        const formValues = { ...record };
        if (isEquipmentList(effectiveFieldSource)) {
          const opt =
            findEquipmentOption(
              getEquipmentIdValue(record),
              equipmentOptions,
            ) || findEquipmentOption(record.equipment, equipmentOptions);
          if (opt) {
            formValues.equipment = opt.value;
            formValues.equipmentId = Number(opt.value);
            formValues.photoEquipmentId = Number(opt.value);
            formValues.PhotoEquipmentId = Number(opt.value);
          }
        }
        if (showMaterialType) {
          const materialTypeOption =
            findMaterialTypeOption(
              record.materialTypeId,
              materialTypeOptions,
            ) ||
            findMaterialTypeOption(record.material_type, materialTypeOptions) ||
            findMaterialTypeOption(
              record.materialTypeCode,
              materialTypeOptions,
            );
          if (materialTypeOption) {
            formValues.material_type = materialTypeOption.value;
            formValues.materialTypeId = Number(materialTypeOption.value);
            if (materialTypeOption.code !== undefined) {
              formValues.materialTypeCode = materialTypeOption.code;
            } else {
              delete formValues.materialTypeCode;
            }
          } else if (
            record.materialTypeId != null &&
            record.materialTypeId !== ""
          ) {
            formValues.material_type = String(record.materialTypeId);
            formValues.materialTypeId = Number(record.materialTypeId);
            if (typeof record.materialTypeCode === "string") {
              formValues.materialTypeCode = record.materialTypeCode;
            } else {
              delete formValues.materialTypeCode;
            }
          }
        }
        if (showLanguageId) {
          const languageOption =
            findLanguageOption(record.languageId, languageSelectOptions) ||
            findLanguageOption(record.language, languageSelectOptions);
          if (languageOption) {
            formValues.language = Number(languageOption.value);
            formValues.languageId = Number(languageOption.value);
          } else {
            Object.assign(
              formValues,
              getDataListLanguageEditFallback(record),
            );
          }
        }
        modalForm.setFieldsValue(formValues);
        setModalVisible(true);
      },
      [
        designMode,
        effectiveFieldSource,
        equipmentOptions,
        modalForm,
        isDisabled,
        languageSelectOptions,
        materialTypeOptions,
        showLanguageId,
        showMaterialType,
      ],
    );

    const confirmDelete = useCallback(
      (index: number) => {
        if (designMode || isDisabled) return;
        if (reachedMinItems) return;
        setDeletingIndex(index);
        setDeleteModalVisible(true);
      },
      [designMode, isDisabled, reachedMinItems],
    );

    const handleDeleteConfirm = useCallback(() => {
      if (isDisabled) return;
      if (deletingIndex == null) return;
      if (reachedMinItems) {
        setDeleteModalVisible(false);
        setDeletingIndex(null);
        CustomMessage.warning(
          t("DataList.validation.minItemsDeleteTooltip", {
            min: effectiveMinItems,
          }),
        );
        return;
      }
      const next = data.filter((_, i) => i !== deletingIndex);
      triggerChange(next);
      setDeleteModalVisible(false);
      setDeletingIndex(null);
      if (next.length > 0 && (currentPage - 1) * PAGE_SIZE >= next.length) {
        setCurrentPage(Math.max(1, Math.ceil(next.length / PAGE_SIZE)));
      }
    }, [
      currentPage,
      data,
      deletingIndex,
      effectiveMinItems,
      isDisabled,
      reachedMinItems,
      t,
      triggerChange,
    ]);

    const handleOk = async () => {
      if (isDisabled) return;
      // Guards the keyboard/Enter path too, not just the disabled button.
      if (modalLookupsLoading || publicationNameChecking) return;
      if (editingIndex == null && reachedMaxItems) {
        CustomMessage.error(
          t("DataList.validation.maxItems", { max: maxItems }),
        );
        return;
      }
      try {
        const values = await modalForm.validateFields();
        const item: DataRecord = { ...values };
        if (typeof item.title === "string") {
          item.title = item.title.trim();
        }
        if (typeof item.suggested_name === "string") {
          item.suggested_name = normalizePublicationName(
            item.suggested_name,
          );
        }
        if (isListOfTrainees(effectiveFieldSource)) {
          // Persist trainee records under the fixed keys carried by fieldKey
          // (fullName/emiratesIdNumber/mobileNumber/email) and trim string
          // values before saving. Field-level format validation is added in T3.
          (["fullName", "mobileNumber", "email"] as const).forEach((key) => {
            if (typeof item[key] === "string") {
              item[key] = (item[key] as string).trim();
            }
          });
          if (typeof item.emiratesIdNumber === "string") {
            item.emiratesIdNumber = item.emiratesIdNumber.trim();
          }
        }
        if (isEquipmentList(effectiveFieldSource)) {
          const opt = findEquipmentOption(values.equipment, equipmentOptions);
          if (opt) {
            item.equipment = opt.label;
            item.equipmentId = Number(opt.value);
            item.photoEquipmentId = Number(opt.value);
            item.PhotoEquipmentId = Number(opt.value);
            item.photoEquipmentNameEn = opt.label;
            if (opt.value === OTHER_EQUIPMENT_VALUE) {
              const description = String(values.description ?? "").trim();
              item.description = description;
              item.Description = description;
              item.otherText = description;
            } else {
              delete item.description;
              delete item.Description;
              delete item.otherText;
            }
          }
        }
        if (showMaterialType) {
          const opt = findMaterialTypeOption(
            values.material_type,
            materialTypeOptions,
          );
          if (opt) {
            item.material_type = opt.saveLabel ?? opt.label;
            item.materialTypeId = Number(opt.value);
            item.materialTypeCode = opt.code ?? "";
          }
        }
        if (showLanguageId) {
          const opt = findLanguageOption(
            values.language,
            languageSelectOptions,
          );
          if (opt) {
            item.language = usesPublicationLanguageId
              ? Number(opt.value)
              : opt.saveLabel ?? opt.label;
            item.languageId = Number(opt.value);
          } else if (editingIndex != null) {
            const originalRecord = data[editingIndex];
            if (originalRecord) {
              Object.assign(
                item,
                getDataListStoredLanguageFields(originalRecord),
              );
            }
          }
        }

        if (
          publicationNameValidationEnabled &&
          isDuplicateDataListPublicationName(data, item, editingIndex)
        ) {
          modalForm.setFields([
            {
              name: "suggested_name",
              errors: [t("DataList.validation.duplicatePublicationName")],
            },
          ]);
          return;
        }

        if (publicationNameValidationEnabled) {
          setPublicationNameChecking(true);
          try {
            const response = await checkPublicationNameExists({
              serviceCode: String(serviceCode).trim(),
              name: String(item.suggested_name),
              ...publicationNameCheckExclusions,
            });
            const result = response?.data;

            if (
              response?.isSuccess !== true ||
              typeof result?.exists !== "boolean" ||
              typeof result.normalizedName !== "string" ||
              !normalizePublicationName(result.normalizedName)
            ) {
              throw new Error("Invalid publication name check response.");
            }

            if (result.exists) {
              modalForm.setFields([
                {
                  name: "suggested_name",
                  errors: [
                    t("DataList.validation.duplicatePublicationName"),
                  ],
                },
              ]);
              return;
            }

            item.suggested_name = normalizePublicationName(
              result.normalizedName,
            );
          } catch (error) {
            console.error("Failed to check publication name:", error);
            modalForm.setFields([
              {
                name: "suggested_name",
                errors: [t("DataList.validation.publicationNameCheckFailed")],
              },
            ]);
            return;
          } finally {
            setPublicationNameChecking(false);
          }
        }

        if (
          languageRulesEnabled &&
          uniqueLanguageRequired === true &&
          isDuplicateDataListLanguage(data, item, editingIndex)
        ) {
          modalForm.setFields([
            {
              name: "language",
              errors: [t("DataList.validation.duplicateLanguage")],
            },
          ]);
          return;
        }

        if (traineeRulesEnabled) {
          if (isDuplicateTraineeEmiratesId(data, item, editingIndex)) {
            modalForm.setFields([
              {
                name: "emiratesIdNumber",
                errors: [t("DataList.validation.duplicateEmiratesId")],
              },
            ]);
            return;
          }
          if (isDuplicateTraineeEmail(data, item, editingIndex)) {
            modalForm.setFields([
              {
                name: "email",
                errors: [t("DataList.validation.duplicateTrainee")],
              },
            ]);
            return;
          }
          if (isDuplicateTraineeMobile(data, item, editingIndex)) {
            modalForm.setFields([
              {
                name: "mobileNumber",
                errors: [t("DataList.validation.duplicateTrainee")],
              },
            ]);
            return;
          }
        }

        if (isService302Mode) {
          const duplicateKey = createService302MaterialDuplicateKey(
            item as Record<string, unknown>,
          );
          const hasDuplicate = data.some((row, index) => {
            if (editingIndex != null && index === editingIndex) {
              return false;
            }
            return (
              createService302MaterialDuplicateKey(
                row as Record<string, unknown>,
              ) === duplicateKey
            );
          });

          if (hasDuplicate) {
            CustomMessage.error(t("DataList.validation.duplicateMaterial"));
            return;
          }
        }

        if (dataListUsesRowIds(effectiveFieldSource?.dataSource)) {
          // Editing keeps the original row identity; Add always mints a new one,
          // so a delete-then-add at the same position is never mistaken for an
          // in-place edit by the modify change summary.
          const existingRowId =
            editingIndex != null ? getDataListRowId(data[editingIndex] ?? {}) : "";
          item[DATA_LIST_ROW_ID_KEY] = existingRowId || createDataListRowId();
        }

        const next = [...data];
        if (editingIndex != null) {
          next[editingIndex] = item;
        } else {
          next.push(item);
        }
        triggerChange(next);
        setModalVisible(false);
        if (editingIndex == null) {
          setCurrentPage(Math.ceil(next.length / PAGE_SIZE));
        }
      } catch {
        // validation failed
      }
    };

    const columns = useMemo(() => {
      const cols: ColumnsType<DataRecord> = [];

      if (showMaterialType) {
        const hasMaterialTypeColumn = cols.some(
          (col) => col.key === "material_type",
        );
        if (!hasMaterialTypeColumn) {
          cols.push({
            title: t("DataList.materialType"),
            dataIndex: "material_type",
            key: "material_type",
            ellipsis: true,
            render: (_: string | number | boolean, record: DataRecord) =>
              getMaterialTypeDisplayValue(record, materialTypeOptions),
          });
        }
      }

      if (effectiveFieldSource?.fields) {
        effectiveFieldSource.fields
          .filter((field) => field.listVisible)
          .forEach((field) => {
            const key = getFieldKey(field);
            const useOverflowTooltip = isLanguageNameListField(
              field.fieldName,
            );
            const columnWidth = isLanguagesNameList(effectiveFieldSource)
              ? getLanguageNameListColumnWidth(field.fieldName)
              : undefined;
            const renderValue = (displayValue: string | number | boolean) =>
              useOverflowTooltip ? (
                <DataListOverflowValue value={displayValue} />
              ) : (
                displayValue
              );
            cols.push({
              title: getDisplayFieldName(field.fieldName),
              dataIndex: key,
              key,
              width: columnWidth,
              ...(!useOverflowTooltip ? { ellipsis: true } : {}),
              render: (val: string | number | boolean, record: DataRecord) => {
                if (
                  field.fieldName === "Equipment" &&
                  isEquipmentList(effectiveFieldSource)
                ) {
                  const opts = field.options || [];
                  const opt =
                    findEquipmentOption(val, opts) ||
                    findEquipmentOption(getEquipmentIdValue(record), opts) ||
                    findEquipmentOption(record.equipment, opts);
                  const baseLabel = opt
                    ? getEquipmentDisplayLabel(opt)
                    : String(val ?? "");
                  const isOther =
                    opt?.value === OTHER_EQUIPMENT_VALUE ||
                    String(getEquipmentIdValue(record)) ===
                      OTHER_EQUIPMENT_VALUE ||
                    opt?.label === "Other";
                  const desc =
                    typeof getEquipmentDescriptionValue(record) === "string"
                      ? String(getEquipmentDescriptionValue(record)).trim()
                      : "";
                  if (isOther && desc) {
                    return renderValue(
                      `${t("DataList.equipmentOptions.12")} - ${desc}`,
                    );
                  }
                  return renderValue(baseLabel || val);
                }
                if (field.displayType === "Emirates ID") {
                  return renderValue(formatEmiratesIdForDisplay(val));
                }
                if (field.displayType === "Dropdown") {
                  const opts: DropdownOption[] =
                    field.fieldName === "Language" &&
                    showLanguageId
                      ? languageSelectOptions
                      : field.fieldName === "Language"
                      ? (languageOptions as DropdownOption[])
                      : field.options || [];
                  const opt =
                    field.fieldName === "Language" &&
                    showLanguageId
                      ? findLanguageOption(
                          record.languageId ?? val,
                          opts as LanguageOption[],
                        ) ||
                        findLanguageOption(
                          record.language,
                          opts as LanguageOption[],
                        )
                      : opts?.find((o) => o.value === val);
                  return renderValue(opt?.label || val);
                }
                return renderValue(val);
              },
            });
          });
      }

      if (!isDisabled) {
        cols.push({
          title: t("DataList.actions"),
          key: "actions",
          width: 140,
          render: (_: unknown, record: DataRecord, index: number) => {
            const realIndex = (currentPage - 1) * PAGE_SIZE + index;
            return (
              <span className="datalist-actions">
                <a
                  className="action-edit"
                  onClick={() => openEditModal(record, realIndex)}
                >
                  {t("DataList.edit")}
                </a>
                <Tooltip
                  title={
                    reachedMinItems && effectiveMinItems !== undefined
                      ? t("DataList.validation.minItemsDeleteTooltip", {
                          min: effectiveMinItems,
                        })
                      : undefined
                  }
                >
                  <span
                    className={`datalist-action-delete__tooltip-trigger${
                      reachedMinItems
                        ? " datalist-action-delete__tooltip-trigger--disabled"
                        : ""
                    }`}
                    tabIndex={reachedMinItems ? 0 : undefined}
                  >
                    <a
                      className={`action-delete${
                        reachedMinItems ? " action-delete--disabled" : ""
                      }`}
                      aria-disabled={reachedMinItems}
                      onClick={
                        reachedMinItems
                          ? undefined
                          : () => confirmDelete(realIndex)
                      }
                    >
                      {t("DataList.delete")}
                    </a>
                  </span>
                </Tooltip>
              </span>
            );
          },
        });
      }

      return cols;
    }, [
      effectiveFieldSource,
      currentPage,
      getDisplayFieldName,
      getEquipmentDisplayLabel,
      isDisabled,
      openEditModal,
      confirmDelete,
      effectiveMinItems,
      languageSelectOptions,
      showLanguageId,
      materialTypeOptions,
      reachedMinItems,
      showMaterialType,
      t,
    ]);

    const handleEquipmentChange = useCallback(
      (val: string) => {
        const opt = findEquipmentOption(val, equipmentOptions);
        if (opt) {
          modalForm.setFieldsValue({
            equipmentId: Number(opt.value),
            photoEquipmentId: Number(opt.value),
            PhotoEquipmentId: Number(opt.value),
          });
        }
        if (val !== OTHER_EQUIPMENT_VALUE) {
          modalForm.setFieldsValue({
            description: undefined,
            Description: undefined,
            otherText: undefined,
          });
        }
      },
      [equipmentOptions, modalForm],
    );

    const selectedMaterialTypeOption = useMemo(
      () => findMaterialTypeOption(materialTypeFormValue, materialTypeOptions),
      [materialTypeFormValue, materialTypeOptions],
    );

    const shouldRequireService302Title =
      !isService302Mode || selectedMaterialTypeOption?.code !== "MG";

    const renderFormItems = () => {
      if (!effectiveFieldSource?.fields) return null;
      const showEquipmentId = isEquipmentList(effectiveFieldSource);
      return (
        <Row gutter={24}>
          {showEquipmentId && (
            <>
              <Form.Item name="equipmentId" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="photoEquipmentId" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="PhotoEquipmentId" hidden>
                <Input />
              </Form.Item>
            </>
          )}
          {showLanguageId && (
            <Form.Item name="languageId" hidden>
              <Input />
            </Form.Item>
          )}
          {showMaterialType && (
            <>
              <Form.Item name="materialTypeId" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="materialTypeCode" hidden>
                <Input />
              </Form.Item>
              <Col span={12} key="material_type">
                <Form.Item
                  label={t("DataList.materialType")}
                  name="material_type"
                  rules={[
                    {
                      required: true,
                      message: t("DataList.validation.selectMaterialType"),
                    },
                  ]}
                >
                  <Select
                    placeholder={t("DataList.placeholders.selectMaterialType")}
                    loading={materialTypesLoading}
                    showSearch
                    options={materialTypeOptions}
                    optionFilterProp="label"
                  />
                </Form.Item>
              </Col>
            </>
          )}
          {effectiveFieldSource.fields
            .filter((field) => field.formVisible)
            .flatMap((field) => {
              const key = getFieldKey(field);
              const isEquipmentField =
                field.fieldName === "Equipment" && showEquipmentId;
              const isTitleField = field.fieldName === "Title";
              const isNumericField = [
                "Number",
                "Number Of Title",
                "Quantity",
              ].includes(field.fieldName);
              const isLanguageField = field.fieldName === "Language";
              const isDropdownField = field.displayType === "Dropdown";
              const isTraineeField = isListOfTrainees(effectiveFieldSource);
              const isEmiratesIdField = field.displayType === "Emirates ID";
              const isEmailField = field.displayType === "Email";
              const isMobileField = field.displayType === "Mobile";
              const traineeRules =
                isTraineeField && field.required
                  ? [
                      {
                        validator: (_rule: unknown, value: unknown) => {
                          const text = String(value ?? "").trim();
                          // Emptiness is owned by the `required` rule above;
                          // reporting it here too duplicated the message.
                          if (!text) {
                            return Promise.resolve();
                          }
                          if (field.fieldName === "Full Name") {
                            if (text.length > FULL_NAME_MAX_LENGTH) {
                              return Promise.reject(
                                new Error(
                                  t("DataList.validation.maxChars", {
                                    max: FULL_NAME_MAX_LENGTH,
                                  }),
                                ),
                              );
                            }
                          } else if (isEmiratesIdField) {
                            if (!EMIRATES_ID_REGEX.test(text)) {
                              return Promise.reject(
                                new Error(
                                  t("DataList.validation.invalidEmiratesId"),
                                ),
                              );
                            }
                          } else if (isMobileField) {
                            // Format validity is enforced by
                            // createMobileNumberFormRule (appended below), which
                            // shares libphonenumber-js with the input component.
                            return Promise.resolve();
                          } else if (isEmailField) {
                            if (text.length > EMAIL_MAX_LENGTH) {
                              return Promise.reject(
                                new Error(
                                  t("DataList.validation.emailMaxChars", {
                                    max: EMAIL_MAX_LENGTH,
                                  }),
                                ),
                              );
                            }
                            if (!EMAIL_REGEX.test(text)) {
                              return Promise.reject(
                                new Error(
                                  t("DataList.validation.invalidEmail"),
                                ),
                              );
                            }
                          }
                          return Promise.resolve();
                        },
                      },
                      // Single-field mode stores one international string, so the
                      // rule needs no countryCodeField. `required` also rejects
                      // the dial-code-only intermediate value (e.g. "+971").
                      ...(isMobileField
                        ? [createMobileNumberFormRule({ required: true })]
                        : []),
                    ]
                  : [];
              const isTitleRequired = isTitleField
                ? shouldRequireService302Title
                : field.required;
              const mainCol = (
                <Col span={12} key={key}>
                  <Form.Item
                    label={getDisplayFieldName(field.fieldName)}
                    name={key}
                    validateTrigger={
                      isLanguageField ? "onChange" : undefined
                    }
                    // Stop at the first failing rule. Several rules can reject
                    // the same value (e.g. `required` plus a type-specific
                    // validator), which otherwise stacks duplicate messages
                    // under one field.
                    validateFirst
                    rules={[
                      {
                        required: isTitleRequired,
                        ...(isTitleRequired && field.displayType !== "Dropdown"
                          ? { whitespace: true }
                          : {}),
                        message:
                          field.displayType === "Dropdown"
                            ? t("DataList.validation.requiredSelect", {
                                field: getDisplayFieldName(field.fieldName),
                              })
                            : t("DataList.validation.requiredEnter", {
                                field: getDisplayFieldName(field.fieldName),
                              }),
                      },
                      ...(isLanguageField &&
                        languageRulesEnabled &&
                        uniqueLanguageRequired === true
                        ? [
                            {
                              validator: (
                                _rule: unknown,
                                value: unknown,
                              ) => {
                                if (
                                  typeof value !== "string" &&
                                  typeof value !== "number"
                                ) {
                                  return Promise.resolve();
                                }
                                const selectedLanguageOption =
                                  findLanguageOption(
                                    value,
                                    languageSelectOptions,
                                  );
                                if (!selectedLanguageOption) {
                                  return Promise.resolve();
                                }
                                const languageCandidate =
                                  createDataListLanguageCandidate(
                                    selectedLanguageOption,
                                  );
                                if (
                                  isDuplicateDataListLanguage(
                                    data,
                                    languageCandidate,
                                    editingIndex,
                                  )
                                ) {
                                  return Promise.reject(
                                    new Error(
                                      t(
                                        "DataList.validation.duplicateLanguage",
                                      ),
                                    ),
                                  );
                                }
                                return Promise.resolve();
                              },
                            },
                          ]
                        : []),
                      ...traineeRules,
                      ...(["Suggested Name", "Title"].includes(field.fieldName)
                        ? [
                            {
                              validator: (_rule: unknown, value: unknown) => {
                                if (
                                  typeof value === "string" &&
                                  value.length > 0 &&
                                  value.trim().length === 0
                                ) {
                                  return Promise.reject(
                                    new Error(
                                      t("DataList.validation.requiredEnter", {
                                        field: getDisplayFieldName(
                                          field.fieldName,
                                        ),
                                      }),
                                    ),
                                  );
                                }
                                return Promise.resolve();
                              },
                            },
                            {
                              pattern: /^.{0,200}$/,
                              message: t("DataList.validation.maxChars", {
                                max: 200,
                              }),
                            },
                          ]
                        : []),
                      ...(isNumericField
                        ? [
                            {
                              pattern: /^[1-9]\d{0,4}$/,
                              message: t("DataList.validation.naturalNumber"),
                            },
                          ]
                        : []),
                    ]}
                  >
                    {isDropdownField ? (
                      <Select
                        {...SEARCHABLE_CHILDREN_SELECT_PROPS}
                        placeholder={getDisplayPlaceholder(
                          field.placeholderText,
                        )}
                        onChange={
                          isEquipmentField ? handleEquipmentChange : undefined
                        }
                        loading={
                          isLanguageField && showLanguageId
                            ? languagesLoading
                            : false
                        }
                      >
                        {(
                          (isLanguageField
                            ? showLanguageId
                              ? languageSelectOptions
                              : (languageOptions as DropdownOption[])
                            : isEquipmentField
                            ? equipmentOptions
                            : field.options || []) as DropdownOption[]
                        ).map((opt) => (
                          <Select.Option key={opt.value} value={opt.value}>
                            {isEquipmentField
                              ? getEquipmentDisplayLabel(opt)
                              : opt.label}
                          </Select.Option>
                        ))}
                      </Select>
                    ) : isNumericField ? (
                      <NumberOnlyInput
                        placeholder={getDisplayPlaceholder(
                          field.placeholderText,
                        )}
                        maxLength={15}
                      />
                    ) : isEmiratesIdField ? (
                      <EmiratesIdInput
                        // Matches the other Emirates ID call sites in the
                        // project (IndividualIdentityForm / OcrModal): the
                        // placeholder shows the mask sample and the input
                        // renders the interactive 784-9999-9999999-9 template.
                        showInteractiveMask
                        placeholder={getDisplayPlaceholder(
                          field.placeholderText,
                        )}
                      />
                    ) : isMobileField ? (
                      <FormMobileNumberInput
                        singlePhoneField
                        // Fallback only: applied when the field is empty (Add
                        // Trainee), so a stored number keeps its own dial code
                        // when editing (see splitInternationalMobileNumber).
                        defaultCountryCode={DEFAULT_COUNTRY_DIAL_CODE}
                        placeholder={getDisplayPlaceholder(
                          field.placeholderText,
                        )}
                        searchPlaceholder={t("formPlaceholders.common.search")}
                        emptyText={t("multiSelectDropdown.noResults")}
                        getPopupContainer={() => document.body}
                      />
                    ) : isEmailField ? (
	                      <Input
	                        placeholder={getDisplayPlaceholder(
	                          field.placeholderText,
	                        )}
	                        maxLength={EMAIL_MAX_LENGTH}
	                      />
                    ) : (
	                      <Input
	                        placeholder={getDisplayPlaceholder(
	                          field.placeholderText,
	                        )}
	                      />
                    )}
                  </Form.Item>
                </Col>
              );
              if (
                isEquipmentField &&
                equipmentFormValue === OTHER_EQUIPMENT_VALUE
              ) {
                return [
                  mainCol,
                  <Col span={12} key="equipment-other-description">
                    <Form.Item
                      label={t("DataList.description")}
                      name="description"
                      rules={[
                        {
                          required: true,
                          message: t("DataList.validation.enterDescription"),
                        },
                        {
                          pattern: /^.{1,100}$/,
                          message: t("DataList.validation.maxChars", {
                            max: 100,
                          }),
                        },
                      ]}
                    >
                      <Input
                        placeholder={t(
                          "DataList.placeholders.describeEquipment",
                        )}
                        maxLength={100}
                      />
                    </Form.Item>
                  </Col>,
                ];
              }
              return [mainCol];
            })}
        </Row>
      );
    };

    const getModalTitle = () => {
      if (editingIndex != null) return t("DataList.edit");
      if (effectiveFieldSource?.dataSource) {
        return t("DataList.modal.addNewTyped", {
          type: getDataSourceDisplayName(effectiveFieldSource.dataSource),
        });
      }
      return t("DataList.addNew");
    };

    const pagedData = useMemo<TableDataRecord[]>(() => {
      const start = (currentPage - 1) * PAGE_SIZE;
      return data.slice(start, start + PAGE_SIZE).map((record, index) => ({
        ...record,
        __dataListRowKey: `row-${start + index}`,
      }));
    }, [data, currentPage]);

    const hasConfig =
      effectiveFieldSource?.fields && effectiveFieldSource.fields.length > 0;
    const maxItemsReachedTooltip =
      reachedMaxItems && normalizedMaxItems !== undefined
        ? t("DataList.validation.maxItemsReachedTooltip", {
            max: normalizedMaxItems,
          })
        : undefined;

    return (
      <div className="datalist-wrapper">
        <AntdCard
          title={
            <div className="datalist-inner-header">
              <div
                className="datalist-inner-title"
                data-content-editable="x-component-props.title"
              >
                {" "}
                  {displayTitle}
                {isListRequired && (
                  <span className="datalist-inner-required">*</span>
                )}
                <FieldDecoratorTooltip fallbackContent={null} placement="top" />
              </div>
              {!isDisabled && !designMode && (
                <Tooltip
                  title={maxItemsReachedTooltip}
                  placement="top"
                >
                  <span
                    className={`datalist-add-button__tooltip-trigger${
                      reachedMaxItems
                        ? " datalist-add-button__tooltip-trigger--disabled"
                        : ""
                    }`}
                    tabIndex={reachedMaxItems ? 0 : undefined}
                  >
                    <Button
                      type="primary"
                      className="datalist-add-btn"
                      onClick={openAddModal}
                      disabled={!hasConfig || reachedMaxItems}
                    >
                      {displayAddButtonText}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>
          }
          className="datalist-card"
        >
          {hasConfig ? (
            <>
              {data.length > 0 ? (
                <>
                  <Table
                    rowKey="__dataListRowKey"
                    columns={columns}
                    dataSource={pagedData}
                    pagination={false}
                    className="datalist-table"
                    tableLayout="fixed"
                    scroll={
                      isLanguagesNameList(effectiveFieldSource)
                        ? undefined
                        : { x: true }
                    }
                  />
                  {data.length > PAGE_SIZE && (
                    <div className="datalist-pagination">
                      <Pagination
                        current={currentPage}
                        pageSize={PAGE_SIZE}
                        total={data.length}
                        onChange={setCurrentPage}
                        size="small"
                        showTotal={(total, range) =>
                          t("DataList.paginationTotal", {
                            start: range[0],
                            end: range[1],
                            total,
                          })
                        }
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="datalist-empty">
                  <EmptyBox title={t("DataList.noData")} />
                </div>
              )}
            </>
          ) : (
            <div className="datalist-empty">
              <EmptyBox title={t("DataList.configureDataSourceFirst")} />
            </div>
          )}
          {!!formilyField.selfErrors?.length && (
            <div className="datalist-card__feedback">
              {formilyField.selfErrors[0]}
            </div>
          )}
        </AntdCard>

        {/* Add / Edit Modal */}
        <Modal centered
          title={getModalTitle()}
          visible={modalVisible}
          onCancel={() => {
            if (!publicationNameChecking) setModalVisible(false);
          }}
          footer={null}
          destroyOnClose
          className="datalist-form-modal"
          maskClosable={false}
          closable={!publicationNameChecking}
          getContainer={() => document.body}
          width={900}
        >
          <Form
            form={modalForm}
            layout="vertical"
            className="Formily-Modal-Form"
          >
            {renderFormItems()}
          </Form>
          <div className="formily-modal-footer">
            <CustomButton
              variant="outline"
              onClick={() => setModalVisible(false)}
              disabled={publicationNameChecking}
            >
              {t("DataList.cancel")}
            </CustomButton>
            <CustomButton
              onClick={handleOk}
              disabled={modalLookupsLoading || publicationNameChecking}
              loading={modalLookupsLoading || publicationNameChecking}
            >
              {editingIndex != null
                ? t("DataList.save")
                : t("DataList.confirm")}
            </CustomButton>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal centered
          title={null}
          visible={deleteModalVisible}
          onCancel={() => setDeleteModalVisible(false)}
          footer={null}
          destroyOnClose
          className="datalist-delete-modal"
          width={480}
          maskClosable={false}
          getContainer={() => document.body}
          closable={false}
        >
          <div className="delete-modal-content">
            <div className="delete-modal-icon">
              <ExclamationCircleFilled />
            </div>
            <div className="delete-modal-body">
              <div className="delete-modal-title">
                {t("DataList.deleteRecord")}
              </div>
              <div className="delete-modal-desc">
                {t("DataList.deleteRecordDesc")}
              </div>
            </div>
          </div>
          <div className="formily-modal-footer">
            <CustomButton
              variant="outline"
              onClick={() => setDeleteModalVisible(false)}
            >
              {t("DataList.cancel")}
            </CustomButton>
            <CustomButton variant="danger" onClick={handleDeleteConfirm}>
              {t("DataList.confirm")}
            </CustomButton>
          </div>
        </Modal>
      </div>
    );
  },
);

export type { DataListProps };

export default DataListInner;
