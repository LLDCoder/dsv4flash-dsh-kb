import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import {
  Input,
  Select,
  Radio,
  Row,
  Col,
  Card as AntdCard,
  Tooltip,
} from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";
import CustomMessage from "../../../../../components/common/CustomMessage";
import { LanguageSelect as LanguageSelectComponent } from "../LanguageSelect/LanguageSelect";
import { ALL_COUNTRIES } from "../CountryDropdown/countries";
import {
  getPublicationTypeByProfileId,
  type TypeDictionary,
} from "@/services/userProfile";
import { useServicesStore } from "@/store/services";
import { useUserStore } from "@/store/user";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import EmiratesIdInput from "@/components/common/EmiratesIdInput";
import "./styles.less";
import type { RcFile } from "antd/lib/upload";

const { Option } = Select;

type ScriptPublicationFormValue = {
  typeOfPublication?: string | number;
  applyingLocalMaterial?: "yes" | "no";
  publicationTitle?: string;
  authorName?: string;
  languages?: string[];
  productionCompany?: string;
  uploadMaterial?: string | string[];
  filmDirector?: string;
  filmWriter?: string;
  writerNationality?: string;
  writerEmiratesId?: string;
  writerEmiratesIdCopy?: string | string[];
  [key: string]: unknown;
};

type ScriptPublicationFormFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  serviceCode?: string | number | null;
};

