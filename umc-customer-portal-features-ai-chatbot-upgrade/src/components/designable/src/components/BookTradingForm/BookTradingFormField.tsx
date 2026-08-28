import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField, useForm, Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import {
  Input,
  Select,
  Row,
  Col,
  Radio,
  Card as AntdCard,
  Tooltip,
} from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import {
  resolveBookCollectTypeKindById,
  type BookCollectTypeKind,
} from "@/utils/bookCollectTypeKind";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import CustomMessage from "../../../../../components/common/CustomMessage";
import { analyzeBookMaterial } from "@/services/myRequest";

const { Option } = Select;
import { LanguageSelect as LanguageSelectComponent } from "../LanguageSelect/LanguageSelect";
import DocumentViewer from "../../../../../components/common/DocumentViewer/index";

import {
  getAgeClassifications,
  getLanguages,
  getLookupData,
  getPrintingPermitByProfileId,
  resolveAgeClassificationMediaMaterialTypeId,
  getRegulateEntryBooksByApplicationNumber,
  getRegulateEntryByProfileId,
  getSelfMonitorProgramStatus,
  getSubjectList,
  getSubjectSubList,
  type RegulateEntryBookOption,
  type Service204SelfMonitorProgramStatus,
} from "../../../../../services/services";
import { useUserStore } from "@/store/user";
import {
  buildRegulateEntryBookOptions,
  buildRegulateEntryBookPrefill,
  isLibraryApprovedBook,
} from "./bookTradingRules";

interface Subject {
  id: number;
  nameAr: string;
  nameEn: string;
  code: string;
  descAr: string | null;
  descEn: string | null;
}

interface SubjectSubCategory {
  id: number;
  nameEn: string;
  nameAr?: string;
  subjectCategoryId: number;
  [key: string]: unknown;
}

type BookTradingFormValue = {
  HowDidYouGetTheBook?: string | number;
  BookType?: string;
  PublicationsPrintingPermit?: string;
  RegulateEntryMediaMaterial?: string;
  PleaseSelectBook?: string;
  NumberOfCopies?: string;
  UploadMaterial?: string;
  BookTitle?: string;
  AuthorName?: string;
  NationalDepositoryNo?: string;
  ISBN?: string;
  PrintYear?: string;
  VersionNumber?: string;
  Language?: string | Array<string | number>;
  SubjectCategory?: number;
  SubjectSubCategory?: number;
  AgeClassification?: number;
  DistributorAgency?: string;
  UploadPurchaseInvoice?: string;
  [key: string]: unknown;
};

type OptionType = {
  label: string;
  value: number | string;
  [key: string]: unknown;
};

type LocalizedLookupItem = {
  id?: number | string;
  Id?: number | string;
  nameEn?: string;
  nameAr?: string;
  NameEn?: string;
  NameAr?: string;
  descEn?: string | null;
  descAr?: string | null;
  [key: string]: unknown;
};

type ValidationResult = string | void;
type BookTradingFieldValidator = (value: unknown) => ValidationResult;

type UploadFieldConfig = {
  accept: string;
  maxSize: number;
  uploadTip: string;
  invalidFileTypeMessage: string;
  maxSizeErrorMessage: string;
};

type BookTradingFormFieldProps = {
  disabled?: boolean;
  serviceCode?: number | string;
  [key: string]: unknown;
};

type BookTradingField = {
  value?: BookTradingFormValue;
  setValue: (value?: BookTradingFormValue) => void;
  address: string;
  pattern?: string;
  query: (address: string) => {
    take: () => BookTradingNestedField | undefined;
  };
};

type BookTradingNestedFieldState = {
  visible?: boolean;
  display?: "visible" | "none" | "hidden";
  required?: boolean;
  selfErrors?: unknown[];
  selfWarnings?: unknown[];
  selfSuccesses?: unknown[];
  selfValidating?: boolean;
  validating?: boolean;
};

type BookTradingNestedField = {
  setFeedback?: (feedback: { type: string; messages: unknown[] }) => void;
  setState?: (updater: (state: BookTradingNestedFieldState) => void) => void;
  setValidator?: (validator?: BookTradingFieldValidator) => void;
};

const isReadOnlyPattern = (pattern?: string) =>
  pattern === "disabled" || pattern === "readOnly" || pattern === "readPretty";

type BookCollectTypeLookupItem = {
  Id?: number | string;
  NameEn?: string;
  NameAr?: string;
  IsShow?: boolean;
};

type ConditionalBookTradingFieldName =
  | "PublicationsPrintingPermit"
  | "UploadMaterial"
  | "RegulateEntryMediaMaterial"
  | "PleaseSelectBook"
  | "BookTitle"
  | "AuthorName"
  | "NationalDepositoryNo"
  | "ISBN"
  | "PrintYear"
  | "VersionNumber"
  | "Language"
  | "SubjectCategory"
  | "SubjectSubCategory"
  | "DistributorAgency"
  | "NumberOfCopies"
  | "UploadPurchaseInvoice";

const SET_VALIDATOR_MANAGED_FIELD_NAMES: Record<
  ConditionalBookTradingFieldName,
  true
> = {
  PublicationsPrintingPermit: true,
  UploadMaterial: true,
  RegulateEntryMediaMaterial: true,
  PleaseSelectBook: true,
  BookTitle: true,
  AuthorName: true,
  NationalDepositoryNo: true,
  ISBN: true,
  PrintYear: true,
  VersionNumber: true,
  Language: true,
  SubjectCategory: true,
  SubjectSubCategory: true,
  DistributorAgency: true,
  NumberOfCopies: true,
  UploadPurchaseInvoice: true,
};

const getInlineValidator = (
  name: string,
  validator?: BookTradingFieldValidator,
) =>
  Object.prototype.hasOwnProperty.call(SET_VALIDATOR_MANAGED_FIELD_NAMES, name)
    ? undefined
    : validator;

type ConditionalFieldConfig = {
  name: ConditionalBookTradingFieldName;
  visible: boolean;
  required: boolean;
  disabled: boolean;
  emptyValue: BookTradingFormValue[ConditionalBookTradingFieldName];
  validators: BookTradingFieldValidator[];
  validator: BookTradingFieldValidator;
};

const BOOK_TYPE_VALUES = ["Paper", "Electronic"] as const;

const ISBN_PATTERN =
  /^(?:\d{9}[\dXx]|\d{3}-?\d{1,5}-?\d{1,7}-?\d{1,7}-?[\dXx])$/;
const VERSION_NUMBER_PATTERN = /^\d{0,2}(?:\.\d{0,2})?$/;
const CURRENT_YEAR = new Date().getFullYear();

const UPLOAD_MATERIAL_BASE_CONFIG = {
  accept: ".pdf,.epub,.mobi",
  maxSize: 50,
};

const UPLOAD_PURCHASE_INVOICE_BASE_CONFIG = {
  accept: ".pdf,.jpg,.png",
  maxSize: 10,
};

const isEmptyValue = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const extractResponseArray = <T,>(response: unknown): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object" && "data" in response) {
    const data = (response as { data?: unknown }).data;
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return [];
};

const normalizeLookupLabel = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const collectLookupLabels = (option: OptionType) =>
  [
    option.label,
    (option as LocalizedLookupItem).nameEn,
    (option as LocalizedLookupItem).nameAr,
    (option as LocalizedLookupItem).NameEn,
    (option as LocalizedLookupItem).NameAr,
  ]
    .map((value) => normalizeLookupLabel(value))
    .filter(Boolean);

const findOptionValueByLookupLabels = (
  options: OptionType[],
  targetLabel: unknown,
) => {
  const normalizedTarget = normalizeLookupLabel(targetLabel);
  if (!normalizedTarget) return undefined;

  return options.find((option) =>
    collectLookupLabels(option).includes(normalizedTarget),
  )?.value;
};

const findOptionValuesByLookupLabels = (
  options: OptionType[],
  targetLabels: unknown,
) => {
  const normalizedLabels = (
    Array.isArray(targetLabels) ? targetLabels : [targetLabels]
  )
    .map((value) => normalizeLookupLabel(value))
    .filter(Boolean);

  if (normalizedLabels.length === 0) {
    return [];
  }

  return normalizedLabels
    .map(
      (label) =>
        options.find((option) => collectLookupLabels(option).includes(label))
          ?.value,
    )
    .filter(
      (value): value is string | number =>
        value !== undefined && value !== null && value !== "",
    );
};

const getStringLengthValidator =
  (maxLength: number, message: string) =>
  (value: unknown): ValidationResult => {
    if (isEmptyValue(value)) return;
    return String(value).length > maxLength ? message : undefined;
  };

const getRequiredValidator =
  (required: boolean, message: string) =>
  (value: unknown): ValidationResult => {
    if (!required) return;
    return isEmptyValue(value) ? message : undefined;
  };

