// import "antd/dist/antd.less";
import {
  createForm,
  isField,
  onFieldValueChange,
  onFieldReact,
} from "@formily/core";
import { getValidateLocale } from "@formily/validator";
import "./index.less";
import {
  Children,
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import type { ComponentProps, FC, ReactNode } from "react";
import { createSchemaField, FormProvider, useField } from "@formily/react";
import { useTranslation } from "react-i18next";
import {
  Checkbox,
  Cascader,
  Editable,
  // Input,
  NumberPicker,
  Switch,
  Password,
  PreviewText,
  Radio,
  // Select,
  Reset,
  Space,
  Submit,
  TimePicker,
  Transfer,
  TreeSelect,
  // Upload,
  FormGrid as FormilyFormGrid,
  FormLayout,
  FormTab,
  FormCollapse,
  ArrayTable,
  ArrayCards,
  // Rate,
} from "@formily/antd";
import MultiFileDom from "@/components/designable/src/components/MultiFile/MultiFile";
import { DraftFileOrLinkField } from "@/components/designable/src/components/DraftFileOrLink";
import { Divider } from "@/components/designable/src/components/Divider/Divider";
import AddressPicker from "@/components/designable/src/components/AddressPicker/AddressPicker";
import { Input } from "@/components/designable/src/components/Input/preview";
import { Card } from "@/components/designable/src/components/Card/preview";
import { ProfileForm } from "@/components/designable/src/components/ProfileForm/preview";
import {
  resolveProfileDraftContextKey,
  type ProfileFormSource,
  type ProfileFormValues,
} from "@/components/designable/src/components/ProfileForm/profileFormRules";
import { VideoGamePackageFormField } from "@/components/designable/src/components/VideoGamePackageForm/VideoGamePackageFormField";
import { DatePicker } from "@/components/designable/src/components/DatePicker/preview";
import { FileUploadGridField } from "@/components/designable/src/components/FileUploadGrid/FileUploadGridField";
import DurationInput from "@/components/designable/src/components/DurationInput/DurationInput";

import { Select } from "@/components/designable/src/components/Select/preview";
import CountryDropdown from "@/components/designable/src/components/CountryDropdown/CountryDropdown";
import Information from "@/components/designable/src/components/Information/Information";
import SelectTableField from "@/components/designable/src/components/SelectTable/SelectTableField";
import SelectTableSingleField from "@/components/designable/src/components/SelectTableSingle/SelectTableField";
import LanguageSelect from "@/components/designable/src/components/LanguageSelect/LanguageSelect";
import UploadDom from "@/components/designable/src/components/Upload/Upload";
import LanguageSelectMulti from "@/components/designable/src/components/LanguageSelectMulti/LanguageSelectMulti";
import IDSelectorField from "@/components/designable/src/components/IDSelector/IDSelectorField";
import type {
  IDSelectorFieldProps,
  IdSelectorType,
} from "@/components/designable/src/components/IDSelector/idSelectorUtils";
// import { DataFormField } from "@/components/designable/src/components/DataForm/DataFormField";
import { Slider, Rate } from "antd";
import { PublicationFormField } from "@/components/designable/src/components/PublicationForm/PublicationFormField";
import { MultiDropdown } from "@/components/designable/src/components/MultiDropdown/preview";
// import { Select } from "@/components/designable/src/components/Select/preview";
import { BookTradingFormField } from "@/components/designable/src/components/BookTradingForm/BookTradingFormField";
import { MemberListField } from "@/components/designable/src/components/FilmingTeam/MemberListField";
import RadioGroupWithLayout from "@/components/designable/src/components/Radio/RadioGroupWithLayout";
import FormItemWithHtmlTooltip from "@/components/designable/src/components/FormItemWithHtmlTooltip";
import { AcquaintanceFormField } from "@/components/designable/src/components/AcquaintanceForm/AcquaintanceFormField";
import { DataFormField } from "@/components/designable/src/components/DataForm/DataFormField";
import { FilmingLocationsField } from "@/components/designable/src/components/AddressList/AddressList";
import { FilmsUrlsListField } from "@/components/designable/src/components/UrlList/FilmsUrlsListField";
import { VideoField } from "@/components/designable/src/components/Video/VideoField";
import { BookListUploadField } from "@/components/designable/src/components/BookList/BookListUploadField";
import { SocialMediaAccountField } from "@/components/designable/src/components/SocialMediaAccount/SocialMediaAccountField";
import EmiratePort from "@/components/designable/src/components/EmiratePort/EmiratePort";
import DataListInner from "@/components/designable/src/components/DataList/DataList";
import type { PublicationNameCheckExclusions } from "@/components/designable/src/components/DataList/dataListRules";
import EquipmentListInner from "@/components/designable/src/components/EquipmentList/EquipmentList";
import { PersonsInChargeListField } from "@/components/designable/src/components/PersonsInChargeList/PersonsInChargeListField";
import { PartnerListField } from "@/components/designable/src/components/PartnerList/PartnerListField";
import { GameDistributionFormField } from "@/components/designable/src/components/GameDistributionForm/GameDistributionFormField";
import { FilmRescreeningFormField } from "@/components/designable/src/components/FilmRescreeningForm/FilmRescreeningFormField";
import { FilmScreeningFormField } from "@/components/designable/src/components/FilmScreeningForm/FilmScreeningFormField";
import { FilmTrailerFormField } from "@/components/designable/src/components/FilmTrailerForm/FilmTrailerFormField";
import { LicenseTransferFormField } from "@/components/designable/src/components/LicenseTransferForm/LicenseTransferFormField";
import { LicenseInformationFormField } from "@/components/designable/src/components/LicenseInformationForm/LicenseInformationFormField";
import { TransferInformationField } from "@/components/designable/src/components/TransferInformation/TransferInformationField";
import { SocialMediaManagerField } from "@/components/designable/src/components/SocialMediaManager/SocialMediaManagerField";
import { FilmingPurposeFormField } from "@/components/designable/src/components/FilmingPurposeForm/FilmingPurposeFormField";
import { TradeLicenseDetailsField } from "@/components/designable/src/components/TradeLicenseDetails";
import { GuardianConsentDetailsField } from "@/components/designable/src/components/GuardianConsentDetails/GuardianConsentDetailsField";
import { MoviePackageFormField } from "@/components/designable/src/components/MoviePackageForm/MoviePackageFormField";
import { NewpaperMagazineCirculationField } from "@/components/designable/src/components/NewpaperMagazineCirculation/NewpaperMagazineCirculationField";
import { ScriptPublicationFormField } from "@/components/designable/src/components/ScriptPublicationForm/ScriptPublicationFormField";
import PosterAndTrailerPermitField from "@/components/designable/src/components/PosterAndTrailerPermit/PosterAndTrailerPermitField";
import PressCardSelectorInner from "@/components/designable/src/components/PressCardSelector/PressCardSelector";
import {
  MobileNumberInputField,
  MobileNumberRuntimeProvider,
  type MobileNumberRuntimeConfigInput,
  type MobileNumberInputFieldProps,
} from "@/components/designable/src/components/MobileNumberInput";
import { BeneficiaryTypeField } from "@/components/designable/src/components/BeneficiaryType/BeneficiaryTypeField";
import PersonalPhotoTooltip from "@/components/common/PersonalPhotoTooltip";

import {
  SERVICE_302,
  getService302SelectTableValue,
  hasService302BookActivity,
  hasService302OtherActivity,
} from "@/pages/MediaLicense/service302Utils";
import type { PartnerItem } from "@/components/designable/src/components/PartnerList/PartnerListField";
import {
  localizeSchemaNode,
  normalizeSchemaComponentProps,
} from "./schemaLocalization";
import i18nInstance from "@/localization/config";
import {
  FormLanguageProvider,
  mapDesignerLanguageToContentLang,
} from "@/components/designable/playground/FormPreviewLangContext";
import { isArabicNameInputAllowed } from "@/utils/individualIdentity/validation";
import {
  getFormValuesFromSignature,
  getFormValuesSignature,
  getSchemaDataSignature,
  shouldApplyFormValuesSignature,
} from "./formValuesState";
import { normalizeCapitalValidation } from "./capitalValidation";
import {
  OcrInput,
  OcrModal,
  OCR_DOCUMENT_TYPE,
  type OcrApplyPayload,
} from "@/components/common/ocr";

type RuntimeFormGridComponent = FC<
  ComponentProps<typeof FormilyFormGrid>
> & {
  GridColumn: typeof FormilyFormGrid.GridColumn;
};

const RuntimeGridColumn: typeof FormilyFormGrid.GridColumn = ({
  children,
  ...props
}) => {
  // Comment out the logic for filtering empty GridColumns. 
  // ----------Await confirmation from Canli.--------------
  
  // if (Children.count(children) === 0) {
  //   return null;
  // }

  return (
    <FormilyFormGrid.GridColumn {...props}>
      {children}
    </FormilyFormGrid.GridColumn>
  );
};

const RuntimeFormGrid = ((props) => (
  <FormilyFormGrid {...props} />
)) as RuntimeFormGridComponent;

RuntimeFormGrid.GridColumn = RuntimeGridColumn;

const BOOK_LIST_MATERIAL_TYPE_SERVICE_CODES = new Set([301, 304]);
const BOOK_LIST_MATERIAL_TYPE_IDS = new Set([4, 8, 17, 24]);
// Restrict personal-photo tooltip injection to the services that require it.
// This keeps the tooltip out of the designer side panel and all other uploads.
const PERSONAL_PHOTO_TOOLTIP_SERVICE_CODES = new Set([1801, 1802, 8008]);
const PERSONAL_PHOTO_UPLOAD_UNIQUE_VALUE = "PersonalPhoto";
const SERVICE_1801 = 1801;
const SERVICE_1801_PERMIT_START_DATE_ACTIVITY_ID = "2035";
const OWNER_APPROVAL_SERVICE_CODES = new Set([1201, 1202, 1203, 1204, 1205]);
const OWNER_APPROVAL_REPRINT_SERVICE_CODES = new Set([1201, 1204]);
const OWNER_APPROVAL_REPRINT_ACTIVITY_IDS = new Set([
  "1015",
  "1016",
  "1017",
  "1018",
  "1019",
  "1030",
  "1032",
]);
const ELECTRONIC_NEWSPAPER_ACTIVITY_IDS = new Set([
  "2099",
  "2098",
  "2097",
  "2096",
  "2095",
  "2094",
  "2093",
]);

const hasBookListMaterialType = (
  list: Array<{ materialTypeId?: number | string } | null | undefined>,
) =>
  list.some(
    (item) => BOOK_LIST_MATERIAL_TYPE_IDS.has(Number(item?.materialTypeId)),
  );

interface SchemaData {
  form: {
    labelCol: number;
    wrapperCol: number;
  };
  schema: object;
}
interface FormliyViewProps {
  formData?: any;
  setFormInstance?: (form: any) => void;
  onValuesChange?: (values: any) => void;
  onUploadComplete?: (fileInfo: { name: string; fileType: number }) => void;
  onTotalFeeChange?: (fee: number) => void;
  onSelectTableOptionsChange?: (options: any[]) => void;
  onTotalFeeFloat?: (fee: number) => void;
  disabled?: boolean;
  onTotalFeeList?: (data: any) => void;
  serviceCode?: number | string;
  publicationNameCheckExclusions?: PublicationNameCheckExclusions;
  establishmentId?: string;
  artistWorkTypeOptions?: Array<{
    label: string;
    value: string | number;
  }>;
  artistWorkTypeOptionsLoading?: boolean;
  serviceMaterialTypeId?: number | null;
  service905OwnerPartners?: PartnerItem[];
  hideBookListStatusColumn?: boolean;
  bookStatusLookupHandledExternally?: boolean;
  profileInfo?: ProfileFormSource;
  profileLoaded?: boolean;
  profileContextKey?: string;
  mobileNumberRuntimeConfig?: MobileNumberRuntimeConfigInput;
  onProfileSourceResolved?: (value: ProfileFormValues) => void;
  onProfileSourceResolutionError?: () => void;
  idSelectorRuntimeType?: IdSelectorType | null;
}

type ComponentBridgeProps = Record<string, unknown> & {
  disabled?: boolean;
};

interface ProfileFormBridgeRuntime {
  disabled: boolean;
  profileInfo?: ProfileFormSource;
  profileLoaded?: boolean;
  profileContextKey?: string;
  draftProfileContextKey?: string;
  initialFormValues: Record<string, unknown>;
  formDataRevision: number;
  onProfileSourceResolved?: (value: ProfileFormValues) => void;
  onProfileSourceResolutionError?: () => void;
}

const ProfileFormBridgeContext = createContext<ProfileFormBridgeRuntime | null>(
  null,
);

const ProfileFormBridge = (props: ComponentBridgeProps) => {
  const runtime = useContext(ProfileFormBridgeContext);
  if (!runtime) return null;

  return (
    <ProfileForm
      {...props}
      disabled={runtime.disabled || Boolean(props.disabled)}
      profileInfo={runtime.profileInfo}
      profileLoaded={runtime.profileLoaded}
      profileContextKey={runtime.profileContextKey}
      draftProfileContextKey={runtime.draftProfileContextKey}
      initialFormValues={runtime.initialFormValues}
      reviewMode={runtime.disabled && runtime.profileLoaded === undefined}
      formDataRevision={runtime.formDataRevision}
      onProfileSourceResolved={runtime.onProfileSourceResolved}
      onProfileSourceResolutionError={
        runtime.onProfileSourceResolutionError
      }
    />
  );
};

ProfileFormBridge.displayName = "ProfileFormBridge";

type DynamicSchemaNode = Record<string, unknown>;

const isPlainRecord = (value: unknown): value is DynamicSchemaNode =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
// Identify the target Upload by its stable backend schema uniqueValue.
const isPersonalPhotoUpload = (node: DynamicSchemaNode): boolean =>
  node["x-component"] === "Upload" &&
  node.uniqueValue === PERSONAL_PHOTO_UPLOAD_UNIQUE_VALUE;
// Decorate only matching Upload titles at runtime. Cloning the dynamic schema
// leaves the persisted schema and designer configuration unchanged.
const withPersonalPhotoTooltip = (
  schemaNode: unknown,
  enabled: boolean,
): unknown => {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map((item) => withPersonalPhotoTooltip(item, enabled));
  }
  if (!isPlainRecord(schemaNode)) {
    return schemaNode;
  }
  const node = schemaNode;
  const nextNode: DynamicSchemaNode = { ...node };
  if (enabled && isPersonalPhotoUpload(node)) {
    nextNode.title = (
      <span>
        {node.title as ReactNode} <PersonalPhotoTooltip />
      </span>
    );
  }
  if (isPlainRecord(node.properties)) {
    nextNode.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, child]) => [
        key,
        withPersonalPhotoTooltip(child, enabled),
      ]),
    );
  }
  return nextNode;
};
const collectFieldText = (
  nodeKey: string,
  node: DynamicSchemaNode,
): string => {
  const componentProps = isPlainRecord(node["x-component-props"])
    ? node["x-component-props"]
    : {};
  return [
    nodeKey,
    node.name,
    node.uniqueValue,
    node.title,
    componentProps.title,
    componentProps.titleEn,
    componentProps.placeholder,
    componentProps.placeholderEn,
  ]
    .filter((value) => value != null && value !== "")
    .join(" ");
};

