import * as React from "react";
import { useEffect, useState } from "react";
import { observer, useField, Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Checkbox, Input, Select, Row, Col, Radio, Card as AntdCard } from "antd";
import "./index.less";
import { LanguageSelect as LanguageSelectComponent } from "../LanguageSelect/LanguageSelect";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import AIText from "../../../../../assets/images/AIText.svg";

import {
  getSubjectList,
  getSubjectSubList,
  getLookupData,
  getLanguages,
} from "../../../../../services/services";
import { getPublicationTypeByProfileId } from "@/services/userProfile.ts";
import { analyzeBookMaterial } from "@/services/myRequest";
import { CustomMessage } from "@/components/common";
import { useUserStore } from "@/store/user";
import { useServicesStore } from "@/store/services";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";

const { Option } = Select;
interface Subject {
  id: number;
  Id?: number;
  nameAr: string;
  nameEn: string;
  NameAr?: string;
  NameEn?: string;
  code: string;
  descAr: string | null;
  descEn: string | null;
}
type PublicationFormValue = {
  typeOfPublication?: string;
  publicationTitle?: string;
  language?: string;
  AIGeneratedFieldKeys?: string[];
  OriginalFileName?: string;
  AIMaterialRecognitionAnalysisStatus?: string;
  AIMaterialRecognitionMappingWarnings?: string[];
  [key: string]: any;
};
type OptionType = {
  label: string;
  value: number | string;
  [key: string]: any;
};

type PublicationTypeKind =
  | "unselected"
  | "book"
  | "map"
  | "brochures_and_posters"
  | "unknown";

const AI_OPTION_FIELDS = new Set([
  "SubjectCategory",
  "SubjectSubCategory",
  "Language",
  "AuthorName",
  "PublicationTitle",
]);

const BOOK_ONLY_FIELD_NAMES = [
  "ArticleType",
  "IssueNumbe",
  "PublishMethod",
  "CoverTypes",
  "SubjectCategory",
  "SubjectSubCategory",
] as const;

const BOOK_TYPE_MATCHERS = new Set(["1", "bk", "book"]);
const MAP_TYPE_MATCHERS = new Set(["2", "mp", "map"]);
const BROCHURES_AND_POSTERS_TYPE_MATCHERS = new Set([
  "6",
  "ot",
  "brochures and posters",
]);

function normalizeText(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getPublicationTypeKind(
  typeValue: unknown,
  selectedOption?: OptionType,
): PublicationTypeKind {
  const matcherCandidates = [
    typeValue,
    selectedOption?.value,
    selectedOption?.label,
    selectedOption?.code,
    selectedOption?.nameEn,
    selectedOption?.NameEn,
  ]
    .map((item) => normalizeText(item as string | number | null))
    .filter(Boolean);

  if (matcherCandidates.length === 0) {
    return "unselected";
  }

  if (matcherCandidates.some((item) => BOOK_TYPE_MATCHERS.has(item))) {
    return "book";
  }

  if (matcherCandidates.some((item) => MAP_TYPE_MATCHERS.has(item))) {
    return "map";
  }

  if (
    matcherCandidates.some((item) =>
      BROCHURES_AND_POSTERS_TYPE_MATCHERS.has(item),
    )
  ) {
    return "brochures_and_posters";
  }

  return "unknown";
}

function extractResponseArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && "data" in res) {
    const data = (res as { data?: unknown }).data;
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return [];
}

function normalizeOptionLabel(value: unknown) {
  return normalizeText(value as string | number | null);
}

function findPublicationTypeOption(
  options: OptionType[],
  typeValue?: string | number | null,
) {
  return options.find(
    (item) =>
      String(item.value) === String(typeValue ?? "") ||
      String(item.id) === String(typeValue ?? "") ||
      normalizeOptionLabel(item.code) === normalizeOptionLabel(typeValue) ||
      normalizeOptionLabel(item.nameEn) === normalizeOptionLabel(typeValue) ||
      normalizeOptionLabel(item.NameEn) === normalizeOptionLabel(typeValue) ||
      normalizeOptionLabel(item.nameAr) === normalizeOptionLabel(typeValue) ||
      normalizeOptionLabel(item.NameAr) === normalizeOptionLabel(typeValue) ||
      normalizeOptionLabel(item.label) === normalizeOptionLabel(typeValue),
  );
}

