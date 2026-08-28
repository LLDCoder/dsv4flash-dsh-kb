import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Field, observer, useField } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Button, Card as AntdCard, Col, Input, Row, Select, Typography } from "antd";
import { useTranslation } from "react-i18next";
import CustomMessage from "@/components/common/CustomMessage";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import {
  getLookupData,
  getMediaLicenseByNumber,
  type MediaLicenseByNumberResponse,
} from "@/services/services";
import MaterialListTable, { type MaterialListMaterialTypeOption } from "./MaterialListTable";
import "./styles.less";

const { Option } = Select;
const { Text } = Typography;

const MEDIA_LICENSE_NUMBER_MAX_LEN = 50;

const DEFAULT_BENEFICIARY_TYPE_OPTIONS = [
  {
    value: 1,
    translationKey: "commercialEntityHasMediaLicense",
    defaultLabel: "Commercial Entity Has Media License",
  },
  {
    value: 2,
    translationKey: "commercialEntityHasNoMediaLicense",
    defaultLabel: "Commercial Entity Has No Media License",
  },
  {
    value: 3,
    translationKey: "governmentEntity",
    defaultLabel: "Government Entity",
  },
  {
    value: 4,
    translationKey: "individual",
    defaultLabel: "Individual",
  },
  {
    value: 5,
    translationKey: "privateSchoolEducationalInstitutionUniversity",
    defaultLabel: "Private School / Educational Institution / University",
  },
] as const;

const BENEFICIARY_TYPE_TO_USER_TYPE_ID: Partial<Record<number, number>> = {
  3: 3,
  4: 1,
  5: 21,
};

const TYPE_ONE_ALWAYS_AVAILABLE_MATERIAL_TYPE_IDS = [14, 22];
const TYPE_ONE_QUALIFICATION_RULES = [
  {
    field: "numberOfBooksRegulateEntriesApplications",
    materialTypeIds: [8],
  },
  {
    field: "numberOfComputerProgramsRegulateEntriesApplications",
    materialTypeIds: [6, 7, 9],
  },
  {
    field: "numberOfVideoGamesRegulateEntriesApplications",
    materialTypeIds: [10],
  },
  {
    field: "numberOfCinemaRegulateEntriesApplications",
    materialTypeIds: [11],
  },
] as const;

export type BeneficiaryTypeValue = {
  beneficiaryType?: number;
  mediaLicenseNumberForBeneficiary?: string;
  mediaLicenseId?: number | null;
  beneficiaryName?: string;
  materialList?: Array<Record<string, unknown>>;
};

type BeneficiaryTypeFieldProps = {
  className?: string;
  disabled?: boolean;
  designMode?: boolean;
};

type BeneficiaryTypeFormField = {
  address: string;
  display?: string;
  visible?: boolean;
  value?: BeneficiaryTypeValue;
  setValue: (value: BeneficiaryTypeValue) => void;
  query: (pattern: string) => { take: () => NestedFieldController | undefined };
};

type NestedFieldController = {
  setFeedback?: (feedback: { type: string; messages: string[] }) => void;
  setState?: (updater: (state: Record<string, unknown>) => void) => void;
  setValue?: (value: unknown) => void;
  setValidator?: (validator: (value: unknown) => string) => void;
};

type LookupState = "idle" | "not_found" | "ineligible" | "eligible";
type BeneficiaryTypeOption = {
  value: number;
  label: string;
};
type BeneficiaryTypeLookupItem = {
  Id?: number | string;
  id?: number | string;
  Name?: string;
  NameEn?: string;
  NameAr?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
};
type LookupMaterialTypeItem = {
  Id?: number | string;
  id?: number | string;
  Name?: string;
  NameEn?: string;
  NameAr?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  Code?: string;
  code?: string;
  UserTypeId?: number | string;
  userTypeId?: number | string;
};
type CustomMaterialLookupItem = {
  Id?: number | string;
  id?: number | string;
  Name?: string;
  NameEn?: string;
  NameAr?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  HSCode?: string;
  hsCode?: string;
  MaterialTypeId?: number | string;
  materialTypeId?: number | string;
};

