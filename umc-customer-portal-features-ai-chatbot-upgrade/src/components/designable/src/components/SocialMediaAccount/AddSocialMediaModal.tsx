import * as React from "react";
import { Modal, Form, Input, Select, Row, Col, Checkbox } from "antd";
import { useTranslation } from "react-i18next";
import type {
  SocialMediaItem,
  SocialMediaModalMode,
} from "./SocialMediaAccountField";
import CustomButton from "../../../../common/CustomButton";
import DocumentViewer from "../../../../common/DocumentViewer";
import {
  getLookupData,
  getSocialMediaSubCategory,
} from "../../../../../services/services";
import { useServicesStore } from "@/store/services";
import { normalizeLookupOptions } from "@/utils/lookupOptions";
import CustomMessage from "@/components/common/CustomMessage";
import { SocialMediaAccountIcon } from "./SocialMediaAccountIcon";

const { Option } = Select;
const FORMILY_CONTROL_DROPDOWN_CLASS = "formily-control-dropdown";
const LIMITED_MEDIA_CATEGORY_SERVICE_CODES = new Set([
  "8007",
  "80011",
  "80021",
  "8008",
]);
const FIXED_MEDIA_CATEGORY_VALUE = "2";

interface AddSocialMediaModalProps {
  visible: boolean;
  mode?: SocialMediaModalMode;
  editingItem: SocialMediaItem | null;
  onSave: (item: Omit<SocialMediaItem, "id">) => void;
  onCancel: () => void;
  title?: string;
  fixedMediaCategory?: string;
}