const isArabicNameInputField = (
  nodeKey: string,
  node: DynamicSchemaNode,
): boolean => {
  const component = String(node["x-component"] || "");
  if (component !== "Input" && component !== "Input.TextArea") return false;
  const fieldText = collectFieldText(nodeKey, node);
  return /arabic/i.test(fieldText) && /name/i.test(fieldText);
};

const validateArabicNameCharacters = (value: unknown): string => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return isArabicNameInputAllowed(text)
    ? ""
    : i18nInstance.t("IDSelector.validation.arabicOnly");
};

const withArabicNameLocalValidation = (
  schemaNode: unknown,
  nodeKey = "",
): unknown => {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map((item) => withArabicNameLocalValidation(item));
  }

  if (!isPlainRecord(schemaNode)) {
    return schemaNode;
  }

  const node = schemaNode;
  const nextNode: DynamicSchemaNode = {
    ...node,
  };

  if (isArabicNameInputField(nodeKey, node)) {
    const validators = Array.isArray(node["x-validator"])
      ? node["x-validator"]
      : node["x-validator"]
        ? [node["x-validator"]]
        : [];

    nextNode["x-validator"] = [
      ...validators,
      {
        triggerType: "onInput",
        validator: validateArabicNameCharacters,
      },
    ];
  }

  if (isPlainRecord(node.properties)) {
    nextNode.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, value]) => [
        key,
        withArabicNameLocalValidation(value, key),
      ]),
    );
  }

  if (node.items !== undefined) {
    nextNode.items = withArabicNameLocalValidation(node.items);
  }

  return nextNode;
};