const NAME_REGEX = /^[a-zA-Z\s\-']*$/;
const EMIRATES_ID_REGEX = /^784\d{4}\d{7}\d$/;
const MOVIE_TYPE_MATCHERS = new Set(["3", "mv", "movie"]);

type PublicationTypeOption = {
  label: string;
  value: string | number;
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
};

type IntlWithDisplayNames = typeof Intl & {
  DisplayNames?: new (
    locales?: string | string[],
    options?: { type: "region" },
  ) => {
    of(code: string): string | undefined;
  };
};

type ConditionalFieldState = {
  display?: "visible" | "none" | "hidden";
  visible?: boolean;
  required?: boolean;
  selfErrors?: unknown[];
  selfWarnings?: unknown[];
  selfSuccesses?: unknown[];
  validating?: boolean;
  selfValidating?: boolean;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function extractResponseArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && "data" in res) {
    const data = (res as { data?: unknown }).data;
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return [];
}

function isMovieType(
  value: unknown,
  option?: Partial<PublicationTypeOption>,
) {
  const matcherCandidates = [
    value,
    option?.value,
    option?.code,
    option?.label,
    option?.nameEn,
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return matcherCandidates.some((item) => MOVIE_TYPE_MATCHERS.has(item));
}

export const ScriptPublicationFormField: React.FC<ScriptPublicationFormFieldProps> = observer((props) => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const field = useField<ScriptPublicationFormValue>();
  if (!field) return null;
  const form = field.form;
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const storeServiceCode = useServicesStore((state) => state.userInfo.servicesCode);
  const serviceCode = props.serviceCode ?? storeServiceCode;
  const normalizedServiceCode = String(serviceCode ?? "").trim();
  const currentLanguage = i18n.language ?? "";
  const requiredMessage = t("ScriptPublicationForm.validation.required");

  const current: ScriptPublicationFormValue = (field.value || {
    applyingLocalMaterial: "no",
  }) as ScriptPublicationFormValue;
  const [typeOfPublicationOptions, setTypeOfPublicationOptions] = useState<
    PublicationTypeOption[]
  >([]);

  const isLocalMaterial = current.applyingLocalMaterial === "yes";
  const countryDisplayNames = useMemo(() => {
    try {
      const DisplayNames = (Intl as IntlWithDisplayNames).DisplayNames;
      return DisplayNames
        ? new DisplayNames([currentLanguage || "en"], { type: "region" })
        : undefined;
    } catch {
      return undefined;
    }
  }, [currentLanguage]);

  const countryOptions = useMemo(
    () =>
      ALL_COUNTRIES.map((country) => ({
        value: country.label,
        label: countryDisplayNames?.of(country.value) || country.label,
        key: country.value,
      })),
    [countryDisplayNames],
  );

  const mapPublicationTypeOption = React.useCallback(
    (item: TypeDictionary): PublicationTypeOption => ({
      label:
        preferLocalizedEnAr(isAr, item.nameEn, item.nameAr) ||
        item.code ||
        String(item.id),
      value: item.id,
      id: item.id,
      code: item.code,
      nameEn: item.nameEn,
      nameAr: item.nameAr,
    }),
    [isAr],
  );

  useEffect(() => {
    const profileId = String(currentProfileId || "").trim();
    if (!profileId || !normalizedServiceCode) {
      setTypeOfPublicationOptions([]);
      return;
    }

    let cancelled = false;

    getPublicationTypeByProfileId(profileId, normalizedServiceCode)
      .then((res) => {
        if (!cancelled) {
          setTypeOfPublicationOptions(
            extractResponseArray<TypeDictionary>(res).map(mapPublicationTypeOption),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTypeOfPublicationOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfileId, mapPublicationTypeOption, normalizedServiceCode]);

  const getSelectedTypeOfPublicationOption = React.useCallback(
    (typeValue?: string | number | null) =>
      typeOfPublicationOptions.find(
        (item) =>
          String(item.id) === String(typeValue ?? "") ||
          String(item.value) === String(typeValue ?? "") ||
          normalizeText(item.code) === normalizeText(typeValue) ||
          normalizeText(item.nameEn) === normalizeText(typeValue) ||
          normalizeText(item.label) === normalizeText(typeValue),
      ),
    [typeOfPublicationOptions],
  );

  const selectedTypeOfPublicationOption = useMemo(
    () => getSelectedTypeOfPublicationOption(current.typeOfPublication),
    [current.typeOfPublication, getSelectedTypeOfPublicationOption],
  );

  const isMoviePublication = useMemo(
    () => isMovieType(current.typeOfPublication, selectedTypeOfPublicationOption),
    [current.typeOfPublication, selectedTypeOfPublicationOption],
  );

  const mergedTypeOfPublicationOptions = useMemo(() => {
    if (!current.typeOfPublication || selectedTypeOfPublicationOption) {
      return typeOfPublicationOptions;
    }

    return [
      ...typeOfPublicationOptions,
      {
        label: String(current.typeOfPublication),
        value: current.typeOfPublication,
        id: 0,
        code: String(current.typeOfPublication),
        nameEn: String(current.typeOfPublication),
        nameAr: String(current.typeOfPublication),
      },
    ];
  }, [
    current.typeOfPublication,
    selectedTypeOfPublicationOption,
    typeOfPublicationOptions,
  ]);

  const selectedTypeOfPublicationValue = useMemo(
    () => selectedTypeOfPublicationOption?.id ?? current.typeOfPublication,
    [current.typeOfPublication, selectedTypeOfPublicationOption],
  );

  useEffect(() => {
    if (!selectedTypeOfPublicationOption) {
      return;
    }

    const nextId = selectedTypeOfPublicationOption.id;
    if (
      String(current.typeOfPublication ?? "") === String(nextId) &&
      String(current.printedTypeId ?? "") === String(nextId)
    ) {
      return;
    }

    const latest = ((field.value || {
      applyingLocalMaterial: "no",
    }) as ScriptPublicationFormValue);

    field.setValue({
      ...latest,
      typeOfPublication: nextId,
      printedTypeId: nextId,
    });
  }, [
    current.printedTypeId,
    current.typeOfPublication,
    field,
    selectedTypeOfPublicationOption,
  ]);

  const validateRequiredName = React.useCallback(
    (maxLength: number) =>
      (value: unknown): string => {
        const text = String(value ?? "").trim();
        if (!text) return requiredMessage;
        if (text.length > maxLength) {
          return t("ScriptPublicationForm.validation.maxChars", { max: maxLength });
        }
        if (!NAME_REGEX.test(text)) {
          return t("ScriptPublicationForm.validation.namePattern");
        }
        return "";
      },
    [requiredMessage, t],
  );

  const validateRequiredSelect = React.useCallback(
    (value: unknown): string =>
      value == null || String(value).trim() === "" ? requiredMessage : "",
    [requiredMessage],
  );

  const validateRequiredUpload = React.useCallback(
    (value: unknown): string => {
      if (!value) return requiredMessage;
      if (Array.isArray(value) && value.length === 0) return requiredMessage;
      return "";
    },
    [requiredMessage],
  );

  const validateWriterEmiratesId = React.useCallback(
    (value: unknown): string => {
      const text = String(value ?? "").trim();
      if (!text) return requiredMessage;
      if (!EMIRATES_ID_REGEX.test(text.replace(/\D/g, ""))) {
        return t("ScriptPublicationForm.validation.emiratesId");
      }
      return "";
    },
    [requiredMessage, t],
  );

  const getNestedField = React.useCallback(
    (name: keyof ScriptPublicationFormValue) =>
      form.query(`${String(field.address)}.${String(name)}`).take() ??
      form.query(`*.${String(name)}`).take(),
    [field.address, form],
  );

  const setConditionalFieldState = React.useCallback(
    (
      name: keyof ScriptPublicationFormValue,
      visible: boolean,
      required: boolean,
      validator?: (value: unknown) => string,
    ) => {
      const targetField = getNestedField(name);
      if (!targetField) {
        return;
      }

      if (validator) {
        targetField.setValidator?.(validator);
      }

      targetField.setState?.((state: ConditionalFieldState) => {
        state.display = visible ? "visible" : "none";
        state.visible = visible;
        state.required = required;
        state.selfErrors = [];
        state.selfWarnings = [];
        state.selfSuccesses = [];
        state.validating = false;
        state.selfValidating = false;
      });

      if (!visible) {
        targetField.setFeedback?.({
          type: "error",
          messages: [],
        });
      }
    },
    [getNestedField],
  );

  useEffect(() => {
    setConditionalFieldState(
      "filmDirector",
      isLocalMaterial,
      isLocalMaterial,
      isLocalMaterial ? validateRequiredName(100) : () => "",
    );
    setConditionalFieldState(
      "filmWriter",
      isLocalMaterial,
      isLocalMaterial,
      isLocalMaterial ? validateRequiredName(100) : () => "",
    );
    setConditionalFieldState(
      "writerNationality",
      isLocalMaterial,
      isLocalMaterial,
      isLocalMaterial ? validateRequiredSelect : () => "",
    );
    setConditionalFieldState(
      "writerEmiratesId",
      isLocalMaterial,
      isLocalMaterial,
      isLocalMaterial ? validateWriterEmiratesId : () => "",
    );
    setConditionalFieldState(
      "writerEmiratesIdCopy",
      isLocalMaterial,
      isLocalMaterial,
      isLocalMaterial ? validateRequiredUpload : () => "",
    );
  }, [
    isLocalMaterial,
    setConditionalFieldState,
    validateRequiredName,
    validateRequiredSelect,
    validateRequiredUpload,
    validateWriterEmiratesId,
  ]);

  const handleFieldChange = (
    key: string,
    value: ScriptPublicationFormValue[keyof ScriptPublicationFormValue]
  ) => {
    const next = { ...current, [key]: value };

    if (key === "applyingLocalMaterial" && value === "no") {
      delete next.filmDirector;
      delete next.filmWriter;
      delete next.writerNationality;
      delete next.writerEmiratesId;
      delete next.writerEmiratesIdCopy;
    }

    if (key === "typeOfPublication") {
      const nextSelectedTypeOption = getSelectedTypeOfPublicationOption(
        String(value ?? ""),
      );

      if (!isMovieType(value, nextSelectedTypeOption)) {
        delete next.productionCompany;
      }

      if (nextSelectedTypeOption?.id) {
        next.printedTypeId = nextSelectedTypeOption.id;
      } else {
        delete next.printedTypeId;
      }
    }

    field.setValue(next);
  };

  const renderLabel = (
    label: string,
    required = true,
    tooltip?: string
  ) => (
    <div className="script-pub-label">
      <span>
        {label}
        {required && <span className="script-pub-required">*</span>}
      </span>
      {tooltip && (
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined className="script-pub-tooltip-icon" />
        </Tooltip>
      )}
    </div>
  );

  const renderTextInput = (
    name: string,
    label: string,
    required = true,
    maxLength?: number,
    placeholder?: string,
    regex?: RegExp
  ) => (
    <Field
      name={name}
      decorator={[FormItem]}
      validator={(value) => {
        if (required && !value) return requiredMessage;
        if (value && maxLength && value.length > maxLength)
          return t("ScriptPublicationForm.validation.maxChars", { max: maxLength });
        if (value && regex && !regex.test(value))
          return t("ScriptPublicationForm.validation.namePattern");
        return "";
      }}
    >
      {renderLabel(label, required)}
      <Input
        disabled={props.disabled}
        placeholder={placeholder || label}
        value={String(current[name] || "")}
        maxLength={maxLength}
        onChange={(e) => {
          const val = e.target.value;
          if (regex) {
            if (regex.test(val) || val === "") handleFieldChange(name, val);
          } else {
            handleFieldChange(name, val);
          }
        }}
      />
    </Field>
  );

  const renderEmiratesIdInput = (
    name: string,
    label: string,
    required = true
  ) => (
    <Field
      name={name}
      decorator={[FormItem]}
      validator={(value) => {
        if (required && !value) return requiredMessage;
        if (
          value &&
          !EMIRATES_ID_REGEX.test(String(value).replace(/\D/g, ""))
        )
          return t("ScriptPublicationForm.validation.emiratesId");
        return "";
      }}
    >
      {renderLabel(label, required)}
      <EmiratesIdInput
        disabled={props.disabled}
        placeholder="784-XXXX-XXXXXXX-X"
        value={String(current[name] || "")}
        showInteractiveMask
        onChange={(e) => handleFieldChange(name, e.target.value)}
      />
    </Field>
  );

  const renderMultiLangSelect = (
    name: string,
    label: string,
    required = true
  ) => (
    <Field
      name={name}
      decorator={[FormItem]}
      validator={(value) => {
        if (required && (!value || !value.length))
          return requiredMessage;
        return "";
      }}
    >
      {renderLabel(label, required)}
      <LanguageSelectComponent
        className="script-pub-lang-select"
        disabled={props.disabled}
        multiple={true}
        placeholder={t("ScriptPublicationForm.placeholder.select", { label })}
        value={current[name]}
        onChange={(value: unknown) =>
          handleFieldChange(
            name,
            value as ScriptPublicationFormValue[keyof ScriptPublicationFormValue],
          )
        }
      />
    </Field>
  );

  const renderUpload = (
    name: string,
    label: string,
    required = true,
    accept = ".pdf",
    maxSize = 50,
    tooltip?: string,
    beforeUpload?: (file: RcFile) => boolean
  ) => (
    <Field
      name={name}
      decorator={[FormItem]}
      validator={(value) => {
        if (required && !value) return requiredMessage;
        return "";
      }}
    >
      {renderLabel(label, required, tooltip)}
      <DocumentViewer
        hasDelete
        disabled={props.disabled}
        value={current[name] as string | string[] | undefined}
        onChange={(value) => handleFieldChange(name, value)}
        uploadConfig={{
          maxCount: 1,
          maxSize,
          uploadTip: "",
          accept,
          beforeUpload,
          invalidFileTypeMessage: t("ScriptPublicationForm.validation.pdfOnly"),
          maxSizeErrorMessage: t("ScriptPublicationForm.validation.maxFileSize", { max: maxSize }),
        }}
      />
    </Field>
  );

  const renderCountrySelect = (
    name: string,
    label: string,
    required = true
  ) => (
    <Field
      name={name}
      decorator={[FormItem]}
      validator={(value) => {
        if (required && !value) return requiredMessage;
        return "";
      }}
    >
      {renderLabel(label, required)}
      <Select
        showSearch
        disabled={props.disabled}
        placeholder={t("ScriptPublicationForm.placeholder.select", { label })}
        value={current[name]}
        optionFilterProp="label"
        className="script-pub-select"
        filterOption={(input, option) =>
          String(option?.label ?? "")
            .toLowerCase()
            .includes(input.toLowerCase())
        }
        onChange={(value) => handleFieldChange(name, value)}
      >
        {countryOptions.map((country) => (
          <Option
            key={country.key}
            value={country.value}
            label={country.label}
          >
            {country.label}
          </Option>
        ))}
      </Select>
    </Field>
  );

  const createPdfBeforeUpload =
    (maxSize: number) =>
    (file: RcFile): boolean => {
      const isPdf =
        file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!isPdf) {
        CustomMessage.error(t("ScriptPublicationForm.validation.pdfOnly"));
        return false;
      }

      const isWithinLimit = file.size / 1024 / 1024 <= maxSize;
      if (!isWithinLimit) {
        CustomMessage.error(t("ScriptPublicationForm.validation.maxFileSize", { max: maxSize }));
        return false;
      }

      return true;
    };

  return (
    <div className="script-pub-container" {...props}>
      <AntdCard
        className="script-pub-card"
        title={
          <span data-content-editable="x-component-props.title">
            {t("ScriptPublicationForm.title")}
          </span>
        }
      >
        <Row gutter={[24, 24]}>
          {/* Type of Publication */}
          <Col span={12}>
            <Field
              name="typeOfPublication"
              decorator={[FormItem]}
              validator={(value) => {
                if (!value) return requiredMessage;
                return "";
              }}
            >
              {renderLabel(t("ScriptPublicationForm.label.typeOfPublication"))}
              <Select
                disabled={props.disabled}
                placeholder={t("ScriptPublicationForm.placeholder.typeOfPublication")}
                value={selectedTypeOfPublicationValue}
                onChange={(val) => handleFieldChange("typeOfPublication", val)}
                className="script-pub-select"
              >
                {mergedTypeOfPublicationOptions.map((option) => (
                  <Option key={String(option.value)} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Field>
          </Col>

          {/* Applying permit for local material */}
          <Col span={12}>
            <Field name="applyingLocalMaterial" decorator={[FormItem]}>
              {renderLabel(t("ScriptPublicationForm.label.applyingLocalMaterial"))}
              <div className="script-pub-radio-group">
                <Radio.Group
                  disabled={props.disabled}
                  value={current.applyingLocalMaterial ?? "no"}
                  onChange={(e) =>
                    handleFieldChange("applyingLocalMaterial", e.target.value)
                  }
                >
                  <Radio value="yes">{t("ScriptPublicationForm.common.yes")}</Radio>
                  <Radio value="no">{t("ScriptPublicationForm.common.no")}</Radio>
                </Radio.Group>
              </div>
            </Field>
          </Col>

          {/* Publication Title */}
          <Col span={12}>
            {renderTextInput(
              "publicationTitle",
              t("ScriptPublicationForm.label.publicationTitle"),
              true,
              200,
              t("ScriptPublicationForm.placeholder.publicationTitle")
            )}
          </Col>

          {/* Author Name */}
          <Col span={12}>
            {renderTextInput(
              "authorName",
              t("ScriptPublicationForm.label.authorName"),
              true,
              100,
              t("ScriptPublicationForm.placeholder.authorName"),
              NAME_REGEX
            )}
          </Col>

          {/* Languages */}
          <Col span={12}>
            {renderMultiLangSelect("languages", t("ScriptPublicationForm.label.languages"))}
          </Col>

          {/* Production Company */}
          {isMoviePublication && (
            <Col span={12}>
              {renderTextInput(
                "productionCompany",
                t("ScriptPublicationForm.label.productionCompany"),
                false,
                200,
                t("ScriptPublicationForm.placeholder.productionCompany")
              )}
            </Col>
          )}

          {/* Upload Material */}
          <Col span={12}>
            {renderUpload(
              "uploadMaterial",
              t("ScriptPublicationForm.label.uploadMaterial"),
              true,
              ".pdf",
              50,
              t("ScriptPublicationForm.uploadTip.material"),
              createPdfBeforeUpload(50)
            )}
          </Col>

          {/* ---- Conditional: Local material fields ---- */}
          {isLocalMaterial && (
            <>
              <Col span={24}>
                <div className="script-pub-section-divider">
                  {t("ScriptPublicationForm.section.localCreatorInformation")}
                </div>
              </Col>

              {/* Film Director */}
              <Col span={12}>
                {renderTextInput(
                  "filmDirector",
                  t("ScriptPublicationForm.label.filmDirector"),
                  true,
                  100,
                  t("ScriptPublicationForm.placeholder.filmDirector"),
                  NAME_REGEX
                )}
              </Col>

              {/* Film Writer */}
              <Col span={12}>
                {renderTextInput(
                  "filmWriter",
                  t("ScriptPublicationForm.label.filmWriter"),
                  true,
                  100,
                  t("ScriptPublicationForm.placeholder.filmWriter"),
                  NAME_REGEX
                )}
              </Col>

              {/* Writer Nationality */}
              <Col span={12}>
                {renderCountrySelect(
                  "writerNationality",
                  t("ScriptPublicationForm.label.writerNationality"),
                  true,
                )}
              </Col>

              {/* Writer Emirates ID */}
              <Col span={12}>
                {renderEmiratesIdInput(
                  "writerEmiratesId",
                  t("ScriptPublicationForm.label.writerEmiratesId"),
                  true,
                )}
              </Col>

              {/* Writer Emirates ID Copy */}
              <Col span={12}>
                {renderUpload(
                  "writerEmiratesIdCopy",
                  t("ScriptPublicationForm.label.writerEmiratesIdCopy"),
                  true,
                  ".pdf",
                  5,
                  t("ScriptPublicationForm.uploadTip.idCopy"),
                  createPdfBeforeUpload(5)
                )}
              </Col>
            </>
          )}
        </Row>
      </AntdCard>
    </div>
  );
});

ScriptPublicationFormField.displayName = "ScriptPublicationFormField";

export default ScriptPublicationFormField;