function findOptionValueByLabel(options: OptionType[], targetLabel: unknown) {
  const normalizedTargetLabel = normalizeOptionLabel(targetLabel);
  if (!normalizedTargetLabel) return undefined;

  return options.find(
    (option) => normalizeOptionLabel(option.label) === normalizedTargetLabel,
  )?.value;
}

function findOptionValuesByLabels(
  options: OptionType[],
  targetLabels: unknown,
) {
  const normalizedLabels = (
    Array.isArray(targetLabels) ? targetLabels : [targetLabels]
  )
    .map((item) => normalizeOptionLabel(item))
    .filter((item) => item !== "");

  if (normalizedLabels.length === 0) {
    return [];
  }

  return normalizedLabels
    .map(
      (label) =>
        options.find((option) => normalizeOptionLabel(option.label) === label)
          ?.value,
    )
    .filter(
      (value): value is string | number =>
        value !== undefined && value !== null && value !== "",
    );
}

function ensureOptionForValue(
  options: OptionType[],
  value: unknown,
): OptionType[] {
  if (value === undefined || value === null || value === "") {
    return options;
  }

  const values = Array.isArray(value) ? value : [value];
  const nextOptions = [...options];

  values.forEach((item) => {
    const hasExistingOption = nextOptions.some(
      (option) =>
        String(option.value) === String(item) ||
        normalizeOptionLabel(option.label) === normalizeOptionLabel(item),
    );

    if (!hasExistingOption) {
      nextOptions.push({
        label: String(item),
        value: item as string | number,
      });
    }
  });

  return nextOptions;
}

function normalizeMultiSelectValue(value: unknown): Array<string | number> {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string | number =>
        item !== undefined && item !== null && item !== "",
    );
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        if (/^-?\d+(\.\d+)?$/.test(item)) {
          return Number(item);
        }

        return item;
      });
  }

  return [value as string | number];
}