export const AddSocialMediaModal: React.FC<AddSocialMediaModalProps> = ({
  visible,
  mode = "add",
  editingItem,
  onSave,
  onCancel,
  title,
  fixedMediaCategory,
}) => {
  const { t, i18n } = useTranslation();
  const serviceCode = useServicesStore((state) => state.userInfo.servicesCode);
  const resolvedFixedMediaCategory =
    fixedMediaCategory ??
    (LIMITED_MEDIA_CATEGORY_SERVICE_CODES.has(String(serviceCode ?? ""))
      ? FIXED_MEDIA_CATEGORY_VALUE
      : undefined);
  const hasFixedMediaCategory = Boolean(resolvedFixedMediaCategory);
  const [form] = Form.useForm();
  const selectedMediaSubCategories = Form.useWatch(
    "mediaSubCategories",
    form,
  );
  const [mediaCategoriesRaw, setMediaCategoriesRaw] = React.useState<
    unknown[]
  >([]);
  const [mediaSubCategoriesRaw, setMediaSubCategoriesRaw] = React.useState<
    unknown[]
  >([]);
  const [accountTypesRaw, setAccountTypesRaw] = React.useState<unknown[]>([]);
  const [
    mediaCategoryForSubCategories,
    setMediaCategoryForSubCategories,
  ] = React.useState<string>();

  const isAr = Boolean(i18n.language?.startsWith("ar"));

  const mediaCategories = React.useMemo(
    () =>
      normalizeLookupOptions(mediaCategoriesRaw, isAr)
        .map((item) => ({
          value: String(item.value),
          label: item.label,
        }))
        .filter((item) =>
          hasFixedMediaCategory
            ? item.value === resolvedFixedMediaCategory
            : true,
        ),
    [
      mediaCategoriesRaw,
      isAr,
      hasFixedMediaCategory,
      resolvedFixedMediaCategory,
    ],
  );

  const mediaSubCategories = React.useMemo(
    () =>
      normalizeLookupOptions(mediaSubCategoriesRaw, isAr).map((item) => ({
        value: String(item.value),
        label: item.label,
      })),
    [mediaSubCategoriesRaw, isAr],
  );
  const accountTypes = React.useMemo(
    () =>
      normalizeLookupOptions(accountTypesRaw, isAr).map((item) => ({
        value: String(item.value),
        label: item.label,
      })),
    [accountTypesRaw, isAr],
  );

  const isViewMode = mode === "view";
  const selectedMediaSubCategoryValues = Array.isArray(
    selectedMediaSubCategories,
  )
    ? selectedMediaSubCategories.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const mediaSubCategoryValues = mediaSubCategories.map((item) => item.value);
  const hasSelectedMediaSubCategories = mediaSubCategoryValues.some((value) =>
    selectedMediaSubCategoryValues.includes(value),
  );
  const areAllMediaSubCategoriesSelected =
    mediaSubCategoryValues.length > 0 &&
    mediaSubCategoryValues.every((value) =>
      selectedMediaSubCategoryValues.includes(value),
    );

  const handleSelectAllMediaSubCategories = (checked: boolean) => {
    if (isViewMode) return;
    form.setFieldsValue({
      mediaSubCategories: checked ? mediaSubCategoryValues : [],
    });
  };

  const renderMediaSubCategorySelectionContent = (label: string) => (
    <div className="social-media-sub-category-selection-item">
      <Checkbox checked />
      <span>{label}</span>
    </div>
  );

  const renderMediaSubCategoryDropdown = (menu: React.ReactNode) => (
    <div>
      <div className="social-media-sub-category-select-all">
        <Checkbox
          className={
            hasSelectedMediaSubCategories
              ? "social-media-sub-category-select-all-checkbox social-media-sub-category-select-all-checkbox-has-selection"
              : "social-media-sub-category-select-all-checkbox"
          }
          checked={areAllMediaSubCategoriesSelected}
          disabled={isViewMode || mediaSubCategoryValues.length === 0}
          onChange={(event) =>
            handleSelectAllMediaSubCategories(event.target.checked)
          }
        >
          {t("LanguageSelectMulti.selectAll")}
        </Checkbox>
      </div>
      <div>{menu}</div>
    </div>
  );

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getLookupData("SocialMediaCategories", serviceCode)
      .then((res: { data?: unknown }) => {
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : [];
        if (cancelled) return;
        setMediaCategoriesRaw(list);
      })
      .catch(() => {
        if (!cancelled) {
          setMediaCategoriesRaw([]);
        }
      });

    getLookupData("SocialMedias", serviceCode)
      .then((res: { data?: unknown }) => {
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : [];
        if (cancelled) return;
        setAccountTypesRaw(list);
      })
      .catch(() => {
        if (!cancelled) {
          setAccountTypesRaw([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, serviceCode]);

  React.useEffect(() => {
    if (!visible) return;
    if (!mediaCategoryForSubCategories) {
      setMediaSubCategoriesRaw([]);
      return;
    }

    let cancelled = false;
    getSocialMediaSubCategory(mediaCategoryForSubCategories)
      .then((res: { data?: unknown }) => {
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : [];
        if (cancelled) return;
        setMediaSubCategoriesRaw(list);
      })
      .catch(() => {
        if (!cancelled) {
          setMediaSubCategoriesRaw([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, mediaCategoryForSubCategories]);

  React.useEffect(() => {
    if (visible) {
      if (editingItem) {
        const initialMediaCategory = hasFixedMediaCategory
          ? resolvedFixedMediaCategory
          : editingItem.mediaCategory;
        form.setFieldsValue({
          mediaCategory: initialMediaCategory,
          mediaSubCategories: editingItem.mediaSubCategories,
          accountType: editingItem.accountType,
          accountTitle: editingItem.accountTitle,
          accountUrl: editingItem.accountUrl,
          screenshot: editingItem.screenshot,
        });
        setMediaCategoryForSubCategories(initialMediaCategory);
      } else {
        form.resetFields();
        setMediaCategoryForSubCategories(resolvedFixedMediaCategory);
        if (hasFixedMediaCategory) {
          form.setFieldsValue({
            mediaCategory: resolvedFixedMediaCategory,
          });
        }
      }
    }
  }, [
    visible,
    editingItem,
    form,
    hasFixedMediaCategory,
    resolvedFixedMediaCategory,
  ]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSave({
        accountName: values.accountTitle,
        accountUrl: values.accountUrl,
        mediaCategory: values.mediaCategory,
        mediaSubCategories: values.mediaSubCategories,
        accountType: values.accountType,
        accountTitle: values.accountTitle,
        screenshot: values.screenshot,
      });
      CustomMessage.success(t("SocialMediaAccount.addSuccess"));
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleFormValuesChange = (changedValues: {
    mediaCategory?: string;
  }) => {
    if (Object.prototype.hasOwnProperty.call(changedValues, "mediaCategory")) {
      setMediaCategoryForSubCategories(changedValues.mediaCategory);
      form.setFieldsValue({ mediaSubCategories: [] });
    }
  };

  const resolvedTitle =
    title ??
    (isViewMode
      ? t("SocialMediaAccount.modalViewTitle")
      : editingItem
      ? t("SocialMediaAccount.modalEditTitle")
      : t("SocialMediaAccount.modalAddTitle"));

  const screenshotUploadConfig = {
    maxCount: 1,
    maxSize: 5,
    placeholder: t("SocialMediaAccount.upload"),
    uploadTip: t("SocialMediaAccount.uploadTip"),
    accept: ".jpg,.jpeg,.png",
  };

  return (
    <Modal centered
      title={resolvedTitle}
      visible={visible}
      onCancel={onCancel}
      width="80%"
      style={{ maxWidth: "800px" }}
      className="social-media-modal"
      footer={null}
    >
      <Form
        form={form}
        disabled={isViewMode}
        onValuesChange={isViewMode ? undefined : handleFormValuesChange}
        layout="vertical"
        className="custorm-form social-media-form formily-control-typography"
      >
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item
              name="mediaCategory"
              label={<span>{t("SocialMediaAccount.mediaCategory")}</span>}
              rules={[
                { required: true, message: t("SocialMediaAccount.mediaCategoryRequired") },
              ]}
            >
              <Select
                disabled={hasFixedMediaCategory}
                placeholder={t("SocialMediaAccount.mediaCategoryPlaceholder")}
                showSearch
                optionFilterProp="children"
                dropdownClassName={FORMILY_CONTROL_DROPDOWN_CLASS}
              >
                {mediaCategories.map((cat) => (
                  <Option key={cat.value} value={cat.value}>
                    {cat.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="mediaSubCategories"
              label={<span>{t("SocialMediaAccount.mediaSubCategory")}</span>}
              rules={[
                {
                  required: true,
                  message: t("SocialMediaAccount.mediaSubCategoryRequired"),
                },
              ]}
            >
              <Select
                mode="multiple"
                placeholder={t("SocialMediaAccount.mediaSubCategoryPlaceholder")}
                maxTagCount={2}
                showArrow
                showSearch
                optionFilterProp="title"
                className="Formily-multi-select social-media-sub-category-select"
                dropdownClassName={`${FORMILY_CONTROL_DROPDOWN_CLASS} social-media-sub-category-dropdown`}
                dropdownRender={renderMediaSubCategoryDropdown}
              >
                {mediaSubCategories.map((cat) => (
                  <Option
                    key={cat.value}
                    value={cat.value}
                    label={renderMediaSubCategorySelectionContent(cat.label)}
                    title={cat.label}
                  >
                    <div className="social-media-sub-category-option">
                      <Checkbox
                        className="social-media-sub-category-option-checkbox"
                        checked={selectedMediaSubCategoryValues.includes(
                          cat.value,
                        )}
                      />
                      <span className="social-media-item-label">{cat.label}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item
              name="accountType"
              label={<span>{t("SocialMediaAccount.accountType")}</span>}
              rules={[
                { required: true, message: t("SocialMediaAccount.accountTypeRequired") },
              ]}
            >
              <Select
                placeholder={t("SocialMediaAccount.accountTypePlaceholder")}
                showSearch
                optionFilterProp="label"
                dropdownClassName={FORMILY_CONTROL_DROPDOWN_CLASS}
              >
                {accountTypes.map((type) => (
                  <Option
                    key={type.value}
                    value={type.value}
                    label={type.label}
                  >
                    <span className="social-media-account-type-option">
                      <SocialMediaAccountIcon
                        typeId={type.value}
                        className="social-media-account-type-option__icon"
                      />
                      <span className="social-media-account-type-option__label">
                        {type.label}
                      </span>
                    </span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="accountTitle"
              label={<span>{t("SocialMediaAccount.accountTitle")}</span>}
              rules={[
                { required: true, message: t("SocialMediaAccount.accountTitleRequired") },
                {
                  pattern: /^.{0,200}$/,
                  message: t("SocialMediaAccount.accountTitleMax"),
                },
              ]}
            >
              <Input placeholder={t("SocialMediaAccount.accountTitlePlaceholder")} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item
              name="accountUrl"
              label={<span>{t("SocialMediaAccount.accountUrl")}</span>}
              validateTrigger={["onChange", "onBlur"]}
              rules={[
                { required: true, message: t("SocialMediaAccount.accountUrlRequired") },
                {
                  validator: (_, value: unknown) => {
                    if (typeof value !== "string" || value.trim().length === 0) {
                      return Promise.resolve();
                    }
                    try {
                      const url = new URL(value.trim());
                      if (url.protocol !== "http:" && url.protocol !== "https:") {
                        throw new Error("Unsupported URL protocol");
                      }
                      return Promise.resolve();
                    } catch {
                      return Promise.reject(
                        new Error(t("SocialMediaAccount.accountUrlInvalid")),
                      );
                    }
                  },
                },
                {
                  pattern: /^.{0,300}$/,
                  message: t("SocialMediaAccount.accountUrlMax"),
                },
              ]}
            >
              <Input placeholder={t("SocialMediaAccount.accountUrlPlaceholder")} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              className="ant-formily-item-control-content-component"
              name="screenshot"
              label={t("SocialMediaAccount.screenshotLabel")}
            >
              <DocumentViewer
                disabled={isViewMode}
                hasDelete={!isViewMode}
                uploadConfig={screenshotUploadConfig}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <div className="formily-modal-footer">
        <CustomButton variant="outline" onClick={onCancel}>
          {t("SocialMediaAccount.cancel")}
        </CustomButton>
        {!isViewMode && (
          <CustomButton variant="gold" onClick={handleSubmit}>
            {t("SocialMediaAccount.save")}
          </CustomButton>
        )}
      </div>
    </Modal>
  );
};