function moveMobileNumberRequiredToComponent(schemaNode: unknown): unknown {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map((item) => moveMobileNumberRequiredToComponent(item));
  }

  if (!isPlainRecord(schemaNode)) {
    return schemaNode;
  }

  const nextNode: DynamicSchemaNode = { ...schemaNode };

  if (nextNode["x-component"] === "MobileNumberInput") {
    const componentProps = isPlainRecord(nextNode["x-component-props"])
      ? nextNode["x-component-props"]
      : {};
    const validators = Array.isArray(nextNode["x-validator"])
      ? nextNode["x-validator"]
      : nextNode["x-validator"]
        ? [nextNode["x-validator"]]
        : [];
    let isRequired = nextNode["x-required"] === true;
    const retainedValidators = validators.flatMap((validator) => {
      if (validator === "required") {
        isRequired = true;
        return [];
      }
      if (!isPlainRecord(validator) || validator.required !== true) {
        return [validator];
      }

      isRequired = true;
      const { required: _required, ...remainingRule } = validator;
      return Object.keys(remainingRule).length ? [remainingRule] : [];
    });

    delete nextNode["x-required"];
    if (retainedValidators.length) {
      nextNode["x-validator"] = retainedValidators;
    } else {
      delete nextNode["x-validator"];
    }
    nextNode["x-component-props"] = {
      ...componentProps,
      required: isRequired || componentProps.required === true,
    };
  }

  if (isPlainRecord(nextNode.properties)) {
    nextNode.properties = Object.fromEntries(
      Object.entries(nextNode.properties).map(([key, value]) => [
        key,
        moveMobileNumberRequiredToComponent(value),
      ]),
    );
  }

  if (nextNode.items !== undefined) {
    nextNode.items = moveMobileNumberRequiredToComponent(nextNode.items);
  }

  return nextNode;
}