export const PublicationFormField: React.FC<any> = observer((props) => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const field = useField<any>();
  if (!field) {
    return null;
  }
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const serviceCode = useServicesStore((state) => state.userInfo.servicesCode);
  const current: PublicationFormValue = field.value || {};
  const [SubjectCategoryOptions, setSubjectCategoryOptions] = useState<
    OptionType[]
  >([]);
  const [typeOfPublicationOptions, settypeOfPublicationOptions] = useState<
    OptionType[]
  >([]);
  const [PublishMethodOptions, setPublishMethodOptions] = useState<
    OptionType[]
  >([]);
  const [CoverTypeOptions, setCoverTypeOptions] = useState<OptionType[]>([]);
  const [LanguageOptions, setLanguageOptions] = useState<OptionType[]>([]);
  const [SubjectSubCategoryOptions, setSubjectSubCategoryOptions] = useState<
    OptionType[]
  >([]);

  useEffect(() => {
    field.decoratorProps = {
      ...(field.decoratorProps || {}),
      label: false,
    };
  }, [field]);

  const mapLookupOption = React.useCallback(
    (item: Subject, value: string | number) => ({
      label:
        preferLocalizedEnAr(
          isAr,
          item.nameEn ?? item.NameEn,
          item.nameAr ?? item.NameAr,
        ) || String(value),
      value,
      ...item,
    }),
    [isAr],
  );
  useEffect(() => {
    let cancelled = false;

    getSubjectList().then((res) => {
      setSubjectCategoryOptions(
        extractResponseArray<Subject>(res).map((item) =>
          mapLookupOption(item, item.id),
        ),
      );
    });
    getLookupData("PublishMethods").then((res) => {
      setPublishMethodOptions(
        extractResponseArray<Subject>(res).map((item) =>
          mapLookupOption(item, item.Id ?? item.id),
        ),
      );
    });
    getLookupData("CoverTypes").then((res) => {
      setCoverTypeOptions(
        extractResponseArray<Subject>(res).map((item) =>
          mapLookupOption(item, item.Id ?? item.id),
        ),
      );
    });
    getLanguages().then((res) => {
      setLanguageOptions(
        extractResponseArray<Subject>(res).map((item) =>
          mapLookupOption(item, item.Id ?? item.id),
        ),
      );
    });

    const profileId = String(currentProfileId || "").trim();
    if (!profileId) {
      settypeOfPublicationOptions([]);
      return () => {
        cancelled = true;
      };
    }

    getPublicationTypeByProfileId(profileId, serviceCode)
      .then((res) => {
        if (cancelled) return;

        const options = extractResponseArray<Subject>(res).map((item) =>
          mapLookupOption(item, item.id),
        );
        settypeOfPublicationOptions(options);
      })
      .catch(() => {
        if (!cancelled) {
          settypeOfPublicationOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfileId, mapLookupOption, serviceCode]);

  const getSelectedTypeOfPublicationOption = React.useCallback(
    (typeValue?: string | number | null) =>
      findPublicationTypeOption(typeOfPublicationOptions, typeValue),
    [typeOfPublicationOptions],
  );

  const selectedTypeOfPublicationOption = React.useMemo(
    () => getSelectedTypeOfPublicationOption(current.TypeOfPublication),
    [current.TypeOfPublication, getSelectedTypeOfPublicationOption],
  );

  useEffect(() => {
    if (!selectedTypeOfPublicationOption) {
      return;
    }

    const nextTypeOfPublication = selectedTypeOfPublicationOption.id;
    if (
      String(current.TypeOfPublication ?? "") ===
      String(nextTypeOfPublication)
    ) {
      return;
    }

    field.setValue({
      ...(field.value || {}),
      TypeOfPublication: nextTypeOfPublication,
    });
  }, [current.TypeOfPublication, field, selectedTypeOfPublicationOption]);

  const publicationTypeKind = React.useMemo(
    () =>
      getPublicationTypeKind(
        current.TypeOfPublication,
        selectedTypeOfPublicationOption,
      ),
    [current.TypeOfPublication, selectedTypeOfPublicationOption],
  );

  const isBookType = publicationTypeKind === "book";

  useEffect(() => {
    const fetchSubjectSubList = async () => {
      if (isBookType && current.SubjectCategory) {
        try {
          const res = await getSubjectSubList();
          const filteredOptions = extractResponseArray<Subject>(res)
            .filter(
              (item: any) => item.subjectCategoryId === current.SubjectCategory,
            )
            .map((item: any) => ({
              label:
                preferLocalizedEnAr(
                  isAr,
                  item.nameEn ?? item.NameEn,
                  item.nameAr ?? item.NameAr,
                ) || String(item.id),
              value: item.id,
              ...item,
            }));
          setSubjectSubCategoryOptions(
            ensureOptionForValue(filteredOptions, current.SubjectSubCategory),
          );
        } catch (error) {
          console.error("Failed to fetch subject sub list:", error);
          setSubjectSubCategoryOptions(
            ensureOptionForValue([], current.SubjectSubCategory),
          );
        }
      } else {
        setSubjectSubCategoryOptions(
          ensureOptionForValue([], current.SubjectSubCategory),
        );
      }
    };

    fetchSubjectSubList();
  }, [current.SubjectCategory, current.SubjectSubCategory, isAr, isBookType]);
  const shouldShowCoverTypes =
    isBookType &&
    (Array.isArray(current.PublishMethod)
      ? current.PublishMethod.some((item) => String(item) === "1")
      : String(current.PublishMethod ?? "") === "1");

  const getLabelKey = (name: string) => `PublicationForm.label.${name}`;
  const getLabel = (name: string) => t(getLabelKey(name));
  const aiGeneratedFieldKeys = Array.isArray(current.AIGeneratedFieldKeys)
    ? current.AIGeneratedFieldKeys.filter(
        (key): key is string =>
          typeof key === "string" && AI_OPTION_FIELDS.has(key),
      )
    : [];
  const shouldShowAiIndicator = (name: string) =>
    aiGeneratedFieldKeys.includes(name);
  const subjectCategoryDisplayOptions = React.useMemo(
    () => ensureOptionForValue(SubjectCategoryOptions, current.SubjectCategory),
    [SubjectCategoryOptions, current.SubjectCategory],
  );
  const subjectSubCategoryDisplayOptions = React.useMemo(
    () =>
      ensureOptionForValue(
        SubjectSubCategoryOptions,
        current.SubjectSubCategory,
      ),
    [SubjectSubCategoryOptions, current.SubjectSubCategory],
  );
  const normalizedLanguageValue = React.useMemo(
    () => normalizeMultiSelectValue(current.Language),
    [current.Language],
  );
  const languageDisplayOptions = React.useMemo(
    () => ensureOptionForValue(LanguageOptions, normalizedLanguageValue),
    [LanguageOptions, normalizedLanguageValue],
  );
  const resetFieldState = React.useCallback(
    (name: string) => {
      const targetField =
        (field.query(`${field.address}.${name}`).take() as any) ||
        (field.query(name).take() as any);
      if (!targetField) return;

      targetField.setFeedback?.({
        type: "error",
        messages: [],
      });
      targetField.setValidator?.(() => "");
      targetField.setValue?.(undefined);
      targetField.setState?.((state: any) => {
        state.required = false;
        state.selfErrors = [];
        state.selfWarnings = [];
        state.selfSuccesses = [];
        state.selfValidating = false;
        state.validating = false;
      });
    },
    [field],
  );
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  useEffect(() => {
    if (
      isBookType &&
      (current.ArticleType === undefined ||
        current.ArticleType === null ||
        current.ArticleType === "")
    ) {
      handleFieldChange("ArticleType", "Original");
    }
  }, [current.ArticleType, isBookType]);
  const handleFieldChange = (key: string, value: any) => {
    const newValue = {
      ...current,
      [key]: value,
    };

    if (key === "SubjectCategory") {
      newValue.SubjectSubCategory = undefined;
      setSubjectSubCategoryOptions([]);
    }
    if (key === "Language") {
      newValue.Language = value.join(",");
    }
    if (key === "TypeOfPublication") {
      const nextTypeOption = getSelectedTypeOfPublicationOption(value);
      const nextTypeKind = getPublicationTypeKind(value, nextTypeOption);
      const isLeavingBook =
        publicationTypeKind === "book" && nextTypeKind !== "book";
      const isEnteringBook =
        publicationTypeKind !== "book" && nextTypeKind === "book";

      if (isLeavingBook) {
        BOOK_ONLY_FIELD_NAMES.forEach((name) => {
          delete newValue[name];
          resetFieldState(name);
        });
        delete newValue.AIGeneratedFieldKeys;
        delete newValue.AIMaterialRecognitionAnalysisStatus;
        delete newValue.AIMaterialRecognitionMappingWarnings;
        setSubjectSubCategoryOptions([]);
      }

      if (isEnteringBook && !newValue.ArticleType) {
        newValue.ArticleType = "Original";
      }
    }
    if (key === "AIMaterialRecognition") {
      delete newValue.AIGeneratedFieldKeys;
      delete newValue.AIMaterialRecognitionAnalysisStatus;
      delete newValue.AIMaterialRecognitionMappingWarnings;
      delete newValue.OriginalFileName;
    }
    if (key === "PublishMethod") {
      const shouldKeepCoverTypes = Array.isArray(value)
        ? value.some((item) => String(item) === "1")
        : String(value ?? "") === "1";

      if (!shouldKeepCoverTypes) {
        delete newValue.CoverTypes;
        resetFieldState("CoverTypes");
      }
    }
    field.setValue(newValue);
  };

  const handleUploadMaterialAnalysisSuccess = React.useCallback(
    async (fileData: Array<{ url: string; name: string }>) => {
      const uploadedFile = fileData[0];
      const normalizedServiceCode = Number(serviceCode || 0);
      const currentTypeOption = getSelectedTypeOfPublicationOption(
        current.TypeOfPublication,
      );
      const currentTypeKind = getPublicationTypeKind(
        current.TypeOfPublication,
        currentTypeOption,
      );
      if (
        !uploadedFile?.url ||
        !normalizedServiceCode ||
        currentTypeKind !== "book"
      ) {
        return;
      }
      setAiAnalyzing(true);

      try {
        const response = await analyzeBookMaterial({
          filePath: uploadedFile.url,
          typeOfPublication: String(current.TypeOfPublication ?? ""),
          serviceCode: normalizedServiceCode,
          originalFileName:uploadedFile.name,
        });

        if (!response?.isSuccess) {
          throw new Error(response?.message || "AI analysis failed.");
        }
        const analysisData = response?.data || {};
        const generatedFields: Record<string, unknown> =
          analysisData.aiGeneratedFields &&
          typeof analysisData.aiGeneratedFields === "object"
            ? (analysisData.aiGeneratedFields as Record<string, unknown>)
            : {};
        const generatedLabels: Record<string, unknown> =
          analysisData.aiGeneratedLabels &&
          typeof analysisData.aiGeneratedLabels === "object"
            ? (analysisData.aiGeneratedLabels as Record<string, unknown>)
            : {};
        const labelBackfilledValues: Record<string, unknown> = {
          PublicationTitle:
            generatedLabels.PublicationTitle ??
            generatedFields.PublicationTitle,
          AuthorName: generatedLabels.AuthorName ?? generatedFields.AuthorName,
        };
        const languageLabel = generatedLabels.Language;
        const mappedLanguageIds = findOptionValuesByLabels(
          LanguageOptions,
          languageLabel,
        );
        if (mappedLanguageIds.length > 0) {
          labelBackfilledValues.Language = mappedLanguageIds;
        }

        const subjectCategoryLabel = generatedLabels.SubjectCategory;
        if (
          subjectCategoryLabel !== undefined &&
          subjectCategoryLabel !== null &&
          subjectCategoryLabel !== ""
        ) {
          labelBackfilledValues.SubjectCategory =
            findOptionValueByLabel(
              SubjectCategoryOptions,
              subjectCategoryLabel,
            ) ?? subjectCategoryLabel;
        }

        const subjectSubCategoryLabel = generatedLabels.SubjectSubCategory;
        if (
          subjectSubCategoryLabel !== undefined &&
          subjectSubCategoryLabel !== null &&
          subjectSubCategoryLabel !== ""
        ) {
          labelBackfilledValues.SubjectSubCategory =
            findOptionValueByLabel(
              SubjectSubCategoryOptions,
              subjectSubCategoryLabel,
            ) ?? subjectSubCategoryLabel;
        }

        const generatedFieldKeys = Array.isArray(
          analysisData.aiGeneratedFieldKeys,
        )
          ? analysisData.aiGeneratedFieldKeys.filter(
              (key): key is string =>
                typeof key === "string" && AI_OPTION_FIELDS.has(key),
            )
          : [];
        const aiIndicatorFieldKeys = Array.from(
          new Set([
            ...generatedFieldKeys,
            ...Object.keys(labelBackfilledValues).filter((key) =>
              AI_OPTION_FIELDS.has(key),
            ),
          ]),
        );
        const mappingWarnings = Array.isArray(analysisData.mappingWarnings)
          ? analysisData.mappingWarnings
          : [];
        const latestValue: PublicationFormValue = field.value || {};

        field.setValue({
          ...latestValue,
          AIMaterialRecognition: uploadedFile.url,
          OriginalFileName: uploadedFile.name || "",
          ...labelBackfilledValues,
          AIGeneratedFieldKeys: aiIndicatorFieldKeys,
          AIMaterialRecognitionAnalysisStatus:
            analysisData.analysisStatus || "completed",
          AIMaterialRecognitionMappingWarnings: mappingWarnings,
        });

        if (mappingWarnings.length > 0) {
          CustomMessage.warning(
            t("AIMaterialAnalysis.completedNeedsReview"),
          );
        } else if (aiIndicatorFieldKeys.length > 0) {
          CustomMessage.success(t("AIMaterialAnalysis.completed"));
        }
      } catch (error) {
        console.error("AI material analysis failed:", error);
        CustomMessage.error(t("AIMaterialAnalysis.failed"));
      } finally {
        setAiAnalyzing(false);
      }
    },
    [
      LanguageOptions,
      SubjectCategoryOptions,
      SubjectSubCategoryOptions,
      current.TypeOfPublication,
      field,
      getSelectedTypeOfPublicationOption,
      serviceCode,
      t,
    ],
  );

  const renderTextInput = (
    name: string,
    label: string,
    required: boolean = true,
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value)
            return t("PublicationForm.validation.required", { label });
          return "";
        }}
      >
        <div
          className={`ant-formily-item-label ${
            shouldShowAiIndicator(name) ? "AI-flex" : ""
          }`}
        >
          <div>
            {label}
<span className="required-icon">*</span>
          </div>
          {shouldShowAiIndicator(name) && (
            <img src={AIText} className="AI-formily-icon" />
          )}
        </div>
        <Input
          disabled={props.disabled}
          className={`ant-input-affix-wrapper ${
            shouldShowAiIndicator(name) ? "AI-formily AI-formily-Input" : ""
          }`}
          placeholder={t("PublicationForm.placeholder.enter", { label })}
          value={current[name] || null}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          maxLength={256}
        />
      </Field>
    );
  };

  type RenderSelectConfig = {
    /**  id  */
    mode?: "multiple";
  };

  const renderSelect = (
    name: string,
    label: string,
    options: { label: string; value: string | number }[],
    required: boolean = true,
    config?: RenderSelectConfig,
  ) => {
    const multiple = config?.mode === "multiple";
    const raw = current[name];
    const selectValue = multiple
      ? Array.isArray(raw)
        ? raw
        : raw !== undefined && raw !== null && raw !== ""
        ? [raw as string | number]
        : []
      : raw;
    const selectedValues = Array.isArray(selectValue) ? selectValue : [];
    const allSelected =
      options.length > 0 &&
      options.every((option) => selectedValues.includes(option.value));
    const hasSelectedValues = options.some((option) =>
      selectedValues.includes(option.value),
    );
    const handleSelectAll = (checked: boolean) => {
      if (!multiple || props.disabled || options.length === 0) return;
      handleFieldChange(name, checked ? options.map((option) => option.value) : []);
    };

    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (!required) return "";
          if (multiple) {
            if (!value || (Array.isArray(value) && value.length === 0)) {
              return t("PublicationForm.validation.required", { label });
            }
          } else if (value === undefined || value === null || value === "") {
            return t("PublicationForm.validation.required", { label });
          }
          return "";
        }}
      >
        <div
          className={`ant-formily-item-label ${
            shouldShowAiIndicator(name) ? "AI-flex" : ""
          }`}
        >
          <div>
            {label}