const runValidationPipeline = (
  value: unknown,
  validators: Array<BookTradingFieldValidator | undefined>,
) => {
  for (const validator of validators) {
    if (!validator) continue;
    const result = validator(value);
    if (result) return result;
  }
  return "";
};

const NO_OP_VALIDATOR: BookTradingFieldValidator = () => "";

const getPatternValidator =
  (pattern: RegExp, message: string): BookTradingFieldValidator =>
  (value) => {
    if (isEmptyValue(value)) return;
    return pattern.test(String(value)) ? undefined : message;
  };

const createConditionalFieldValidator = ({
  visible,
  required,
  disabled,
  validators = [],
  requiredMessage,
  includeRequiredValidator = true,
}: Pick<
  ConditionalFieldConfig,
  "visible" | "required" | "disabled" | "validators"
> & {
  requiredMessage: string;
  includeRequiredValidator?: boolean;
}): BookTradingFieldValidator => {
  if (!visible || disabled) {
    return NO_OP_VALIDATOR;
  }

  return (value) =>
    runValidationPipeline(value, [
      includeRequiredValidator
        ? getRequiredValidator(required, requiredMessage)
        : undefined,
      ...validators,
    ]);
};

const toOptionalString = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : undefined;
};

const toOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : undefined;
};

const toLanguageIds = (value: unknown) => {
  if (typeof value === "string") {
    const languageIds = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return languageIds.length > 0 ? languageIds : undefined;
  }

  if (!Array.isArray(value)) return undefined;

  const languageIds = value.filter(
    (languageId): languageId is string | number =>
      languageId !== undefined && languageId !== null && languageId !== "",
  );

  return languageIds.length > 0 ? languageIds : undefined;
};

const buildPrintingPermitPrefill = (
  permit?: Partial<Record<string, unknown>>,
): Partial<BookTradingFormValue> => ({
  BookTitle: toOptionalString(permit?.title),
  AuthorName: toOptionalString(permit?.authorName),
  VersionNumber: toOptionalString(permit?.editionNumber),
  NationalDepositoryNo: toOptionalString(permit?.nationalDepositoryNo),
  ISBN: toOptionalString(permit?.isbn),
  PrintYear: toOptionalString(permit?.printYear),
  Language: toLanguageIds(permit?.languageIds),
  SubjectCategory: toOptionalNumber(permit?.subjectCategoryId),
  SubjectSubCategory: toOptionalNumber(permit?.subjectSubCategoryId),
  DistributorAgency: toOptionalString(permit?.distributor),
});