const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeLookupId = (value: unknown) => {
  const raw = normalizeText(value);
  if (!raw) return "";
  return raw;
};

const extractResponseArray = <T,>(response: unknown): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object" && "data" in response) {
    const data = (response as { data?: unknown }).data;
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return [];
};

const getLocalizedLookupName = (
  item:
    | LookupMaterialTypeItem
    | CustomMaterialLookupItem
    | BeneficiaryTypeLookupItem,
  isAr: boolean,
) =>
  normalizeText(
    isAr
      ? item.nameAr || item.NameAr || item.name || item.Name || item.nameEn || item.NameEn
      : item.nameEn || item.NameEn || item.name || item.Name || item.nameAr || item.NameAr,
  );

const buildMaterialTypeNameMap = (
  materialTypes: LookupMaterialTypeItem[],
  isAr: boolean,
) => {
  return new Map(
    materialTypes
      .map((item) => {
        const id = normalizeLookupId(item.Id ?? item.id);
        if (!id) return null;

        return [
          id,
          {
            name: getLocalizedLookupName(item, isAr) || id,
            code: normalizeText(item.code ?? item.Code),
          },
        ] as const;
      })
      .filter(
        (
          item,
        ): item is readonly [
          string,
          {
            name: string;
            code: string;
          },
        ] => Boolean(item),
      ),
  );
};

const buildCustomMaterialTypeOptions = (
  customMaterials: CustomMaterialLookupItem[],
  materialTypes: LookupMaterialTypeItem[],
  isAr: boolean,
) => {
  const materialTypeNameMap = buildMaterialTypeNameMap(materialTypes, isAr);

  return customMaterials
    .map<MaterialListMaterialTypeOption | null>((item) => {
      const customMaterialId = normalizeLookupId(item.Id ?? item.id);
      if (!customMaterialId) return null;

      const materialTypeId = normalizeLookupId(
        item.MaterialTypeId ?? item.materialTypeId,
      );
      const materialTypeMeta = materialTypeNameMap.get(materialTypeId);
      const localizedName = getLocalizedLookupName(item, isAr) || customMaterialId;
      const hsCode = normalizeText(item.HSCode ?? item.hsCode);

      return {
        value: customMaterialId,
        label: hsCode ? `${hsCode} - ${localizedName}` : localizedName,
        saveLabel: materialTypeMeta?.name || localizedName,
        tableLabel: materialTypeMeta?.name || localizedName,
        code: materialTypeMeta?.code || "",
        materialTypeId,
      };
    })
    .filter((item): item is MaterialListMaterialTypeOption => Boolean(item));
};

const buildFilteredMaterialTypeOptions = (
  materialTypes: LookupMaterialTypeItem[],
  userTypeId: number,
  isAr: boolean,
) => {
  return materialTypes
    .filter((item) => Number(item.userTypeId ?? item.UserTypeId) === userTypeId)
    .map<MaterialListMaterialTypeOption | null>((item) => {
      const id = normalizeLookupId(item.Id ?? item.id);
      if (!id) return null;

      const localizedName = getLocalizedLookupName(item, isAr) || id;

      return {
        value: id,
        label: localizedName,
        saveLabel: localizedName,
        tableLabel: localizedName,
        code: normalizeText(item.code ?? item.Code),
        materialTypeId: id,
      };
    })
    .filter((item): item is MaterialListMaterialTypeOption => Boolean(item));
};

const getEligibleMaterialTypeIds = (license: MediaLicenseByNumberResponse) => {
  if (!license.certificateValid) return [];

  const eligibleIds = new Set<number>(TYPE_ONE_ALWAYS_AVAILABLE_MATERIAL_TYPE_IDS);
  TYPE_ONE_QUALIFICATION_RULES.forEach(({ field, materialTypeIds }) => {
    if (license[field] === 1) {
      materialTypeIds.forEach((materialTypeId) => {
        eligibleIds.add(materialTypeId);
      });
    }
  });

  return Array.from(eligibleIds).sort((left, right) => left - right);
};