<span className="required-icon">*</span>
          </div>
          {shouldShowAiIndicator(name) && (
            <img src={AIText} className="AI-formily-icon" />
          )}
        </div>
        <Select
          mode={multiple ? "multiple" : undefined}
          maxTagCount={multiple ? 3 : undefined}
          className={
            multiple
              ? `publication-multi-select${shouldShowAiIndicator(name) ? " AI-formily" : ""}`
              : shouldShowAiIndicator(name)
              ? "AI-formily"
              : undefined
          }
          disabled={props.disabled}
          placeholder={t("PublicationForm.placeholder.select", { label })}
          value={selectValue}
          onChange={(value) => handleFieldChange(name, value)}
          showSearch
          optionFilterProp={multiple ? "title" : "children"}
          dropdownClassName={
            multiple ? "publication-multi-select-dropdown" : undefined
          }
          dropdownRender={
            multiple
              ? (menu) => (
                  <div>
                    <div className="publication-multi-select-all">
                      <Checkbox
                        className={
                          hasSelectedValues && !allSelected
                            ? "publication-multi-select-all-checkbox has-selection"
                            : "publication-multi-select-all-checkbox"
                        }
                        checked={allSelected}
                        disabled={props.disabled || options.length === 0}
                        onChange={(event) => handleSelectAll(event.target.checked)}
                      >
                        {t("LanguageSelectMulti.selectAll")}
                      </Checkbox>
                    </div>
                    <div>{menu}</div>
                  </div>
                )
              : undefined
          }
        >
          {options.map((o) => (
            <Option
              key={String(o.value)}
              value={o.value}
              title={o.label}
              label={
                multiple ? (
                  <div className="publication-multi-selection-item">
                    <Checkbox checked />
                    <span>{o.label}</span>
                  </div>
                ) : undefined
              }
            >
              {multiple ? (
                <div className="publication-multi-option">
                  <Checkbox checked={selectedValues.includes(o.value)} />
                  <span>{o.label}</span>
                </div>
              ) : (
                o.label
              )}
            </Option>
          ))}
        </Select>
      </Field>
    );
  };

  const renderLanguageSelect = (
    name: string,
    label: string,
    required: boolean = true,
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value)
            return t("PublicationForm.validation.required", { label });
          return "";
        }}
      >
        <div
          className={`ant-formily-item-label ${
            shouldShowAiIndicator(name) ? "AI-flex" : ""
          }`}
        >
          <div>
            {label}