export const BookTradingFormField: React.FC<BookTradingFormFieldProps> =
  observer((props) => {
    const { t, i18n } = useTranslation();
    const field = useField<BookTradingField>();
    const form = useForm();
    if (!field) {
      return null;
    }

    const isAr = Boolean(i18n.language?.startsWith("ar"));
    const currentLanguage = i18n.language ?? "";
    const currentProfileId = useUserStore((state) => state.currentProfileId);
    const userEstablishments = useUserStore(
      (state) => state.userInfo.userEstablishments,
    );
    const current = (field.value || {}) as BookTradingFormValue;
    const currentSearch =
      typeof window === "undefined" ? "" : window.location.search;
    const isEditAction = useMemo(() => {
      const action =
        new URLSearchParams(currentSearch).get("actions") || "";

      return action.trim().toLowerCase() === "edit";
    }, [currentSearch]);
    const isReadOnlyMode =
      props.disabled ||
      isReadOnlyPattern(field.pattern) ||
      isReadOnlyPattern((form as { pattern?: string } | undefined)?.pattern);
    const [subjectCategoryRows, setSubjectCategoryRows] = useState<Subject[]>(
      [],
    );
    const [subjectSubCategoryRows, setSubjectSubCategoryRows] = useState<
      SubjectSubCategory[]
    >([]);
    const [languageOptions, setLanguageOptions] = useState<OptionType[]>([]);
    const [bookCollectTypeRows, setBookCollectTypeRows] = useState<
      BookCollectTypeLookupItem[]
    >([]);
    const [printingPermitRows, setPrintingPermitRows] = useState<
      Array<Record<string, unknown>>
    >([]);
    const [regulateEntryRows, setRegulateEntryRows] = useState<
      Array<Record<string, unknown>>
    >([]);
    const [bookSelectOptions, setBookSelectOptions] = useState<OptionType[]>(
      [],
    );
    const [ageClassificationRows, setAgeClassificationRows] = useState<
      LocalizedLookupItem[]
    >([]);
    const [selfMonitorProgramStatus, setSelfMonitorProgramStatus] =
      useState<Service204SelfMonitorProgramStatus>("None");
    const requiredMessage = t("BookTradingForm.validation.required");

    useEffect(() => {
      getSubjectList().then((res) => {
        const subjectList = extractResponseArray<Subject>(res);
        setSubjectCategoryRows(subjectList);
      });

      getLanguages().then((res) => {
        const rows = extractResponseArray<LocalizedLookupItem>(res);
        setLanguageOptions(
          rows.map((item) => {
            const value = item.Id ?? item.id ?? "";
            return {
              label:
                preferLocalizedEnAr(
                  isAr,
                  item.nameEn ?? item.NameEn,
                  item.nameAr ?? item.NameAr,
                ) || String(value),
              value,
              ...item,
            };
          }),
        );
      });

      getLookupData("BookCollectTypes", props.serviceCode).then((res) => {
        const lookupList = Array.isArray(res?.data)
          ? (res.data as BookCollectTypeLookupItem[])
          : [];
        setBookCollectTypeRows(lookupList);
      });

      // FE-3: Age Classification options for Self-Monitor auto-approval.
      //
      // Ratings are scoped per media material type, so 204 asks for Book. A
      // service with no mapping gets no request at all — offering another
      // material's scale would be worse than an empty dropdown.
      //
      // Not getAgeRatingPermitAPI: that reads the permit business table and
      // has no age scale of its own.
      const ageClassificationMediaMaterialTypeId =
        resolveAgeClassificationMediaMaterialTypeId(props.serviceCode);

      if (ageClassificationMediaMaterialTypeId === undefined) {
        setAgeClassificationRows([]);
      } else {
        getAgeClassifications(ageClassificationMediaMaterialTypeId)
          .then((res) => {
            const rows = Array.isArray(res?.data)
              ? (res.data as unknown as LocalizedLookupItem[])
              : [];
            setAgeClassificationRows(rows);
          })
          .catch(() => {
            setAgeClassificationRows([]);
          });
      }
    }, [isAr, props.serviceCode]);

    useEffect(() => {
      const profileId = String(currentProfileId || "").trim();
      if (!profileId) {
        setPrintingPermitRows([]);
        setRegulateEntryRows([]);
        return;
      }

      getPrintingPermitByProfileId(profileId, 1)
        .then((res) => {
          const rows = Array.isArray(res?.data)
            ? (res.data as Array<Record<string, unknown>>)
            : [];
          setPrintingPermitRows(rows);
        })
        .catch(() => {
          setPrintingPermitRows([]);
        });

      getRegulateEntryByProfileId(profileId)
        .then((res) => {
          const rows = Array.isArray(res?.data)
            ? (res.data as Array<Record<string, unknown>>)
            : [];
          setRegulateEntryRows(rows);
        })
        .catch(() => {
          setRegulateEntryRows([]);
        });
    }, [currentProfileId]);

    // FE-3: Self-Monitor status gating the Age Classification dropdown.
    //
    // The status now comes from the establishment profile detail, which is
    // keyed by establishment id — `currentProfileId` is a *user profile* id, so
    // it has to be mapped through userEstablishments first. When no
    // establishment matches (personal profile) the helper reports "None" and
    // the dropdown stays hidden, which is the safe direction.
    //
    // TODO: CPS recommends driving this from the rule/validate response
    // (`isSelfMonitorEnterprise` / `selfMonitorProgramStatus`) instead, so the
    // verdict is evaluated with the submission. Tracked separately.
    useEffect(() => {
      let active = true;
      const establishmentId = userEstablishments.find(
        (item) => String(item.userProfileId) === String(currentProfileId),
      )?.id;

      getSelfMonitorProgramStatus(establishmentId)
        .then((res) => {
          if (active) {
            setSelfMonitorProgramStatus(res?.status ?? "None");
          }
        })
        .catch(() => {
          if (active) {
            setSelfMonitorProgramStatus("None");
          }
        });
      return () => {
        active = false;
      };
    }, [currentProfileId, userEstablishments]);

    useEffect(() => {
      const fetchSubjectSubList = async () => {
        if (current.SubjectCategory) {
          try {
            const res = await getSubjectSubList();
            const subjectSubList = (res.data || []) as SubjectSubCategory[];
            setSubjectSubCategoryRows(subjectSubList);
          } catch (error) {
            console.error("Failed to fetch subject sub list:", error);
            setSubjectSubCategoryRows([]);
          }
        } else {
          setSubjectSubCategoryRows([]);
        }
      };

      fetchSubjectSubList();
    }, [current.SubjectCategory]);

    useEffect(() => {
      // The permit dropdown stores the regulate-entry **id** (it ships as
      // `regulateEntryId` in the Service204 payload), but the book list is
      // keyed by the source 302 **application number** — e.g. "MC-2-302-9878933".
      // Resolve one from the other through the rows that fed the dropdown;
      // passing the id straight through returns an empty list.
      const selectedPermitValue = toOptionalString(
        current.RegulateEntryMediaMaterial,
      );

      const selectedPermitRow = selectedPermitValue
        ? regulateEntryRows.find((row) =>
            [row.id, row.Id, row.applicationNumber, row.ApplicationNumber].some(
              (candidate) =>
                candidate != null &&
                String(candidate) === String(selectedPermitValue),
            ),
          )
        : undefined;

      // Rows without an id fall back to the application number as their option
      // value, so the selected value may already be the number itself.
      const applicationNumber =
        toOptionalString(
          selectedPermitRow?.applicationNumber ??
            selectedPermitRow?.ApplicationNumber,
        ) || undefined;

      if (!applicationNumber) {
        setBookSelectOptions([]);
        return;
      }

      let isActive = true;
      setBookSelectOptions([]);

      getRegulateEntryBooksByApplicationNumber(applicationNumber)
        .then((rows) => {
          if (!isActive) {
            return;
          }

          const options = buildRegulateEntryBookOptions(rows);
          setBookSelectOptions(options.length ? options : []);
        })
        .catch((error) => {
          console.error("Failed to fetch regulate entry book options:", error);
          if (isActive) {
            setBookSelectOptions([]);
          }
        });

      return () => {
        isActive = false;
      };
      // regulateEntryRows loads asynchronously, so the lookup above has to rerun
      // once it arrives — otherwise a permit restored from a draft resolves to
      // no application number and the book list stays empty.
    }, [current.RegulateEntryMediaMaterial, regulateEntryRows]);

    const resolvePermitOptionLabel = React.useCallback(
      (item: Record<string, unknown>) => {
        const localizedName = preferLocalizedEnAr(
          isAr,
          String(item.nameEn ?? item.NameEn ?? ""),
          String(item.nameAr ?? item.NameAr ?? ""),
        );

        return (
          localizedName ||
          String(
            item.ApplicationNumber ||
              item.applicationNumber ||
              item.PermitNumber ||
              item.permitNumber ||
              item.Id ||
              item.id ||
              "",
          )
        );
      },
      [currentLanguage, isAr],
    );

    const subjectCategoryOptions = useMemo<OptionType[]>(
      () =>
        subjectCategoryRows.map((item) => ({
          label:
            preferLocalizedEnAr(isAr, item.nameEn, item.nameAr) ||
            String(item.id),
          value: item.id,
          ...item,
        })),
      [currentLanguage, isAr, subjectCategoryRows],
    );

    const subjectSubCategoryOptions = useMemo<OptionType[]>(
      () =>
        subjectSubCategoryRows
          .filter((item) => item.subjectCategoryId === current.SubjectCategory)
          .map((item) => ({
            label:
              preferLocalizedEnAr(isAr, item.nameEn, item.nameAr) ||
              String(item.id),
            value: item.id,
            ...item,
          })),
      [current.SubjectCategory, currentLanguage, isAr, subjectSubCategoryRows],
    );

    // FE-3: the whole scale for the media material type is offered — do not
    // filter on `isSelfMonitored`.
    //
    // That flag is auto-approval condition 6 (spec §6.2), evaluated by the
    // engine at submission, not a display rule. AC-19 requires that picking a
    // non-self-monitored rating be possible and send the application to manual
    // review; filtering those entries out would make that case unreachable.
    // (The integration guide §5.2 says to show only IsSelfMonitored == 1 — that
    // contradicts the spec, and the spec wins.)
    const ageClassificationOptions = useMemo<OptionType[]>(() => {
      return ageClassificationRows.map((item) => {
        const value = item.Id ?? item.id ?? "";
        return {
          label:
            preferLocalizedEnAr(
              isAr,
              item.nameEn ?? item.NameEn,
              item.nameAr ?? item.NameAr,
            ) || String(value),
          value,
          ...item,
        };
      });
    }, [ageClassificationRows, currentLanguage, isAr]);

    const bookCollectTypeOptions = useMemo<OptionType[]>(
      () =>
        bookCollectTypeRows
          .filter((item) => item?.IsShow !== false)
          .map((item) => ({
            label:
              preferLocalizedEnAr(
                isAr,
                String(item.NameEn ?? ""),
                String(item.NameAr ?? ""),
              ) || String(item.Id || ""),
            value: item.Id ?? "",
            kind: resolveBookCollectTypeKindById(item),
            ...item,
          })),
      [bookCollectTypeRows, currentLanguage, isAr],
    );

    const printingPermitOptions = useMemo<OptionType[]>(
      () =>
        printingPermitRows.map((item) => ({
          label:
            String(
              item.ApplicationNumber ||
                item.applicationNumber ||
                item.PermitNumber ||
                item.permitNumber ||
                item.Id ||
                item.id ||
                "",
            ) || resolvePermitOptionLabel(item),
          value: String(
            item.ApplicationNumber ||
              item.applicationNumber ||
              item.PermitNumber ||
              item.permitNumber ||
              item.Id ||
              item.id ||
              "",
          ),
          ...item,
        })),
      [printingPermitRows, resolvePermitOptionLabel],
    );

    const regulateEntryOptions = useMemo<OptionType[]>(
      () =>
        regulateEntryRows.map((item) => ({
          label: resolvePermitOptionLabel(item),
          value:
            (item.id as string | number | undefined) ??
            (item.Id as string | number | undefined) ??
            (item.applicationNumber as string | number | undefined) ??
            (item.ApplicationNumber as string | number | undefined) ??
            "",
          ...item,
        })),
      [regulateEntryRows, resolvePermitOptionLabel],
    );

    const bookTypeOptions = useMemo(
      () =>
        BOOK_TYPE_VALUES.map((value) => ({
          label: t(`BookTradingForm.option.bookType.${value}`),
          value,
        })),
      [currentLanguage, t],
    );

    const uploadMaterialConfig = useMemo<UploadFieldConfig>(() => {
      const uploadTip = t("BookTradingForm.uploadTip.uploadMaterial");
      return {
        ...UPLOAD_MATERIAL_BASE_CONFIG,
        uploadTip,
        invalidFileTypeMessage: uploadTip,
        maxSizeErrorMessage: uploadTip,
      };
    }, [currentLanguage, t]);

    const uploadPurchaseInvoiceConfig = useMemo<UploadFieldConfig>(() => {
      const uploadTip = t("BookTradingForm.uploadTip.purchaseInvoice");
      return {
        ...UPLOAD_PURCHASE_INVOICE_BASE_CONFIG,
        uploadTip,
        invalidFileTypeMessage: uploadTip,
        maxSizeErrorMessage: uploadTip,
      };
    }, [currentLanguage, t]);

    const nationalDepositoryValidator = useMemo(
      () =>
        getPatternValidator(
          /^[A-Za-z0-9]+$/,
          t("BookTradingForm.validation.nationalDepository"),
        ),
      [currentLanguage, t],
    );

    const isbnValidator = useMemo(
      () =>
        getPatternValidator(ISBN_PATTERN, t("BookTradingForm.validation.isbn")),
      [currentLanguage, t],
    );

    const printYearValidator = useMemo<BookTradingFieldValidator>(
      () => (value) => {
        if (isEmptyValue(value)) return;
        if (!/^\d{4}$/.test(String(value))) {
          return t("BookTradingForm.validation.printYear");
        }

        const year = Number(value);
        if (year < 1900 || year > CURRENT_YEAR) {
          return t("BookTradingForm.validation.printYear");
        }
      },
      [currentLanguage, t],
    );

    const numberOfCopiesValidator = useMemo<BookTradingFieldValidator>(
      () => (value) => {
        if (isEmptyValue(value)) return;
        if (!/^[1-9]\d*$/.test(String(value))) {
          return t("BookTradingForm.validation.copiesPositiveInteger");
        }

        if (String(value).length > 10) {
          return t("BookTradingForm.validation.copiesMaxDigits");
        }

        const count = Number(value);
        if (count < 1 || count > 9999999999) {
          return t("BookTradingForm.validation.copiesBetween");
        }
      },
      [currentLanguage, t],
    );

    const versionNumberValidator = useMemo<BookTradingFieldValidator>(
      () => (value) => {
        if (isEmptyValue(value)) return;

        const normalizedValue = String(value).trim();
        if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(normalizedValue)) {
          return t("BookTradingForm.validation.versionNumber");
        }

        const versionNumber = Number(normalizedValue);
        if (
          !Number.isFinite(versionNumber) ||
          versionNumber <= 0 ||
          versionNumber > 99.99
        ) {
          return t("BookTradingForm.validation.versionNumber");
        }
      },
      [currentLanguage, t],
    );

    const selectedOption = current.HowDidYouGetTheBook;
    const selectedBookCollectType = bookCollectTypeOptions.find(
      (option) =>
        String(option.value) === String(current.HowDidYouGetTheBook ?? ""),
    );
    // Read-only historical forms must not depend on the async lookup request to identify
    // Regulate Entry. Resolve the persisted id as a fallback when options are not loaded.
    const selectedBookCollectTypeKind = (selectedBookCollectType?.kind ||
      resolveBookCollectTypeKindById(current.HowDidYouGetTheBook) ||
      "Unknown") as BookCollectTypeKind;
    const isPrintingPermit = selectedBookCollectTypeKind === "PrintingPermit";
    const isRegulateEntry =
      selectedBookCollectTypeKind === "RegulateEntryPermit";
    const isBookFair = selectedBookCollectTypeKind === "BookFair";
    const isLocalDistributor =
      selectedBookCollectTypeKind === "LocalDistributor";
    const isSampleForTest = selectedBookCollectTypeKind === "SampleForTest";
    const isElectronicBookType = current.BookType === "Electronic";
    const isService204RegulateEntry =
      Number(props.serviceCode) === 204 && isRegulateEntry;
    // FE-3: Age Classification dropdown visibility (AC-09/10).
    // Book Trading (204) + Regulate Entry + Trial/Active Self-Monitor enterprise, and only while
    // the book still needs a classification: a book already Approved in the content library is
    // auto-approved off that library without a human step, so nobody is waiting on the applicant to
    // classify it and the row would only invite an unreviewed edit to a book the reviewer already
    // rated. The options carry the library status per ISBN (isApproved), and the same lookup runs
    // in read-only mode, so the selected book is resolved by the ISBN the form already holds.
    const selectedLibraryBook = bookSelectOptions.find(
      (option) => String(option.value) === String(current.ISBN ?? ""),
    ) as Partial<RegulateEntryBookOption> | undefined;
    const isSelfMonitorEnterpriseActive =
      selfMonitorProgramStatus === "Active" ||
      selfMonitorProgramStatus === "Trial";
    const showAgeClassification =
      isService204RegulateEntry &&
      isSelfMonitorEnterpriseActive &&
      !isLibraryApprovedBook(selectedLibraryBook);
    // Read-only rendering follows the very same rule. A draft opened from its view page is
    // read-only too, so deciding visibility by "does the form already carry a value" there hid the
    // still-empty row the applicant is supposed to fill in — the library status is the single
    // criterion in both modes.
    const showAgeClassificationField = showAgeClassification;
    const showUploadPurchaseInvoice = isBookFair || isLocalDistributor;
    const showNumberOfCopies =
      isRegulateEntry || isBookFair || isLocalDistributor || isSampleForTest;
    const showUploadMaterial = isElectronicBookType;
    const showPleaseSelectBook =
      isRegulateEntry && !!current.RegulateEntryMediaMaterial;
    const shouldShowDetails =
      !!selectedBookCollectType || !isEmptyValue(selectedOption);
    // Shown whenever the acquisition details are shown, in every mode and for every service that
    // renders this form. Hiding it in read-only mode when the value was empty made a draft's view
    // page silently drop the field instead of showing it as not-yet-filled.
    const showDistributorAgency = shouldShowDetails;
    const pleaseSelectBookTargetValue = useMemo(() => {
      if (isEditAction) {
        return toOptionalString(current.ISBN);
      }

      if (isReadOnlyMode) {
        return toOptionalString(current.BookTitle);
      }

      return undefined;
    }, [current.BookTitle, current.ISBN, isEditAction, isReadOnlyMode]);
    const displayPleaseSelectBookValue =
      pleaseSelectBookTargetValue
        ? pleaseSelectBookTargetValue
        : current.PleaseSelectBook;
    const pleaseSelectBookFallbackLabel =
      isEditAction && current.BookTitle
        ? toOptionalString(current.BookTitle)
        : pleaseSelectBookTargetValue;
    const displayBookSelectOptions = useMemo<OptionType[]>(() => {
      if (!pleaseSelectBookTargetValue) {
        return bookSelectOptions;
      }

      const hasDisplayValueOption = bookSelectOptions.some(
        (option) => String(option.value) === pleaseSelectBookTargetValue,
      );

      if (hasDisplayValueOption) {
        return bookSelectOptions;
      }

      return [
        ...bookSelectOptions,
        {
          label: pleaseSelectBookFallbackLabel || pleaseSelectBookTargetValue,
          value: pleaseSelectBookTargetValue,
        },
      ];
    }, [
      bookSelectOptions,
      pleaseSelectBookFallbackLabel,
      pleaseSelectBookTargetValue,
    ]);
    const isBookTypeLocked = isService204RegulateEntry;
    const printingPermitReadonlyFields = useMemo(
      () =>
        new Set([
          "BookTitle",
          "AuthorName",
          "NationalDepositoryNo",
          "ISBN",
          "Language",
          "SubjectCategory",
        ]),
      [],
    );

    useEffect(() => {
      if (
        isReadOnlyMode ||
        !isService204RegulateEntry ||
        current.BookType?.toLowerCase() === "paper"
      ) {
        return;
      }

      const latestValue = (field.value || {}) as BookTradingFormValue;
      field.setValue({
        ...latestValue,
        BookType: "Paper",
        UploadMaterial: undefined,
      });
    }, [current.BookType, field, isReadOnlyMode, isService204RegulateEntry]);

    // Keep business-level field locks separate from the form-wide review lock so
    // required labels remain accurate while review controls stay non-editable.
    const getFieldBusinessDisabled = React.useCallback(
      (name: string, readonly = false) => {
        if (name === "BookType" && isBookTypeLocked) return true;
        if (name === "NumberOfCopies" && isRegulateEntry) return true;
        // ISBN is prefilled from the chosen regulate-entry book and identifies
        // that exact title, so it must not be edited afterwards. Clearing the
        // book selection — or switching away from Regulate Entry — unlocks it
        // again, because PleaseSelectBook is reset in both cases.
        if (
          name === "ISBN" &&
          isRegulateEntry &&
          Boolean(current.PleaseSelectBook)
        ) {
          return true;
        }
        if (isPrintingPermit && printingPermitReadonlyFields.has(name)) {
          return true;
        }
        return readonly;
      },
      [
        current.PleaseSelectBook,
        isBookTypeLocked,
        isPrintingPermit,
        isRegulateEntry,
        printingPermitReadonlyFields,
      ],
    );

    const getFieldDisabled = React.useCallback(
      (name: string, readonly = false) =>
        Boolean(props.disabled) || getFieldBusinessDisabled(name, readonly),
      [getFieldBusinessDisabled, props.disabled],
    );

    const getInputValue = (name: string) => {
      const value = current[name];
      return typeof value === "string" || typeof value === "number"
        ? value
        : undefined;
    };

    const getUploadValue = (name: string) => {
      const value = current[name];
      return typeof value === "string" || Array.isArray(value)
        ? value
        : undefined;
    };

    const handleUploadMaterialAnalysisSuccess = React.useCallback(
      async (fileData: Array<{ url: string; name: string }>) => {
        const uploadedFile = fileData[0];
        const normalizedServiceCode = Number(props.serviceCode || 0);

        if (!uploadedFile?.url || !normalizedServiceCode) {
          return;
        }

        try {
          const response = await analyzeBookMaterial({
            filePath: uploadedFile.url,
            serviceCode: normalizedServiceCode,
          });

          if (!response?.isSuccess) {
            throw new Error(response?.message || "AI analysis failed.");
          }

          const analysisData = response?.data || {};
          const generatedFields =
            analysisData.aiGeneratedFields &&
            typeof analysisData.aiGeneratedFields === "object"
              ? (analysisData.aiGeneratedFields as Record<string, unknown>)
              : {};
          const generatedLabels =
            analysisData.aiGeneratedLabels &&
            typeof analysisData.aiGeneratedLabels === "object"
              ? (analysisData.aiGeneratedLabels as Record<string, unknown>)
              : {};

          const pickGeneratedValue = (...keys: string[]) => {
            for (const key of keys) {
              const labelValue = generatedLabels[key];
              if (!isEmptyValue(labelValue)) {
                return labelValue;
              }
            }

            for (const key of keys) {
              const fieldValue = generatedFields[key];
              if (!isEmptyValue(fieldValue)) {
                return fieldValue;
              }
            }

            return undefined;
          };

          const nextValuePatch: Partial<BookTradingFormValue> = {
            UploadMaterial: uploadedFile.url,
          };

          const bookTitle = toOptionalString(
            pickGeneratedValue("BookTitle", "PublicationTitle", "Title"),
          );
          if (bookTitle) {
            nextValuePatch.BookTitle = bookTitle;
          }

          const authorName = toOptionalString(
            pickGeneratedValue("AuthorName", "authorName"),
          );
          if (authorName) {
            nextValuePatch.AuthorName = authorName;
          }

          const nationalDepositoryNo = toOptionalString(
            pickGeneratedValue("NationalDepositoryNo", "nationalDepositoryNo"),
          );
          if (nationalDepositoryNo) {
            nextValuePatch.NationalDepositoryNo = nationalDepositoryNo;
          }

          const isbn = toOptionalString(pickGeneratedValue("ISBN", "isbn"));
          if (isbn) {
            nextValuePatch.ISBN = isbn;
          }

          const languageValue = pickGeneratedValue(
            "Language",
            "Languages",
            "languageIds",
          );
          const languageIds =
            toLanguageIds(languageValue) ||
            findOptionValuesByLookupLabels(languageOptions, languageValue);
          if (languageIds && languageIds.length > 0) {
            nextValuePatch.Language = languageIds;
          }

          const subjectCategoryValue = pickGeneratedValue(
            "SubjectCategory",
            "subjectCategoryId",
          );
          const mappedSubjectCategory =
            findOptionValueByLookupLabels(
              subjectCategoryOptions,
              subjectCategoryValue,
            ) ?? toOptionalNumber(subjectCategoryValue);
          if (mappedSubjectCategory !== undefined) {
            nextValuePatch.SubjectCategory = toOptionalNumber(
              mappedSubjectCategory,
            );
          }

          const subjectSubCategoryValue = pickGeneratedValue(
            "SubjectSubCategory",
            "subjectSubCategoryId",
          );
          if (!isEmptyValue(subjectSubCategoryValue)) {
            let availableOptions = subjectSubCategoryOptions;

            if (availableOptions.length === 0) {
              try {
                const allRows = extractResponseArray<SubjectSubCategory>(
                  await getSubjectSubList(),
                );
                const targetCategoryId =
                  nextValuePatch.SubjectCategory ?? current.SubjectCategory;
                availableOptions = allRows
                  .filter(
                    (item) =>
                      !targetCategoryId ||
                      item.subjectCategoryId === targetCategoryId,
                  )
                  .map((item) => ({
                    label:
                      preferLocalizedEnAr(isAr, item.nameEn, item.nameAr) ||
                      String(item.id),
                    value: item.id,
                    ...item,
                  }));
              } catch (error) {
                console.error(
                  "Failed to fetch subject sub category options for AI mapping:",
                  error,
                );
              }
            }

            const mappedSubjectSubCategory =
              findOptionValueByLookupLabels(
                availableOptions,
                subjectSubCategoryValue,
              ) ?? toOptionalNumber(subjectSubCategoryValue);

            if (mappedSubjectSubCategory !== undefined) {
              nextValuePatch.SubjectSubCategory = toOptionalNumber(
                mappedSubjectSubCategory,
              );
            }
          }

          const latestValue = (field.value || {}) as BookTradingFormValue;
          field.setValue({
            ...latestValue,
            ...nextValuePatch,
          });

          const mappingWarnings = Array.isArray(analysisData.mappingWarnings)
            ? analysisData.mappingWarnings
            : [];
          const backfilledKeys = Object.keys(nextValuePatch).filter(
            (key) => key !== "UploadMaterial",
          );

          if (mappingWarnings.length > 0) {
            CustomMessage.warning(
              t("AIMaterialAnalysis.completedNeedsReview"),
            );
          } else if (backfilledKeys.length > 0) {
            CustomMessage.success(t("AIMaterialAnalysis.completed"));
          }
        } catch (error) {
          console.error("AI material analysis failed:", error);
          CustomMessage.error(t("AIMaterialAnalysis.failed"));
        }
      },
      [
        current.SubjectCategory,
        field,
        isAr,
        languageOptions,
        props.serviceCode,
        subjectCategoryOptions,
        subjectSubCategoryOptions,
        t,
      ],
    );

    const handleFieldChange = (key: string, value: unknown) => {
      const nextValue = {
        ...current,
        [key]: value,
      };

      console.log("Field change:", { key, value, nextValue });

      if (key === "HowDidYouGetTheBook") {
        const nextSelectedBookCollectType = bookCollectTypeOptions.find(
          (option) => String(option.value) === String(value ?? ""),
        );
        const nextSelectedBookCollectTypeKind =
          (nextSelectedBookCollectType?.kind ||
            "Unknown") as BookCollectTypeKind;

        if (nextSelectedBookCollectTypeKind !== "RegulateEntryPermit") {
          nextValue.RegulateEntryMediaMaterial = undefined;
          nextValue.PleaseSelectBook = undefined;
        }

        if (nextSelectedBookCollectTypeKind === "PrintingPermit") {
          nextValue.NumberOfCopies = undefined;
        }

        if (
          nextSelectedBookCollectTypeKind !== "BookFair" &&
          nextSelectedBookCollectTypeKind !== "LocalDistributor"
        ) {
          nextValue.UploadPurchaseInvoice = undefined;
        }

        if (
          Number(props.serviceCode) === 204 &&
          nextSelectedBookCollectTypeKind === "RegulateEntryPermit"
        ) {
          nextValue.BookType = "Paper";
          nextValue.UploadMaterial = undefined;
        }

        if (nextSelectedBookCollectTypeKind === "SampleForTest") {
          // TODO: Set Sample For Test defaults when the business values are confirmed.
        }
      }

      if (key === "SubjectCategory") {
        nextValue.SubjectSubCategory = undefined;
        setSubjectSubCategoryRows([]);
      }

      if (key === "RegulateEntryMediaMaterial") {
        nextValue.PleaseSelectBook = undefined;
        // TODO: Fetch books for the selected regulate entry permit and prefill NumberOfCopies.
        setBookSelectOptions([]);
      }

      if (key === "PublicationsPrintingPermit") {
        const selectedPermit = printingPermitOptions.find(
          (option) => String(option.value) === String(value ?? ""),
        );
        const prefill = buildPrintingPermitPrefill(selectedPermit);

        if (
          selectedBookCollectTypeKind === "PrintingPermit" ||
          selectedBookCollectTypeKind === "RegulateEntryPermit"
        ) {
          delete prefill.VersionNumber;
        }

        Object.assign(nextValue, prefill);
      }

      if (key === "PleaseSelectBook") {
        // Copies the chosen book's details onto the form. ISBN is among them and
        // is locked afterwards (see getFieldDisabled) — it identifies the title,
        // so editing it would decouple the application from the imported book.
        const selectedBook = bookSelectOptions.find(
          (option) => String(option.value) === String(value ?? ""),
        );
        const prefill = buildRegulateEntryBookPrefill(
          selectedBook as Partial<RegulateEntryBookOption> | undefined,
          ageClassificationOptions,
        );

        Object.assign(nextValue, prefill);
      }

      if (key === "BookType") {
        if (value === "Paper") {
          nextValue.UploadMaterial = undefined;
        }
      }

      if (key === "UploadMaterial") {
        // TODO: Trigger AI extraction for Electronic books and prefill supported fields.
      }

      if (key === "Language") {
        nextValue.Language =
          typeof value === "string"
            ? value
            : Array.isArray(value)
            ? value.join(",")
            : undefined;
      }

      field.setValue(nextValue);
    };

    const renderTextInput = (
      name: string,
      label: string,
      placeholder: string,
      options?: {
        required?: boolean;
        disabled?: boolean;
        maxLength?: number;
        validator?: BookTradingFieldValidator;
      },
    ) => {
      const required = options?.required ?? true;
      const disabled = options?.disabled ?? false;
      const maxLength = options?.maxLength;

      return (
        <Field
          name={name}
          decorator={[FormItem]}
          validator={getInlineValidator(name, options?.validator)}
        >
          <div className="ant-formily-item-label">
            <div>
              {label}
              {required && (
    <span className="required-icon">*</span>
              )}
            </div>
          </div>
          <Input
            disabled={getFieldDisabled(name, disabled)}
            className="ant-input-affix-wrapper"
            placeholder={placeholder}
            maxLength={maxLength}
            value={getInputValue(name)}
            onChange={(e) => handleFieldChange(name, e.target.value)}
          />
        </Field>
      );
    };

    const renderNumberInput = (
      name: string,
      label: string,
      placeholder: string,
      options?: {
        required?: boolean;
        disabled?: boolean;
        validator?: BookTradingFieldValidator;
      },
    ) => {
      const required = options?.required ?? true;
      const disabled = options?.disabled ?? false;

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if ((/^\d*$/.test(value) || value === "") && value.length <= 10) {
          handleFieldChange(name, value);
        }
      };

      return (
        <Field
          name={name}
          decorator={[FormItem]}
          validator={getInlineValidator(name, options?.validator)}
        >
          <div className="ant-formily-item-label">
            <div>
              {label}
              {required && (
    <span className="required-icon">*</span>
              )}
            </div>
          </div>
          <Input
            disabled={getFieldDisabled(name, disabled)}
            className="ant-input-affix-wrapper"
            placeholder={placeholder}
            value={getInputValue(name)}
            onChange={handleChange}
          />
        </Field>
      );
    };

    const renderDecimalInput = (
      name: string,
      label: string,
      placeholder: string,
      options?: {
        required?: boolean;
        disabled?: boolean;
        validator?: BookTradingFieldValidator;
      },
    ) => {
      const required = options?.required ?? true;
      const disabled = options?.disabled ?? false;

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        if (value === "" || VERSION_NUMBER_PATTERN.test(value)) {
          handleFieldChange(name, value);
        }
      };

      return (
        <Field
          name={name}
          decorator={[FormItem]}
          validator={getInlineValidator(name, options?.validator)}
        >
          <div className="ant-formily-item-label">
            <div>
              {label}
              {required && (
    <span className="required-icon">*</span>
              )}
            </div>
          </div>
          <Input
            disabled={getFieldDisabled(name, disabled)}
            className="ant-input-affix-wrapper"
            placeholder={placeholder}
            maxLength={5}
            value={getInputValue(name)}
            onChange={handleChange}
          />
        </Field>
      );
    };

    const renderSelect = (
      name: string,
      label: string,
      placeholder: string,
      options: OptionType[],
      config?: {
        required?: boolean;
        disabled?: boolean;
        showDescription?: boolean;
        validator?: BookTradingFieldValidator;
        value?: unknown;
      },
    ) => {
      const required = config?.required ?? true;
      const disabled = config?.disabled ?? false;
      const showDescription = config?.showDescription ?? false;
      const value = config && "value" in config ? config.value : current[name];

      return (
        <Field
          name={name}
          decorator={[FormItem]}
          validator={getInlineValidator(name, config?.validator)}
        >
          <div className="ant-formily-item-label">
            <div>
              {label}
              {required && (
    <span className="required-icon">*</span>
              )}
            </div>
          </div>
          <Select
            disabled={getFieldDisabled(name, disabled)}
            placeholder={placeholder}
            value={value}
            onChange={(value: unknown) => handleFieldChange(name, value)}
            showSearch
            optionLabelProp="optionLabel"
            optionFilterProp="children"
          >
            {options.map((option) => {
              const description = showDescription
                ? String(
                    (isAr ? option.descAr : option.descEn) ||
                      (isAr ? option.descEn : option.descAr) ||
                      "",
                  ).trim()
                : "";

              return (
                <Option
                  key={option.value}
                  value={option.value}
                  optionLabel={option.label}
                  disabled={Boolean(
                    (option as { disabled?: boolean }).disabled,
                  )}
                >
                  <div style={{ whiteSpace: "normal", lineHeight: 1.5 }}>
                    <div>{option.label}</div>
                    {description ? (
                      <div
                        style={{
                          color: "rgba(0, 0, 0, 0.65)",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        {description}
                      </div>
                    ) : null}
                  </div>
                </Option>
              );
            })}
          </Select>
        </Field>
      );
    };

    const renderLanguageSelect = (
      name: string,
      label: string,
      placeholder: string,
      config?: {
        required?: boolean;
        disabled?: boolean;
        validator?: BookTradingFieldValidator;
      },
    ) => {
      const required = config?.required ?? true;
      const disabled = config?.disabled ?? false;

      return (
        <Field
          name={name}
          decorator={[FormItem]}
          validator={getInlineValidator(name, config?.validator)}
        >
          <div className="ant-formily-item-label">
            <div>
              {label}
              {required && (
    <span className="required-icon">*</span>
              )}
            </div>
          </div>
          <LanguageSelectComponent
            disabled={getFieldDisabled(name, disabled)}
            multiple={true}
            placeholder={placeholder}
            value={
              current[name]
                ? typeof current[name] === "string"
                  ? current[name]
                      .split(",")
                      .map((v: string) => Number(v.trim()) || v.trim())
                  : current[name]
                : undefined
            }
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
      uploadConfig: UploadFieldConfig,
      options?: {
        required?: boolean;
        disabled?: boolean;
        showTooltip?: boolean;
        tooltipTitle?: string;
        validator?: BookTradingFieldValidator;
      },
    ) => {
      const required = options?.required ?? true;
      const disabled = options?.disabled ?? false;
      const showTooltip = options?.showTooltip ?? false;

      return (
        <Field
          name={name}
          decorator={[FormItem]}
          validator={getInlineValidator(name, options?.validator)}
        >
          <div className="ant-formily-item-label AI-flex">
            <span>
              {label}
              {required && (
    <span className="required-icon">*</span>
              )}
              {showTooltip && (
                <Tooltip
                  title={options?.tooltipTitle || uploadConfig.uploadTip}
                >
                  <QuestionCircleOutlined
                    style={{ marginLeft: 4, color: "#999" }}
                  />
                </Tooltip>
              )}
            </span>
          </div>
          <div className="ant-formily-upload">
            <DocumentViewer
              hasDelete={true}
              disabled={getFieldDisabled(name, disabled)}
              value={getUploadValue(name)}
              onChange={(value: string | string[]) =>
                handleFieldChange(name, value)
              }
              uploadConfig={{
                maxCount: 1,
                maxSize: uploadConfig.maxSize,
                accept: uploadConfig.accept,
                uploadTip: uploadConfig.uploadTip,
                invalidFileTypeMessage: uploadConfig.invalidFileTypeMessage,
                maxSizeErrorMessage: uploadConfig.maxSizeErrorMessage,
                onUploadSuccess:
                  name === "UploadMaterial"
                    ? handleUploadMaterialAnalysisSuccess
                    : undefined,
              }}
            />
          </div>
        </Field>
      );
    };

    const renderRadioGroup = (
      name: string,
      label: string,
      options: { label: string; value: string }[],
      config?: {
        required?: boolean;
        disabled?: boolean;
        validator?: BookTradingFieldValidator;
      },
    ) => {
      const required = config?.required ?? true;
      const disabled = config?.disabled ?? false;

      return (
        <Field
          name={name}
          decorator={[FormItem]}
          validator={getInlineValidator(name, config?.validator)}
        >
          <div className="ant-formily-item-label">
            <div>
              {label}
              {required && (
    <span className="required-icon">*</span>
              )}
            </div>
          </div>
          <Radio.Group
            className="ant-formily-radio"
            disabled={getFieldDisabled(name, disabled)}
            value={current[name]}
            onChange={(e) => handleFieldChange(name, e.target.value)}
          >
            {options.map((option) => (
              <Radio key={option.value} value={option.value}>
                {option.label}
              </Radio>
            ))}
          </Radio.Group>
        </Field>
      );
    };

    const getNestedField = React.useCallback(
      (name: ConditionalBookTradingFieldName) =>
        field.query(`${field.address}.${name}`).take(),
      [field],
    );

    const clearFieldFeedbackState = React.useCallback(
      (targetField?: BookTradingNestedField) => {
        targetField?.setFeedback?.({
          type: "error",
          messages: [],
        });
        targetField?.setState?.((state) => {
          state.selfErrors = [];
          state.selfWarnings = [];
          state.selfSuccesses = [];
          state.selfValidating = false;
          state.validating = false;
        });
      },
      [],
    );

    const isSameValue = React.useCallback((left: unknown, right: unknown) => {
      if (Array.isArray(left) && Array.isArray(right)) {
        return (
          left.length === right.length &&
          left.every((item, index) => item === right[index])
        );
      }

      return left === right;
    }, []);

    useEffect(() => {
      if (
        !showPleaseSelectBook ||
        !pleaseSelectBookTargetValue ||
        isSameValue(current.PleaseSelectBook, pleaseSelectBookTargetValue)
      ) {
        return;
      }

      const latestValue = (field.value || {}) as BookTradingFormValue;
      field.setValue({
        ...latestValue,
        PleaseSelectBook: pleaseSelectBookTargetValue,
      });
    }, [
      current.PleaseSelectBook,
      field,
      isSameValue,
      pleaseSelectBookTargetValue,
      showPleaseSelectBook,
    ]);

    const conditionalFieldConfigs = useMemo<
      Record<ConditionalBookTradingFieldName, ConditionalFieldConfig>
    >(() => {
      const createConfig = (
        name: ConditionalBookTradingFieldName,
        options: Omit<ConditionalFieldConfig, "name" | "validator">,
      ): ConditionalFieldConfig => ({
        name,
        ...options,
        validator: createConditionalFieldValidator({
          ...options,
          requiredMessage,
          includeRequiredValidator: false,
        }),
      });

      const printingPermitDisabled = getFieldDisabled(
        "PublicationsPrintingPermit",
      );
      const uploadMaterialDisabled = getFieldDisabled("UploadMaterial");
      const regulateEntryDisabled = getFieldDisabled(
        "RegulateEntryMediaMaterial",
      );
      const selectBookDisabled = getFieldDisabled("PleaseSelectBook");
      const bookTitleDisabled = getFieldDisabled("BookTitle");
      const authorNameDisabled = getFieldDisabled("AuthorName");
      const nationalDepositoryDisabled = getFieldDisabled(
        "NationalDepositoryNo",
      );
      const isbnDisabled = getFieldDisabled("ISBN");
      const printYearDisabled = getFieldDisabled("PrintYear");
      const versionNumberDisabled = getFieldDisabled("VersionNumber");
      const languageDisabled = getFieldDisabled("Language");
      const subjectCategoryDisabled = getFieldDisabled("SubjectCategory");
      const subjectSubCategoryDisabled = getFieldDisabled("SubjectSubCategory");
      const distributorAgencyDisabled = getFieldDisabled("DistributorAgency");
      const numberOfCopiesDisabled = getFieldDisabled(
        "NumberOfCopies",
        isRegulateEntry,
      );
      const uploadPurchaseInvoiceDisabled = getFieldDisabled(
        "UploadPurchaseInvoice",
      );
      const isBusinessRequired = (
        visible: boolean,
        name: ConditionalBookTradingFieldName,
        readonly = false,
      ) => visible && !getFieldBusinessDisabled(name, readonly);

      return {
        PublicationsPrintingPermit: createConfig("PublicationsPrintingPermit", {
          visible: isPrintingPermit,
          required: isBusinessRequired(
            isPrintingPermit,
            "PublicationsPrintingPermit",
          ),
          disabled: printingPermitDisabled,
          emptyValue: undefined,
          validators: [],
        }),
        UploadMaterial: createConfig("UploadMaterial", {
          visible: showUploadMaterial,
          required: isBusinessRequired(showUploadMaterial, "UploadMaterial"),
          disabled: uploadMaterialDisabled,
          emptyValue: undefined,
          validators: [],
        }),
        RegulateEntryMediaMaterial: createConfig("RegulateEntryMediaMaterial", {
          visible: isRegulateEntry,
          required: isBusinessRequired(
            isRegulateEntry,
            "RegulateEntryMediaMaterial",
          ),
          disabled: regulateEntryDisabled,
          emptyValue: undefined,
          validators: [],
        }),
        PleaseSelectBook: createConfig("PleaseSelectBook", {
          visible: showPleaseSelectBook,
          required: isBusinessRequired(
            showPleaseSelectBook,
            "PleaseSelectBook",
          ),
          disabled: selectBookDisabled,
          emptyValue: undefined,
          validators: [],
        }),
        BookTitle: createConfig("BookTitle", {
          visible: shouldShowDetails,
          required: isBusinessRequired(shouldShowDetails, "BookTitle"),
          disabled: bookTitleDisabled,
          emptyValue: undefined,
          validators: [
            getStringLengthValidator(
              200,
              t("BookTradingForm.validation.maxChars", { max: 200 }),
            ),
          ],
        }),
        AuthorName: createConfig("AuthorName", {
          visible: shouldShowDetails,
          required: isBusinessRequired(shouldShowDetails, "AuthorName"),
          disabled: authorNameDisabled,
          emptyValue: undefined,
          validators: [
            getStringLengthValidator(
              100,
              t("BookTradingForm.validation.maxChars", { max: 100 }),
            ),
          ],
        }),
        NationalDepositoryNo: createConfig("NationalDepositoryNo", {
          visible: shouldShowDetails,
          required: false,
          disabled: nationalDepositoryDisabled,
          emptyValue: undefined,
          validators: [
            getStringLengthValidator(
              50,
              t("BookTradingForm.validation.maxChars", { max: 50 }),
            ),
            nationalDepositoryValidator,
          ],
        }),
        ISBN: createConfig("ISBN", {
          visible: shouldShowDetails,
          required: false,
          disabled: isbnDisabled,
          emptyValue: undefined,
          validators: [
            getStringLengthValidator(
              20,
              t("BookTradingForm.validation.maxChars", { max: 20 }),
            ),
            isbnValidator,
          ],
        }),
        PrintYear: createConfig("PrintYear", {
          visible: shouldShowDetails,
          required: isBusinessRequired(shouldShowDetails, "PrintYear"),
          disabled: printYearDisabled,
          emptyValue: undefined,
          validators: [
            getStringLengthValidator(
              4,
              t("BookTradingForm.validation.maxChars", { max: 4 }),
            ),
            printYearValidator,
          ],
        }),
        VersionNumber: createConfig("VersionNumber", {
          visible: shouldShowDetails,
          required: isBusinessRequired(shouldShowDetails, "VersionNumber"),
          disabled: versionNumberDisabled,
          emptyValue: undefined,
          validators: [
            versionNumberValidator,
          ],
        }),
        Language: createConfig("Language", {
          visible: shouldShowDetails,
          required: isBusinessRequired(shouldShowDetails, "Language"),
          disabled: languageDisabled,
          emptyValue: undefined,
          validators: [],
        }),
        SubjectCategory: createConfig("SubjectCategory", {
          visible: shouldShowDetails,
          required: isBusinessRequired(shouldShowDetails, "SubjectCategory"),
          disabled: subjectCategoryDisabled,
          emptyValue: undefined,
          validators: [],
        }),
        SubjectSubCategory: createConfig("SubjectSubCategory", {
          visible: shouldShowDetails,
          required: isBusinessRequired(
            shouldShowDetails,
            "SubjectSubCategory",
          ),
          disabled: subjectSubCategoryDisabled,
          emptyValue: undefined,
          validators: [],
        }),
        DistributorAgency: createConfig("DistributorAgency", {
          visible: shouldShowDetails,
          required: false,
          disabled: distributorAgencyDisabled,
          emptyValue: undefined,
          validators: [
            getStringLengthValidator(
              200,
              t("BookTradingForm.validation.maxChars", { max: 200 }),
            ),
          ],
        }),
        NumberOfCopies: createConfig("NumberOfCopies", {
          visible: showNumberOfCopies,
          required: isBusinessRequired(
            showNumberOfCopies,
            "NumberOfCopies",
            isRegulateEntry,
          ),
          disabled: numberOfCopiesDisabled,
          emptyValue: undefined,
          validators: [numberOfCopiesValidator],
        }),
        UploadPurchaseInvoice: createConfig("UploadPurchaseInvoice", {
          visible: showUploadPurchaseInvoice,
          required: isBusinessRequired(
            showUploadPurchaseInvoice,
            "UploadPurchaseInvoice",
          ),
          disabled: uploadPurchaseInvoiceDisabled,
          emptyValue: undefined,
          validators: [],
        }),
      };
    }, [
      getFieldDisabled,
      getFieldBusinessDisabled,
      currentLanguage,
      isbnValidator,
      isPrintingPermit,
      isRegulateEntry,
      nationalDepositoryValidator,
      numberOfCopiesValidator,
      printYearValidator,
      requiredMessage,
      shouldShowDetails,
      showNumberOfCopies,
      showPleaseSelectBook,
      showUploadMaterial,
      showUploadPurchaseInvoice,
      t,
    ]);

    useEffect(() => {
      const latestValue = (field.value || {}) as BookTradingFormValue;
      const hiddenValuePatch: Partial<BookTradingFormValue> = {};

      Object.values(conditionalFieldConfigs).forEach((config) => {
        const targetField = getNestedField(config.name);

        if (targetField) {
          targetField.setValidator?.(config.validator);
          targetField.setState?.((state) => {
            state.visible = config.visible;
            state.display = config.visible ? "visible" : "none";
            state.required = config.required;
          });
          clearFieldFeedbackState(targetField);
        }

        if (
          !isReadOnlyMode &&
          !config.visible &&
          !isSameValue(latestValue[config.name], config.emptyValue)
        ) {
          (hiddenValuePatch as Record<string, unknown>)[config.name] =
            config.emptyValue;
        }
      });

      if (Object.keys(hiddenValuePatch).length > 0) {
        field.setValue({
          ...latestValue,
          ...hiddenValuePatch,
        });
      }
    }, [
      clearFieldFeedbackState,
      conditionalFieldConfigs,
      field,
      getNestedField,
      isReadOnlyMode,
      isSameValue,
    ]);

    const requiredFieldValidator = useMemo(
      () =>
        createConditionalFieldValidator({
          visible: true,
          required: true,
          disabled: false,
          validators: [],
          requiredMessage,
        }),
      [requiredMessage],
    );

    const renderConditionalCol = (
      visible: boolean,
      children: React.ReactNode,
      span = 12,
    ) => {
      if (!visible) {
        return null;
      }

      return <Col span={span}>{children}</Col>;
    };

    return (
      <div className="book-trading-form-container">
        <AntdCard
          title={
            <span data-content-editable="x-component-props.title">
              {t("BookTradingForm.title")}
            </span>
          }
        >
          <Row gutter={[24, 24]}>
            <Col span={12}>
              {renderSelect(
                "HowDidYouGetTheBook",
                t("BookTradingForm.label.howDidYouGetTheBook"),
                t("BookTradingForm.placeholder.howDidYouGetTheBook"),
                bookCollectTypeOptions,
                { validator: requiredFieldValidator },
              )}
            </Col>

            <Col span={12}>
              {renderRadioGroup(
                "BookType",
                t("BookTradingForm.label.bookType"),
                bookTypeOptions,
                {
                  validator: requiredFieldValidator,
                },
              )}
            </Col>

            {renderConditionalCol(
              isPrintingPermit,
              renderSelect(
                "PublicationsPrintingPermit",
                t("BookTradingForm.label.publicationsPrintingPermit"),
                t("BookTradingForm.placeholder.publicationsPrintingPermit"),
                printingPermitOptions,
                conditionalFieldConfigs.PublicationsPrintingPermit,
              ),
            )}

            {renderConditionalCol(
              showUploadMaterial,
              renderUpload(
                "UploadMaterial",
                t("BookTradingForm.label.uploadMaterial"),
                uploadMaterialConfig,
                {
                  required: conditionalFieldConfigs.UploadMaterial.required,
                  disabled: conditionalFieldConfigs.UploadMaterial.disabled,
                  showTooltip: true,
                  validator: conditionalFieldConfigs.UploadMaterial.validator,
                },
              ),
            )}

            {renderConditionalCol(
              isRegulateEntry,
              renderSelect(
                "RegulateEntryMediaMaterial",
                t("BookTradingForm.label.regulateEntryMediaMaterial"),
                t("BookTradingForm.placeholder.regulateEntryMediaMaterial"),
                regulateEntryOptions,
                conditionalFieldConfigs.RegulateEntryMediaMaterial,
              ),
            )}

            {renderConditionalCol(
              showPleaseSelectBook,
              renderSelect(
                "PleaseSelectBook",
                t("BookTradingForm.label.pleaseSelectBook"),
                t("BookTradingForm.placeholder.pleaseSelectBook"),
                displayBookSelectOptions,
                {
                  ...conditionalFieldConfigs.PleaseSelectBook,
                  value: displayPleaseSelectBookValue,
                },
              ),
            )}

            {renderConditionalCol(
              shouldShowDetails,
              renderTextInput(
                "BookTitle",
                t("BookTradingForm.label.bookTitle"),
                t("BookTradingForm.placeholder.bookTitle"),
                {
                  required: conditionalFieldConfigs.BookTitle.required,
                  disabled: conditionalFieldConfigs.BookTitle.disabled,
                  maxLength: 200,
                  validator: conditionalFieldConfigs.BookTitle.validator,
                },
              ),
            )}

            {renderConditionalCol(
              shouldShowDetails,
              renderTextInput(
                "AuthorName",
                t("BookTradingForm.label.authorName"),
                t("BookTradingForm.placeholder.authorName"),
                {
                  required: conditionalFieldConfigs.AuthorName.required,
                  disabled: conditionalFieldConfigs.AuthorName.disabled,
                  maxLength: 100,
                  validator: conditionalFieldConfigs.AuthorName.validator,
                },
              ),
            )}

            {renderConditionalCol(
              shouldShowDetails,
              renderTextInput(
                "NationalDepositoryNo",
                t("BookTradingForm.label.nationalDepositoryNo"),
                t("BookTradingForm.placeholder.nationalDepositoryNo"),
                {
                  required: false,
                  disabled:
                    conditionalFieldConfigs.NationalDepositoryNo.disabled,
                  maxLength: 50,
                  validator:
                    conditionalFieldConfigs.NationalDepositoryNo.validator,
                },
              ),
            )}

            {renderConditionalCol(
              shouldShowDetails,
              renderTextInput(
                "ISBN",
                t("BookTradingForm.label.isbn"),
                t("BookTradingForm.placeholder.isbn"),
                {
                  required: false,
                  disabled: conditionalFieldConfigs.ISBN.disabled,
                  maxLength: 20,
                  validator: conditionalFieldConfigs.ISBN.validator,
                },
              ),
            )}

            {renderConditionalCol(
              shouldShowDetails,
              renderTextInput(
                "PrintYear",
                t("BookTradingForm.label.printYear"),
                t("BookTradingForm.placeholder.printYear"),
                {
                  required: conditionalFieldConfigs.PrintYear.required,
                  disabled: conditionalFieldConfigs.PrintYear.disabled,
                  maxLength: 4,
                  validator: conditionalFieldConfigs.PrintYear.validator,
                },
              ),
            )}

            {renderConditionalCol(
              shouldShowDetails,
              renderDecimalInput(
                "VersionNumber",
                t("BookTradingForm.label.versionNumber"),
                t("BookTradingForm.placeholder.versionNumber"),
                {
                  required: conditionalFieldConfigs.VersionNumber.required,
                  disabled: conditionalFieldConfigs.VersionNumber.disabled,
                  validator: conditionalFieldConfigs.VersionNumber.validator,
                },
              ),
            )}

            {renderConditionalCol(
              showNumberOfCopies,
              renderNumberInput(
                "NumberOfCopies",
                t("BookTradingForm.label.numberOfCopies"),
                t("BookTradingForm.placeholder.numberOfCopies"),
                {
                  required: conditionalFieldConfigs.NumberOfCopies.required,
                  disabled: isRegulateEntry,
                  validator: conditionalFieldConfigs.NumberOfCopies.validator,
                },
              ),
            )}

            {renderConditionalCol(
              shouldShowDetails,
              renderLanguageSelect(
                "Language",
                t("BookTradingForm.label.language"),
                t("BookTradingForm.placeholder.language"),
                {
                  required: conditionalFieldConfigs.Language.required,
                  disabled: conditionalFieldConfigs.Language.disabled,
                  validator: conditionalFieldConfigs.Language.validator,
                },
              ),
            )}

            {renderConditionalCol(
              shouldShowDetails,
              renderSelect(
                "SubjectCategory",
                t("BookTradingForm.label.subjectCategory"),
                t("BookTradingForm.placeholder.subjectCategory"),
                subjectCategoryOptions,
                {
                  required: conditionalFieldConfigs.SubjectCategory.required,
                  disabled: conditionalFieldConfigs.SubjectCategory.disabled,
                  showDescription: true,
                  validator: conditionalFieldConfigs.SubjectCategory.validator,
                },
              ),
            )}

            {renderConditionalCol(
              shouldShowDetails,
              renderSelect(
                "SubjectSubCategory",
                t("BookTradingForm.label.subjectSubCategory"),
                t("BookTradingForm.placeholder.subjectSubCategory"),
                subjectSubCategoryOptions,
                {
                  required: conditionalFieldConfigs.SubjectSubCategory.required,
                  disabled: conditionalFieldConfigs.SubjectSubCategory.disabled,
                  validator:
                    conditionalFieldConfigs.SubjectSubCategory.validator,
                },
              ),
            )}

            {renderConditionalCol(
              showAgeClassificationField,
              renderSelect(
                "AgeClassification",
                t("BookTradingForm.label.ageClassification"),
                t("BookTradingForm.placeholder.ageClassification"),
                ageClassificationOptions,
                {
                  required: true,
                  disabled: props.disabled,
                  validator: requiredFieldValidator,
                },
              ),
            )}

            {renderConditionalCol(
              showDistributorAgency,
              renderTextInput(
                "DistributorAgency",
                t("BookTradingForm.label.distributorAgency"),
                t("BookTradingForm.placeholder.distributorAgency"),
                {
                  required: false,
                  disabled: conditionalFieldConfigs.DistributorAgency.disabled,
                  maxLength: 200,
                  validator:
                    conditionalFieldConfigs.DistributorAgency.validator,
                },
              ),
            )}

            {renderConditionalCol(
              showUploadPurchaseInvoice,
              renderUpload(
                "UploadPurchaseInvoice",
                t("BookTradingForm.label.uploadPurchaseInvoice"),
                uploadPurchaseInvoiceConfig,
                {
                  required:
                    conditionalFieldConfigs.UploadPurchaseInvoice.required,
                  disabled:
                    conditionalFieldConfigs.UploadPurchaseInvoice.disabled,
                  validator:
                    conditionalFieldConfigs.UploadPurchaseInvoice.validator,
                },
              ),
            )}
          </Row>
        </AntdCard>
      </div>
    );
  });

BookTradingFormField.displayName = "BookTradingFormField";

export default BookTradingFormField;