const filterCustomMaterialsByMaterialTypeIds = (
  customMaterials: CustomMaterialLookupItem[],
  eligibleMaterialTypeIds: number[],
) => {
  const eligibleMaterialTypeIdSet = new Set(
    eligibleMaterialTypeIds.map((item) => String(item)),
  );

  return customMaterials.filter((item) => {
    const materialTypeId = normalizeLookupId(item.MaterialTypeId ?? item.materialTypeId);
    return eligibleMaterialTypeIdSet.has(materialTypeId);
  });
};

const getErrorStatus = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;

  const response = (error as { response?: { status?: number } }).response;
  if (typeof response?.status === "number") {
    return response.status;
  }

  // The shared request interceptor rejects business failures with a plain Error that
  // only carries `statusCode`, so fall back to it before giving up.
  const statusCode = (error as { statusCode?: number }).statusCode;
  return typeof statusCode === "number" ? statusCode : undefined;
};

export const BeneficiaryTypeField: React.FC<BeneficiaryTypeFieldProps> = observer((props) => {
  const field = useField<BeneficiaryTypeFormField>();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language ?? "";
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const disabled = Boolean(props.disabled);
  const fallbackBeneficiaryTypeOptions = useMemo<BeneficiaryTypeOption[]>(
    () =>
      DEFAULT_BENEFICIARY_TYPE_OPTIONS.map((item) => ({
        value: item.value,
        label: t(`BeneficiaryType.option.${item.translationKey}`),
      })),
    [currentLanguage, t],
  );
  const beneficiaryTypeRequiredMessage = t(
    "BeneficiaryType.validation.beneficiaryTypeRequired",
  );
  const beneficiaryNameRequiredMessage = t(
    "BeneficiaryType.validation.beneficiaryNameRequired",
  );
  const licenseNotFoundMessage = t("BeneficiaryType.validation.licenseNotFound");
  const licenseRequiredMessage = t("BeneficiaryType.validation.licenseRequired");
  const licenseExpiredMessage = t("BeneficiaryType.validation.licenseExpired");
  const licenseLookupFailedMessage = t("BeneficiaryType.validation.licenseLookupFailed");
  const materialListRequiredMessage = t("BeneficiaryType.validation.materialListRequired");
  const ineligibleActivityMessage = t("BeneficiaryType.validation.ineligibleActivity");
  const current: BeneficiaryTypeValue = useMemo(
    () => {
      const raw = (field.value || {}) as BeneficiaryTypeValue;

      return {
        beneficiaryType: raw.beneficiaryType,
        mediaLicenseNumberForBeneficiary: raw.mediaLicenseNumberForBeneficiary ?? "",
        mediaLicenseId:
          typeof raw.mediaLicenseId === "number" ? raw.mediaLicenseId : null,
        beneficiaryName: raw.beneficiaryName ?? "",
        materialList: Array.isArray(raw.materialList) ? raw.materialList : [],
      };
    },
    [field.value],
  );
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [beneficiaryTypeOptions, setBeneficiaryTypeOptions] = useState<BeneficiaryTypeOption[]>(
    fallbackBeneficiaryTypeOptions,
  );
  const [materialTypeOptions, setMaterialTypeOptions] = useState<MaterialListMaterialTypeOption[]>(
    [],
  );
  const [materialTypeOptionsLoading, setMaterialTypeOptionsLoading] = useState(false);
  const [typeOneEligibleMaterialTypeIds, setTypeOneEligibleMaterialTypeIds] = useState<number[]>(
    [],
  );

  const isComponentVisible =
    field.display !== "none" &&
    field.display !== "hidden" &&
    field.visible !== false;
  const beneficiaryType = current.beneficiaryType;
  const isTypeOne = beneficiaryType === 1;
  const showLicenseField = isTypeOne;
  const showReadOnlyBeneficiaryName = isTypeOne && lookupState === "eligible";
  const showEditableBeneficiaryName = [2, 3, 4, 5].includes(Number(beneficiaryType));
  const showMaterialList = isTypeOne ? lookupState === "eligible" : showEditableBeneficiaryName;

  const patch = useCallback(
    (partial: Partial<BeneficiaryTypeValue>) => {
      const nextValue = {
        ...current,
        ...partial,
      };

      field.setValue(nextValue);
      Object.entries(partial).forEach(([name, value]) => {
        const targetField = field.query(`${field.address}.${name}`).take();
        targetField?.setValue?.(value);
      });
    },
    [current, field],
  );

  const resetFieldState = useCallback(
    (name: string, options?: { disableValidation?: boolean; hideField?: boolean }) => {
      const targetField = field.query(`${field.address}.${name}`).take();
      if (!targetField) return;

      targetField.setFeedback?.({
        type: "error",
        messages: [],
      });
      if (options?.disableValidation) {
        targetField.setValidator?.(() => "");
      }
      targetField.setState?.((state) => {
        if (options?.hideField) {
          state.required = false;
          state.visible = false;
          state.display = "none";
        }
        state.selfErrors = [];
        state.selfWarnings = [];
        state.selfSuccesses = [];
        state.selfValidating = false;
        state.validating = false;
      });
    },
    [field],
  );

  const showFieldState = useCallback(
    (name: string, required = true) => {
      const targetField = field.query(`${field.address}.${name}`).take();
      if (!targetField) return;

      targetField.setFeedback?.({
        type: "error",
        messages: [],
      });
      targetField.setState?.((state) => {
        state.required = required;
        state.visible = true;
        state.display = "visible";
        state.selfErrors = [];
        state.selfWarnings = [];
        state.selfSuccesses = [];
        state.selfValidating = false;
        state.validating = false;
      });
    },
    [field],
  );

  const clearNestedFieldStates = useCallback(
    (names: string[]) => {
      names.forEach((name) => resetFieldState(name));
    },
    [resetFieldState],
  );

  useEffect(() => {
    if (isComponentVisible) {
      showFieldState("beneficiaryType");
      return;
    }

    resetFieldState("beneficiaryType", {
      disableValidation: true,
      hideField: true,
    });
    resetFieldState("mediaLicenseNumberForBeneficiary", {
      disableValidation: true,
      hideField: true,
    });
    resetFieldState("beneficiaryName", {
      disableValidation: true,
      hideField: true,
    });
    resetFieldState("materialList", {
      disableValidation: true,
      hideField: true,
    });
  }, [isComponentVisible, resetFieldState, showFieldState]);

  useEffect(() => {
    if (showLicenseField) {
      showFieldState("mediaLicenseNumberForBeneficiary");
      return;
    }

    resetFieldState("mediaLicenseNumberForBeneficiary", {
      disableValidation: true,
      hideField: true,
    });
  }, [resetFieldState, showFieldState, showLicenseField]);

  useEffect(() => {
    if (showReadOnlyBeneficiaryName || showEditableBeneficiaryName) {
      showFieldState("beneficiaryName");
      return;
    }

    resetFieldState("beneficiaryName", {
      disableValidation: true,
      hideField: true,
    });
  }, [
    resetFieldState,
    showFieldState,
    showEditableBeneficiaryName,
    showReadOnlyBeneficiaryName,
  ]);

  useEffect(() => {
    if (showMaterialList) {
      showFieldState("materialList");
      return;
    }

    resetFieldState("materialList", {
      disableValidation: true,
      hideField: true,
    });
  }, [resetFieldState, showFieldState, showMaterialList]);

  useEffect(() => {
    let cancelled = false;

    const loadBeneficiaryTypeOptions = async () => {
      if (props.designMode) {
        setBeneficiaryTypeOptions(fallbackBeneficiaryTypeOptions);
        return;
      }

      try {
        const response = await getLookupData("BeneficiaryTypes");
        if (cancelled) return;

        const options = extractResponseArray<BeneficiaryTypeLookupItem>(response)
          .map<BeneficiaryTypeOption | null>((item) => {
            const value = Number(item.Id ?? item.id);
            if (!Number.isFinite(value)) return null;

            return {
              value,
              label:
                preferLocalizedEnAr(
                  isAr,
                  item.nameEn ?? item.NameEn,
                  item.nameAr ?? item.NameAr,
                ) || String(value),
            };
          })
          .filter((item): item is BeneficiaryTypeOption => Boolean(item));

        if (options.length > 0) {
          setBeneficiaryTypeOptions(options);
        }
      } catch {
        if (!cancelled) {
          setBeneficiaryTypeOptions(fallbackBeneficiaryTypeOptions);
        }
      }
    };

    loadBeneficiaryTypeOptions();

    return () => {
      cancelled = true;
    };
  }, [fallbackBeneficiaryTypeOptions, isAr, props.designMode]);

  const resetLookupState = useCallback(() => {
    setLookupState("idle");
    setLookupMessage("");
    setLookupLoading(false);
    setMaterialTypeOptionsLoading(false);
    setTypeOneEligibleMaterialTypeIds([]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMaterialTypeOptions = async () => {
      if (props.designMode) {
        setMaterialTypeOptions([]);
        setMaterialTypeOptionsLoading(false);
        return;
      }

      if (!beneficiaryType) {
        setMaterialTypeOptions([]);
        setMaterialTypeOptionsLoading(false);
        return;
      }

      setMaterialTypeOptionsLoading(true);
      try {
        if (beneficiaryType === 1 || beneficiaryType === 2) {
          const [customMaterialsResponse, materialTypesResponse] = await Promise.all([
            getLookupData("CustomMaterials"),
            getLookupData("MaterialTypes"),
          ]);
          if (cancelled) return;

          const customMaterials =
            extractResponseArray<CustomMaterialLookupItem>(customMaterialsResponse);
          const materialTypes =
            extractResponseArray<LookupMaterialTypeItem>(materialTypesResponse);
          const availableCustomMaterials = beneficiaryType === 1
            ? filterCustomMaterialsByMaterialTypeIds(
              customMaterials,
              typeOneEligibleMaterialTypeIds,
            )
            : customMaterials;

          setMaterialTypeOptions(
            buildCustomMaterialTypeOptions(
              availableCustomMaterials,
              materialTypes,
              isAr,
            ),
          );
          return;
        }

        const userTypeId = BENEFICIARY_TYPE_TO_USER_TYPE_ID[Number(beneficiaryType)];
        if (!userTypeId) {
          setMaterialTypeOptions([]);
          return;
        }

        const response = await getLookupData("MaterialTypes");
        if (cancelled) return;

        setMaterialTypeOptions(
          buildFilteredMaterialTypeOptions(
            extractResponseArray<LookupMaterialTypeItem>(response),
            userTypeId,
            isAr,
          ),
        );
      } catch {
        if (!cancelled) {
          setMaterialTypeOptions([]);
        }
      } finally {
        if (!cancelled) {
          setMaterialTypeOptionsLoading(false);
        }
      }
    };

    loadMaterialTypeOptions();

    return () => {
      cancelled = true;
    };
  }, [beneficiaryType, isAr, props.designMode, typeOneEligibleMaterialTypeIds]);

  const handleBeneficiaryTypeChange = useCallback(
    (value: number) => {
      clearNestedFieldStates([
        "beneficiaryType",
        "mediaLicenseNumberForBeneficiary",
        "beneficiaryName",
        "materialList",
      ]);
      resetLookupState();
      patch({
        beneficiaryType: value,
        mediaLicenseNumberForBeneficiary: "",
        mediaLicenseId: null,
        beneficiaryName: "",
        materialList: [],
      });
    },
    [clearNestedFieldStates, patch, resetLookupState],
  );

  const handleMediaLicenseNumberChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextLicenseNumber = event.target.value.slice(0, MEDIA_LICENSE_NUMBER_MAX_LEN);
      if (lookupState !== "idle" || current.beneficiaryName || current.materialList?.length) {
        clearNestedFieldStates([
          "mediaLicenseNumberForBeneficiary",
          "beneficiaryName",
          "materialList",
        ]);
        resetLookupState();
        patch({
          mediaLicenseNumberForBeneficiary: nextLicenseNumber,
          mediaLicenseId: null,
          beneficiaryName: "",
          materialList: [],
        });
        return;
      }

      patch({
        mediaLicenseNumberForBeneficiary: nextLicenseNumber,
      });
    },
    [
      clearNestedFieldStates,
      current.beneficiaryName,
      current.materialList,
      lookupState,
      patch,
      resetLookupState,
    ],
  );

  const handleBeneficiarySearch = useCallback(async () => {
    const mediaLicenseNumber = normalizeText(current.mediaLicenseNumberForBeneficiary);
    if (!mediaLicenseNumber) {
      CustomMessage.error(licenseRequiredMessage);
      return;
    }

    setLookupLoading(true);

    try {
      const response = await getMediaLicenseByNumber(mediaLicenseNumber);
      if (!response.certificateValid) {
        clearNestedFieldStates(["beneficiaryName", "materialList"]);
        patch({
          mediaLicenseId: null,
          beneficiaryName: "",
          materialList: [],
        });
        setLookupState("ineligible");
        setLookupMessage(licenseExpiredMessage);
        CustomMessage.error(licenseExpiredMessage);
        return;
      }

      const eligibleMaterialTypeIds = getEligibleMaterialTypeIds(response);
      if (eligibleMaterialTypeIds.length === 0) {
        clearNestedFieldStates(["beneficiaryName", "materialList"]);
        patch({
          mediaLicenseId: null,
          beneficiaryName: "",
          materialList: [],
        });
        setLookupState("ineligible");
        setLookupMessage(ineligibleActivityMessage);
        CustomMessage.error(ineligibleActivityMessage);
        return;
      }

      clearNestedFieldStates([
        "mediaLicenseNumberForBeneficiary",
        "beneficiaryName",
        "materialList",
      ]);
      setTypeOneEligibleMaterialTypeIds(eligibleMaterialTypeIds);
      patch({
        mediaLicenseId: response.mediaLicenseId,
        beneficiaryName:
          preferLocalizedEnAr(
            isAr,
            response.establishmentNameEn,
            response.establishmentNameAr,
          ) || mediaLicenseNumber,
        materialList: [],
      });
      setLookupState("eligible");
      setLookupMessage("");
    } catch (error) {
      clearNestedFieldStates(["beneficiaryName", "materialList"]);
      patch({
        mediaLicenseId: null,
        beneficiaryName: "",
        materialList: [],
      });

      const status = getErrorStatus(error);
      if (status === 404) {
        setLookupState("not_found");
        setLookupMessage(licenseNotFoundMessage);
        CustomMessage.error(licenseNotFoundMessage);
        return;
      }

      if (status === 400) {
        setLookupState("idle");
        setLookupMessage(licenseRequiredMessage);
        CustomMessage.error(licenseRequiredMessage);
        return;
      }

      setLookupState("idle");
      setLookupMessage(licenseLookupFailedMessage);
      CustomMessage.error(licenseLookupFailedMessage);
    } finally {
      setLookupLoading(false);
    }
  }, [
    clearNestedFieldStates,
    current.mediaLicenseNumberForBeneficiary,
    ineligibleActivityMessage,
    isAr,
    licenseExpiredMessage,
    licenseLookupFailedMessage,
    licenseNotFoundMessage,
    licenseRequiredMessage,
    patch,
  ]);

  const renderLabel = (label: string, required = true) => (
    <div className="beneficiary-type-label">
      <span>
        {label}
        {required && <span className="beneficiary-type-required">*</span>}
      </span>
    </div>
  );

  if (!isComponentVisible) {
    return null;
  }

  const showBeneficiaryNameField = showReadOnlyBeneficiaryName || showEditableBeneficiaryName;
  const showInlineLicenseField = showLicenseField && !showBeneficiaryNameField;

  const renderLicenseField = () => (
    <div className="beneficiary-type-field">
      {renderLabel(t("BeneficiaryType.label.mediaLicenseNumberForBeneficiary"))}
      <Field
        name="mediaLicenseNumberForBeneficiary"
        validator={(value: unknown) => (isTypeOne && !normalizeText(value)
          ? licenseRequiredMessage
          : "")}
        decorator={[FormItem]}
      >
        <div className="beneficiary-type-query-row">
          <Input
            disabled={disabled}
            maxLength={MEDIA_LICENSE_NUMBER_MAX_LEN}
            placeholder={t(
              "BeneficiaryType.placeholder.mediaLicenseNumberForBeneficiary",
            )}
            value={current.mediaLicenseNumberForBeneficiary}
            onChange={handleMediaLicenseNumberChange}
            onPressEnter={() => {
              if (!lookupLoading) {
                handleBeneficiarySearch();
              }
            }}
          />
          <Button
            type="primary"
            disabled={disabled}
            loading={lookupLoading}
            onClick={handleBeneficiarySearch}
          >
            {t("BeneficiaryType.action.search")}
          </Button>
        </div>
      </Field>
      {lookupMessage ? (
        <div className="beneficiary-type-feedback">
          <Text type="danger">{lookupMessage}</Text>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={`beneficiary-type-container ${props.className || ""}`}>
      <AntdCard className="beneficiary-type-card" title={t("BeneficiaryType.title")}>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <div className="beneficiary-type-field">
              {renderLabel(t("BeneficiaryType.label.beneficiaryType"))}
              <Field
                name="beneficiaryType"
                validator={(value: unknown) =>
                  value ? "" : beneficiaryTypeRequiredMessage
                }
                decorator={[FormItem]}
              >
                <Select
                  disabled={disabled}
                  placeholder={t("BeneficiaryType.placeholder.beneficiaryType")}
                  value={current.beneficiaryType}
                  onChange={(value) => handleBeneficiaryTypeChange(value as number)}
                >
                  {beneficiaryTypeOptions.map((item) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>
              </Field>
            </div>
          </Col>
          {showBeneficiaryNameField && (
            <Col xs={24} md={12}>
              <div className="beneficiary-type-field">
                {renderLabel(t("BeneficiaryType.label.beneficiaryName"))}
                <Field
                  name="beneficiaryName"
                  validator={(value: unknown) => {
                    if (!showBeneficiaryNameField) {
                      return "";
                    }

                    return normalizeText(value) ? "" : beneficiaryNameRequiredMessage;
                  }}
                  decorator={[FormItem]}
                >
                  <Input
                    disabled={disabled || showReadOnlyBeneficiaryName}
                    placeholder={t("BeneficiaryType.placeholder.beneficiaryName")}
                    value={current.beneficiaryName}
                    onChange={(event) =>
                      patch({
                        beneficiaryName: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
            </Col>
          )}
          {showInlineLicenseField && (
            <Col xs={24} md={12}>
              {renderLicenseField()}
            </Col>
          )}
        </Row>

        {showLicenseField && !showInlineLicenseField && (
          <Row gutter={24}>
            <Col span={24}>
              {renderLicenseField()}
            </Col>
          </Row>
        )}

        {showMaterialList && (
          <Row gutter={24}>
            <Col span={24}>
              <div className="beneficiary-type-field beneficiary-type-material-list">
                <Field
                  name="materialList"
                  validator={(value: unknown) =>
                    showMaterialList && (!Array.isArray(value) || value.length === 0)
                      ? materialListRequiredMessage
                      : ""}
                  decorator={[FormItem]}
                >
                  <MaterialListTable
                    value={current.materialList}
                    onChange={(value) =>
                      patch({
                        materialList: value,
                      })
                    }
                    materialTypeOptions={materialTypeOptions}
                    loading={materialTypeOptionsLoading}
                    disabled={disabled}
                    addButtonText={t("BeneficiaryType.action.addMaterial")}
                    title={t("BeneficiaryType.label.materialList")}
                    required={showMaterialList}
                    designMode={props.designMode}
                  />
                </Field>
              </div>
            </Col>
          </Row>
        )}
      </AntdCard>
    </div>
  );
});

BeneficiaryTypeField.displayName = "BeneficiaryTypeField";

export default BeneficiaryTypeField;