<span className="required-icon">*</span>
          </div>
          {shouldShowAiIndicator(name) && (
            <img src={AIText} className="AI-formily-icon" />
          )}
        </div>
        <LanguageSelectComponent
          options={languageDisplayOptions}
          className={shouldShowAiIndicator(name) && " AI-formily"}
          disabled={props.disabled}
          multiple={true}
          placeholder={t("PublicationForm.placeholder.select", { label })}
          value={normalizedLanguageValue.length > 0 ? normalizedLanguageValue : undefined}
          onChange={(value: string | number | Array<string | number>) =>
            handleFieldChange(name, value)
          }
        />
      </Field>
    );
  };
  const renderUpload = (
    name: string,
    label: string,
    required: boolean = true,
  ) => {
    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value)
            return t("PublicationForm.validation.required", { label });
          return "";
        }}
      >
        <div className="ant-formily-item-label  AI-flex">
          <div>
            {label}
<span className="required-icon">*</span>
          </div>
        </div>
        <div className="ant-formily-upload">
          {" "}
          <DocumentViewer
            hasDelete={true}
            disabled={props.disabled}
            value={current[name]}
            onChange={(value) => handleFieldChange(name, value)}
            uploadConfig={{
              maxCount: 1,
              maxSize: 50,
              placeholder: t("PublicationForm.common.upload"),
              uploadTip: t("PublicationForm.uploadTip", { size: 5 }),
              invalidFileTypeMessage: t("PublicationForm.validation.pdfOnly"),
              maxSizeErrorMessage: t("PublicationForm.validation.fileSize", {
                size: 5,
              }),
              accept: ".pdf",
              onUploadSuccess: handleUploadMaterialAnalysisSuccess,
            }}
          />
        </div>
        {name === "AIMaterialRecognition" && aiAnalyzing ? (
          <div style={{ marginTop: 8, color: "#92722A", fontSize: 12 }}>
            {t("AIMaterialAnalysis.inProgress")}
          </div>
        ) : null}
      </Field>
    );
  };
  const renderCheck = (
    name: string,
    label: string,
    required: boolean = true,
  ) => {
    const fieldValue = current[name] || "Original";

    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value)
            return t("PublicationForm.validation.required", { label });
          return "";
        }}
      >
        <div className="ant-formily-item-label  AI-flex">
          <div>
            {" "}
            {label}