function forceReviewRadioGroupReadonly(schemaNode: unknown): unknown {
  if (Array.isArray(schemaNode)) {
    return schemaNode.map((item) => forceReviewRadioGroupReadonly(item));
  }

  if (!schemaNode || typeof schemaNode !== "object") {
    return schemaNode;
  }

  const node = schemaNode as Record<string, unknown>;
  const nextNode: Record<string, unknown> = {
    ...node,
  };

  if (nextNode["x-component"] === "Radio.Group") {
    nextNode["x-pattern"] = "disabled";
    nextNode["x-component-props"] = {
      ...(typeof node["x-component-props"] === "object" &&
      node["x-component-props"] !== null
        ? (node["x-component-props"] as Record<string, unknown>)
        : {}),
      disabled: true,
      readOnly: true,
    };
  }

  if (node.properties && typeof node.properties === "object") {
    nextNode.properties = Object.fromEntries(
      Object.entries(node.properties as Record<string, unknown>).map(
        ([key, value]) => [key, forceReviewRadioGroupReadonly(value)],
      ),
    );
  }

  if (node.items !== undefined) {
    nextNode.items = forceReviewRadioGroupReadonly(node.items);
  }

  return nextNode;
}

interface PassportOcrFieldLike {
  address?: unknown;
  title?: unknown;
  pattern?: string;
  setValue: (value: string) => void;
}

const PassportOcrInput = (props: ComponentBridgeProps) => {
  const { t } = useTranslation();
  const field = useField() as unknown as PassportOcrFieldLike;
  const [ocrVisible, setOcrVisible] = useState(false);
  const fieldText = [field.address, field.title, props.placeholder]
    .filter((value) => value != null && value !== "")
    .join(" ");
  const isPassportNumber =
    /passport/i.test(fieldText) && /number/i.test(fieldText);

  if (!isPassportNumber) {
    return <Input {...props} />;
  }

  const isDisabled =
    Boolean(props.disabled) ||
    field.pattern === "disabled" ||
    field.pattern === "readOnly" ||
    field.pattern === "readPretty";

  const handleOcrApply = (payload: OcrApplyPayload) => {
    const passportNumber = String(payload.passportNumber || "").trim();
    if (passportNumber) {
      field.setValue(passportNumber);
    }
    setOcrVisible(false);
  };

  return (
    <>
      <OcrInput
        ocrDisabled={isDisabled}
        onOcrClick={() => setOcrVisible(true)}
        ocrTitle={t("ocr.trigger")}
      >
        <Input {...props} />
      </OcrInput>
      {ocrVisible ? (
        <OcrModal
          visible={ocrVisible}
          documentType={OCR_DOCUMENT_TYPE.PASSPORT}
          onApply={handleOcrApply}
          onClose={() => setOcrVisible(false)}
        />
      ) : null}
    </>
  );
};