<span className="required-icon">*</span>
          </div>
        </div>
        <Radio.Group
          className="ant-formily-radio"
          disabled={props.disabled}
          value={fieldValue}
          onChange={(e) => handleFieldChange(name, e.target.value)}
        >
          <Radio value="Original">
            {t("PublicationForm.options.original")}
          </Radio>
          <Radio value="Translated">
            {t("PublicationForm.options.translated")}
          </Radio>
        </Radio.Group>
      </Field>
    );
  };
  const renderNumberTextInput = (
    name: string,
    label: string,
    required: boolean = true,
    isNumberOnly: boolean = false,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (isNumberOnly) {
        // Allow only numbers (including decimal numbers)
        if (/^\d*\.?\d*$/.test(value) || value === "") {
          handleFieldChange(name, value);
        }
      } else {
        handleFieldChange(name, value);
      }
    };

    return (
      <Field
        name={name}
        decorator={[FormItem]}
        validator={(value) => {
          if (required && !value)
            return t("PublicationForm.validation.required", { label });
          return "";
        }}
      >
        <div className="ant-formily-item-label  AI-flex">
          <div>
            {label}
<span className="required-icon">*</span>
          </div>
        </div>
        <Input
          disabled={props.disabled}
          className="ant-input-affix-wrapper"
          placeholder={t("PublicationForm.placeholder.enter", { label })}
          value={current[name] || null}
          onChange={handleChange}
          maxLength={256}
        />
      </Field>
    );
  };

  return (
    <div className="publication-form-container" {...props}>
      <AntdCard
        title={
          <span data-content-editable="x-component-props.title">
            {t("PublicationForm.title")}
          </span>
        }
      >
        <Row gutter={[24, 24]}>
          <Col span={12}>
            {renderSelect(
              "TypeOfPublication",
              getLabel("TypeOfPublication"),
              typeOfPublicationOptions,
              true,
            )}
          </Col>
          <Col span={12}>
            {renderUpload(
              "AIMaterialRecognition",
              getLabel("AIMaterialRecognition"),
              true,
            )}
          </Col>
          {isBookType && (
            <>
              <Col span={12}>
                {renderCheck("ArticleType", getLabel("ArticleType"), true)}
              </Col>{" "}
            </>
          )}

          <Col span={12}>
            {renderTextInput(
              "PublicationTitle",
              getLabel("PublicationTitle"),
              true,
            )}
          </Col>
          {isBookType && (
            <>
              {" "}
              <Col span={12}>
                {renderNumberTextInput(
                  "IssueNumbe",
                  getLabel("IssueNumbe"),
                  true,
                )}
              </Col>
              <Col span={12}>
                {renderSelect(
                  "PublishMethod",
                  getLabel("PublishMethod"),
                  PublishMethodOptions,
                  true,
                  { mode: "multiple" },
                )}
              </Col>
              {shouldShowCoverTypes && (
                <Col span={12}>
                  {renderSelect(
                    "CoverTypes",
                    getLabel("CoverTypes"),
                    CoverTypeOptions,
                    true,
                    { mode: "multiple" },
                  )}
                </Col>
              )}
            </>
          )}
          <Col span={12}>
            {renderTextInput("AuthorName", getLabel("AuthorName"), true)}
          </Col>
          <Col span={12}>
            {renderLanguageSelect("Language", getLabel("Language"), true)}
          </Col>
          {isBookType && (
            <>
              {" "}
              <Col span={12}>
                {renderSelect(
                  "SubjectCategory",
                  getLabel("SubjectCategory"),
                  subjectCategoryDisplayOptions,
                  true,
                )}
              </Col>
              <Col span={12}>
                {renderSelect(
                  "SubjectSubCategory",
                  getLabel("SubjectSubCategory"),
                  subjectSubCategoryDisplayOptions,
                  true,
                )}
              </Col>{" "}
            </>
          )}
        </Row>
      </AntdCard>
    </div>
  );
});

PublicationFormField.displayName = "PublicationFormField";

export default PublicationFormField;