function FormliyView({

  formData,
  setFormInstance,
  onValuesChange,
  onUploadComplete,
  onTotalFeeChange,
  onTotalFeeList,
  onSelectTableOptionsChange,
  onTotalFeeFloat,
  disabled = false,
  serviceCode,
  publicationNameCheckExclusions,
  establishmentId,
  artistWorkTypeOptions,
  artistWorkTypeOptionsLoading,
  serviceMaterialTypeId,
  service905OwnerPartners,
  hideBookListStatusColumn,
  bookStatusLookupHandledExternally,
  profileInfo,
  profileLoaded,
  profileContextKey,
  mobileNumberRuntimeConfig,
  onProfileSourceResolved,
  onProfileSourceResolutionError,
  idSelectorRuntimeType,
}: FormliyViewProps) {
  const { i18n } = useTranslation();
  const onValuesChangeRef = useRef<FormliyViewProps["onValuesChange"]>();
  const onUploadCompleteRef = useRef<FormliyViewProps["onUploadComplete"]>();
  const onTotalFeeChangeRef = useRef<FormliyViewProps["onTotalFeeChange"]>();
  const onTotalFeeListRef = useRef<FormliyViewProps["onTotalFeeList"]>();
  const onSelectTableOptionsChangeRef =
    useRef<FormliyViewProps["onSelectTableOptionsChange"]>();
  const onTotalFeeFloatRef = useRef<FormliyViewProps["onTotalFeeFloat"]>();
  const lastAppliedFormDataRef = useRef<string>("");
  const lastAppliedFormValuesSignatureRef = useRef<string>("");
  const draftProfileContextKeyRef = useRef<string>();
  draftProfileContextKeyRef.current = resolveProfileDraftContextKey(
    draftProfileContextKeyRef.current,
    profileContextKey,
  );
  useEffect(() => {
    onValuesChangeRef.current = onValuesChange;
  }, [onValuesChange]);
  useEffect(() => {
    onUploadCompleteRef.current = onUploadComplete;
  }, [onUploadComplete]);
  useEffect(() => {
    onTotalFeeChangeRef.current = onTotalFeeChange;
  }, [onTotalFeeChange]);
  useEffect(() => {
    onTotalFeeListRef.current = onTotalFeeList;
  }, [onTotalFeeList]);
  useEffect(() => {
    onSelectTableOptionsChangeRef.current = onSelectTableOptionsChange;
  }, [onSelectTableOptionsChange]);
  useEffect(() => {
    onTotalFeeFloatRef.current = onTotalFeeFloat;
  }, [onTotalFeeFloat]);

  const parsedFormData = useMemo(() => {
    if (!formData || !formData.formData) return {};
    try {
      return JSON.parse(formData.formData) || {};
    } catch {
      return {};
    }
  }, [formData]);

  const formValuesSignature = useMemo(
    () => getFormValuesSignature(parsedFormData?.formValues),
    [parsedFormData?.formValues],
  );

  const initialValues = useMemo(
    () => getFormValuesFromSignature(formValuesSignature),
    [formValuesSignature],
  );
  const schemaDataSignature = useMemo(
    () => getSchemaDataSignature(parsedFormData),
    [parsedFormData],
  );
  const initialValuesRef = useRef(initialValues);
  const disabledRef = useRef(disabled);
  initialValuesRef.current = initialValues;
  disabledRef.current = disabled;

  const form = useMemo(
    () =>
      createForm({
        initialValues: initialValuesRef.current,
        pattern: disabledRef.current ? "disabled" : "editable",
        effects() {
          const ownerApprovalInitialState = new WeakMap<
            object,
            { display: string; required: boolean }
          >();
          const newspaperDraftInitialState = new WeakMap<
            object,
            { display: string; required: boolean }
          >();

          onFieldValueChange("*", (field) => {
            onValuesChangeRef.current?.(field.form.values);
            if (
              onTotalFeeChangeRef.current &&
              field?.value &&
              Array.isArray((field.value as any).tableData)
            ) {
              const tableData = (field.value as any).tableData as any[];
              onTotalFeeListRef.current?.(tableData);
              const fee = tableData.reduce((sum, row) => {
                const price = Number(row?.money ?? 0);
                return sum + (Number.isNaN(price) ? 0 : price);
              }, 0);
              onTotalFeeChangeRef.current(fee);
            }
          });
          if (Number(serviceCode) === 13) {
            onFieldReact("dataList", (field) => {
              if (isField(field)) field.setRequired(true);
            });

            onFieldReact("PersonsinCharge", (field) => {
              if (isField(field)) field.setRequired(true);
            });
          }

          const normalizedServiceCode = Number(serviceCode);
          if (normalizedServiceCode === SERVICE_1801) {
            onFieldReact("PermitStartDate", (field) => {
              if (!isField(field)) return;

              const selectedKey =
                field.form.values?.SelectTableSingle?.selectedKey;
              const selectedActivityIds = (
                Array.isArray(selectedKey) ? selectedKey : [selectedKey]
              )
                .filter((activityId) => activityId != null)
                .map((activityId) => String(activityId));
              const shouldRequirePermitStartDate = selectedActivityIds.includes(
                SERVICE_1801_PERMIT_START_DATE_ACTIVITY_ID,
              );

              field.display = shouldRequirePermitStartDate ? "visible" : "none";
              field.setRequired(shouldRequirePermitStartDate);

              if (!shouldRequirePermitStartDate && field.value !== undefined) {
                field.setValue(undefined);
                field.caches.value = undefined;
              }
            });
          }

          if (OWNER_APPROVAL_SERVICE_CODES.has(normalizedServiceCode)) {
            onFieldReact("OwnerApproval", (field) => {
              if (!isField(field)) return;

              if (!ownerApprovalInitialState.has(field)) {
                ownerApprovalInitialState.set(field, {
                  display: field.display,
                  required: field.required,
                });
              }

              const selectedKey =
                field.form.values?.SelectTableSingle?.selectedKey;
              const selectedActivityIds = Array.isArray(selectedKey)
                ? selectedKey.map((key: string | number) => String(key))
                : [];
              const hasElectronicNewspaperActivity = selectedActivityIds.some(
                (activityId) =>
                  ELECTRONIC_NEWSPAPER_ACTIVITY_IDS.has(activityId),
              );

              if (hasElectronicNewspaperActivity) {
                field.display = "none";
                field.required = false;
                field.setValue(undefined);
                field.caches.value = undefined;
                return;
              }

              if (
                OWNER_APPROVAL_REPRINT_SERVICE_CODES.has(normalizedServiceCode)
              ) {
                const hasReprint = selectedActivityIds.some((activityId) =>
                  OWNER_APPROVAL_REPRINT_ACTIVITY_IDS.has(activityId),
                );
                field.display = hasReprint ? "visible" : "none";
                field.required = hasReprint;
                return;
              }

              const initialState = ownerApprovalInitialState.get(field);
              if (initialState) {
                field.display = initialState.display;
                field.required = initialState.required;
              }
            });
          }

          // Handle 1201 and 1204 skip step logic
          if (OWNER_APPROVAL_REPRINT_SERVICE_CODES.has(normalizedServiceCode)) {
            onFieldReact("NewspaperMagazineUrl", (field) => {
              const selectedKey =
                field.form.values?.SelectTableSingle?.selectedKey;
              const hasElectronic =
                Array.isArray(selectedKey) &&
                selectedKey.some(
                  (key: string | number) =>
                    ELECTRONIC_NEWSPAPER_ACTIVITY_IDS.has(String(key)),
                );
              field.display = hasElectronic ? "visible" : "none";
              (field as any).required = hasElectronic;
            });
          }

          if (OWNER_APPROVAL_SERVICE_CODES.has(normalizedServiceCode)) {
            onFieldReact("NewspaperOrMagzineDraft", (field) => {
              if (!isField(field)) return;

              if (!newspaperDraftInitialState.has(field)) {
                newspaperDraftInitialState.set(field, {
                  display: field.display,
                  required: field.required,
                });
              }

              const selectedKey =
                field.form.values?.SelectTableSingle?.selectedKey;
              const hasElectronic =
                Array.isArray(selectedKey) &&
                selectedKey.some(
                  (key: string | number) =>
                    ELECTRONIC_NEWSPAPER_ACTIVITY_IDS.has(String(key)),
                );

              if (hasElectronic) {
                field.display = "none";
                field.required = false;
                field.setValue(undefined);
                field.caches.value = undefined;
                return;
              }

              const initialState = newspaperDraftInitialState.get(field);
              if (initialState) {
                field.display = initialState.display;
                field.required = initialState.required;
              }
            });
          }

          if (Number(serviceCode) === SERVICE_302) {
            const syncService302Visibility = (
              fieldName: string,
              field: any,
            ) => {
              const selectValue = getService302SelectTableValue(
                field.form.values,
              );
              const hasBook = hasService302BookActivity(selectValue);
              const hasOther = hasService302OtherActivity(selectValue);
              const isBookField = fieldName === "bookListUpload";
              const shouldShow = isBookField ? hasBook : hasOther;

              field.display = shouldShow ? "visible" : "none";
              (field as any).required = shouldShow;
            };

            onFieldReact("bookListUpload", (field) => {
              syncService302Visibility("bookListUpload", field);
            });

            onFieldReact("dataList", (field) => {
              syncService302Visibility("dataList", field);
            });
          }

          if (BOOK_LIST_MATERIAL_TYPE_SERVICE_CODES.has(Number(serviceCode))) {
            onFieldReact("bookListUpload", (field) => {
              const normalizedServiceCode = Number(serviceCode);
              const shouldShow =
                normalizedServiceCode === 304
                  ? Number(field.form.values?.beneficiaryType?.beneficiaryType) !== 4 &&
                    hasBookListMaterialType(
                      Array.isArray(field.form.values?.beneficiaryType?.materialList)
                        ? field.form.values.beneficiaryType.materialList
                        : [],
                    )
                  : hasBookListMaterialType(
                      Array.isArray(field.form.values?.dataList)
                        ? field.form.values.dataList
                        : [],
                    );

              field.display = shouldShow ? "visible" : "none";
              (field as { required?: boolean }).required = shouldShow;
            });
          }
        },
      }),
    [serviceCode],
  );

  useEffect(() => {
    if (setFormInstance) {
      setFormInstance(form);
    }
  }, [form, setFormInstance]);

  useEffect(() => {
    if (form) {
      form.setPattern(disabled ? "disabled" : "editable");
    }
  }, [form, disabled]);
  // const schema = JSON.parse(localStorage.getItem("formily-schema") || "{}");
  const [schemaData, setSchemaData] = useState<SchemaData>({
    form: {
      labelCol: 4,
      wrapperCol: 14,
    },
    schema: {},
  });
  const [formDataRevision, setFormDataRevision] = useState(0);
  const profileFormBridgeRuntime = useMemo<ProfileFormBridgeRuntime>(
    () => ({
      disabled,
      profileInfo,
      profileLoaded,
      profileContextKey,
      draftProfileContextKey: draftProfileContextKeyRef.current,
      initialFormValues: initialValues,
      formDataRevision,
      onProfileSourceResolved,
      onProfileSourceResolutionError,
    }),
    [
      disabled,
      formDataRevision,
      initialValues,
      profileContextKey,
      profileInfo,
      profileLoaded,
      onProfileSourceResolved,
      onProfileSourceResolutionError,
    ],
  );

  const SchemaField = useMemo(
    () =>
      createSchemaField({
        components: {
          Input: Number(serviceCode) === 8008 ? PassportOcrInput : Input,
          FormItem: FormItemWithHtmlTooltip,
          DatePicker,
          Checkbox,
          Cascader,
          Editable,
          NumberPicker,
          Switch,
          Password,
          PreviewText,
          Radio,
          "Radio.Group": (props: any) => (
            <RadioGroupWithLayout
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          Reset,
          Select,
          MultiDropdown,
          Space,
          Submit,
          TimePicker,
          Transfer,
          TreeSelect,
          Upload: (props: any) => (
            <UploadDom {...props} disabled={disabled || props?.disabled} />
          ),
          MultiFile: MultiFileDom,
          DraftFileOrLink: DraftFileOrLinkField,
          FormGrid: RuntimeFormGrid,
          FormLayout,
          FormTab,
          FormCollapse,
          ArrayTable,
          ArrayCards,
          Card,
          ProfileForm: ProfileFormBridge,
          Slider,
          FileUploadGrid: FileUploadGridField,
          DurationInput,
          Rate,
          CountryDropdown: (props: ComponentBridgeProps) => {
            return (
              <CountryDropdown
                {...props}
                disabled={disabled || Boolean(props.disabled)}
              />
            );
          },
          MobileNumberInput: (props: MobileNumberInputFieldProps) => (
            <MobileNumberInputField
              {...props}
              disabled={disabled || props.disabled}
            />
          ),
          Information,
          SelectTable: (props: any) => (
            <SelectTableField
              {...props}
              disabled={disabled || props?.disabled}
              onOptionsLoaded={onSelectTableOptionsChangeRef.current}
              onTotalFee={onTotalFeeFloatRef.current}
              establishmentId={establishmentId}
              serviceCode={serviceCode}
            />
          ),
          SelectTableSingle: (props: any) => (
            <SelectTableSingleField
              {...props}
              disabled={disabled || props?.disabled}
              onOptionsLoaded={onSelectTableOptionsChangeRef.current}
              onTotalFee={onTotalFeeFloatRef.current}
              serviceCode={serviceCode}
            />
          ),
          DataForm: DataFormField,
          AcquaintanceForm: (props: any) => (
            <AcquaintanceFormField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          LanguageSelect: (props: any) => (
            <LanguageSelect
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          LanguageSelectMulti: (props: any) => (
            <LanguageSelectMulti
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          IDSelector: (props: IDSelectorFieldProps) => (
            <IDSelectorField
              {...props}
              runtimeType={idSelectorRuntimeType}
            />
          ),
          PublicationForm: (props: any) => (
            <PublicationFormField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          AddressList: (props: any) => (
            <FilmingLocationsField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          UrlList: FilmsUrlsListField,
          BookList: (props: any) => (
            <BookListUploadField
              {...props}
              serviceCode={serviceCode}
              hideStatusColumn={hideBookListStatusColumn}
              bookStatusLookupHandledExternally={
                bookStatusLookupHandledExternally
              }
            />
          ),
          SocialMediaAccount: (props: any) => (
            <SocialMediaAccountField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          EmiratePort: (props: any) => (
            <EmiratePort
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          DataList: (props: any) => (
            <DataListInner
              {...props}
              disabled={disabled || props?.disabled}
              serviceCode={serviceCode}
              publicationNameCheckExclusions={publicationNameCheckExclusions}
            />
          ),
          PersonsInChargeList: PersonsInChargeListField,
          EquipmentList: EquipmentListInner,
          PartnerList: (props: any) => (
            <PartnerListField
              {...props}
              disabled={disabled || props?.disabled}
              serviceCode={serviceCode}
              establishmentId={establishmentId}
              service905OwnerPartners={service905OwnerPartners}
            />
          ),
          GameDistributionForm: (props: any) => (
            <GameDistributionFormField
              {...props}
              disabled={disabled || props?.disabled}
              artistWorkTypeOptions={artistWorkTypeOptions}
              artistWorkTypeOptionsLoading={artistWorkTypeOptionsLoading}
              materialTypeId={serviceMaterialTypeId}
            />
          ),
          FilmRescreeningForm: (props: any) => (
            <FilmRescreeningFormField
              {...props}
              disabled={disabled || props?.disabled}
              artistWorkTypeOptions={artistWorkTypeOptions}
              artistWorkTypeOptionsLoading={artistWorkTypeOptionsLoading}
              materialTypeId={serviceMaterialTypeId}
              serviceCode={serviceCode}
            />
          ),
          FilmScreeningForm: (props: any) => (
            <FilmScreeningFormField
              {...props}
              disabled={disabled || props?.disabled}
              artistWorkTypeOptions={artistWorkTypeOptions}
              artistWorkTypeOptionsLoading={artistWorkTypeOptionsLoading}
              materialTypeId={serviceMaterialTypeId}
              serviceCode={serviceCode}
            />
          ),
          FilmTrailerForm: (props: any) => (
            <FilmTrailerFormField
              {...props}
              disabled={disabled || props?.disabled}
              serviceCode={serviceCode}
            />
          ),
          LicenseTransferForm: LicenseTransferFormField,
          LicenseInformationForm: LicenseInformationFormField,
          TransferInformation: TransferInformationField,
          FilmingTeam: (props: any) => (
            <MemberListField
              {...props}
              disabled={disabled || props?.disabled}
              serviceCode={serviceCode}
            />
          ),
          BookTradingForm: (props: any) => (
            <BookTradingFormField
              {...props}
              disabled={disabled || props?.disabled}
              serviceCode={serviceCode}
            />
          ),
          Divider,
          SocialMediaManager: (props: any) => (
            <SocialMediaManagerField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          AddressPicker,
          FilmingPurposeForm: (props: any) => (
            <FilmingPurposeFormField
              {...props}
              disabled={disabled || props?.disabled}
              serviceCode={serviceCode}
            />
          ),
          VideoGamePackageForm: (props: any) => (
            <VideoGamePackageFormField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          Video: VideoField,
          TradeLicenseDetails: (props: any) => (
            <TradeLicenseDetailsField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          GuardianConsentDetails: (props: any) => (
            <GuardianConsentDetailsField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          MoviePackageForm: (props: any) => (
            <MoviePackageFormField
              {...props}
              disabled={disabled || props?.disabled}
              artistWorkTypeOptions={artistWorkTypeOptions}
              artistWorkTypeOptionsLoading={artistWorkTypeOptionsLoading}
              materialTypeId={serviceMaterialTypeId}
            />
          ),
          NewpaperMagazineCirculation: (props: any) => (
            <NewpaperMagazineCirculationField
              {...props}
              disabled={disabled || props?.disabled}
              serviceCode={serviceCode}
            />
          ),
          ScriptPublicationForm: (props: any) => (
            <ScriptPublicationFormField
              {...props}
              disabled={disabled || props?.disabled}
              serviceCode={serviceCode}
            />
          ),
          BeneficiaryType: (props: any) => (
            <BeneficiaryTypeField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          PosterAndTrailerPermit: (props: any) => (
            <PosterAndTrailerPermitField
              {...props}
              disabled={disabled || props?.disabled}
            />
          ),
          PressCardSelector: PressCardSelectorInner,
        },
      }),
    [
      artistWorkTypeOptions,
      artistWorkTypeOptionsLoading,
      bookStatusLookupHandledExternally,
      disabled,
      establishmentId,
      hideBookListStatusColumn,
      idSelectorRuntimeType,
      publicationNameCheckExclusions,
      serviceCode,
      serviceMaterialTypeId,
      service905OwnerPartners,
    ],
  );
  useEffect(() => {
    if (!formData || !formData.formData) {
      lastAppliedFormDataRef.current = "";
      lastAppliedFormValuesSignatureRef.current = "";
      setSchemaData({
        form: {
          labelCol: 4,
          wrapperCol: 14,
        },
        schema: {},
      });
      return;
    }

    // const Moss = JSON.parse(localStorage.getItem("formily-schema") || "{}");
    const Moss = formData;
    const localizedSchemaCacheKey = `${schemaDataSignature}::${
      i18n.language || "en"
    }::${disabled ? "disabled" : "editable"}::${serviceCode ?? ""}`;
    const shouldApplySchema =
      lastAppliedFormDataRef.current !== localizedSchemaCacheKey;
    const shouldApplyFormValues = shouldApplyFormValuesSignature(
      lastAppliedFormValuesSignatureRef.current,
      formValuesSignature,
    );

    if (!shouldApplySchema && !shouldApplyFormValues) {
      return;
    }

    if (shouldApplyFormValues) {
      lastAppliedFormValuesSignatureRef.current = formValuesSignature;
      form.setInitialValues(initialValues, "overwrite");
      void form.reset();
      setFormDataRevision((revision) => revision + 1);
    }

    if (!shouldApplySchema) return;
    lastAppliedFormDataRef.current = localizedSchemaCacheKey;

    try {
      const parsed = JSON.parse(Moss.formData) || {};
      const normalizedSchema = normalizeSchemaComponentProps(parsed.schema);
      const localizedSchema = localizeSchemaNode(
        normalizedSchema,
        Boolean(i18n.language?.startsWith("ar")),
      );
      const tooltipSchema = withPersonalPhotoTooltip(
        localizedSchema,
        PERSONAL_PHOTO_TOOLTIP_SERVICE_CODES.has(Number(serviceCode)),
      );
      const validatedSchema = moveMobileNumberRequiredToComponent(
        normalizeCapitalValidation(
          withArabicNameLocalValidation(tooltipSchema),
          getValidateLocale("number"),
        ),
      );
      setSchemaData({
        ...parsed,
        schema: disabled
          ? forceReviewRadioGroupReadonly(validatedSchema)
          : validatedSchema,
      });
    } catch (e) {
      console.error("Failed to parse formData:", e);
      setSchemaData({
        form: {
          labelCol: 4,
          wrapperCol: 14,
        },
        schema: {},
      });
    }
  }, [
    disabled,
    form,
    formData,
    formValuesSignature,
    i18n.language,
    initialValues,
    schemaDataSignature,
    serviceCode,
  ]);
  const formLanguage = mapDesignerLanguageToContentLang(i18n.language);
  return (
    <MobileNumberRuntimeProvider config={mobileNumberRuntimeConfig}>
      <FormLanguageProvider
        uiLang={formLanguage}
        contentLang={formLanguage}
        host="runtime"
      >
        <div className="FormliyView">
          <div
            style={{
              boxSizing: "border-box",
            }}
            className="antformbody hide-scrollbar"
          >
            <FormProvider form={form}>
              <PreviewText.Placeholder value="N/A">
                <FormLayout
                  layout="vertical"
                  labelCol={schemaData.form?.labelCol}
                  wrapperCol={schemaData.form?.wrapperCol}
                >
                  <form
                    onSubmit={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      form.submit().catch((error) => {
                        console.error("Failed to submit formily form:", error);
                      });
                    }}
                  >
                    <ProfileFormBridgeContext.Provider
                      value={profileFormBridgeRuntime}
                    >
                      <SchemaField schema={schemaData.schema}></SchemaField>
                    </ProfileFormBridgeContext.Provider>
                  </form>
                </FormLayout>
              </PreviewText.Placeholder>
            </FormProvider>
          </div>
        </div>
      </FormLanguageProvider>
    </MobileNumberRuntimeProvider>
  );
}

export default FormliyView;
