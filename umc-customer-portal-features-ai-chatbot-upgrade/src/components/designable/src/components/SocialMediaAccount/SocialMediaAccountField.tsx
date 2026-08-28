import * as React from "react";
import { observer, useField, useForm } from "@formily/react";
import { Card, Tag, Tooltip } from "antd";
import { useConfirmModal } from "@/components/common/ConfirmModal/useConfirmModal";
import { useTranslation } from "react-i18next";
import CustomButton from "../../../../common/CustomButton";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import { AddSocialMediaModal } from "./AddSocialMediaModal";
import { getLookupData } from "../../../../../services/services";
import { useServicesStore } from "@/store/services";
import { normalizeLookupOptions } from "@/utils/lookupOptions";
import { SocialMediaAccountIcon } from "./SocialMediaAccountIcon";
import {
  addSocialMediaAccount,
  deleteSocialMediaAccount,
  getSocialMediaAccountContainerAttributes,
  resolveSocialMediaAccountModifyContext,
  resolveSocialMediaAccountOperation,
  restoreSocialMediaAccount,
  updateSocialMediaAccount,
  type SocialMediaAccountItem,
} from "./socialMediaAccountModify";
import "./styles.less";
import FieldDecoratorTooltip from "@/components/designable/src/components/FormItemWithHtmlTooltip/FieldDecoratorTooltip";
import OverflowTooltip from "@/components/common/OverflowTooltip";
import { resolveExternalWebUrl } from "@/utils/url";

export type SocialMediaItem = SocialMediaAccountItem;

export type SocialMediaModalMode = "add" | "edit" | "view";

export type SocialMediaAccountProps = {
  disabled?: boolean;
  title?: React.ReactNode;
  titleEn?: string;
  titleAr?: string;
  labelName?: string;
  labelNameEn?: string;
  labelNameAr?: string;
  description?: unknown;
  addButtonLabel?: string;
  addButtonLabelEn?: string;
  addButtonLabelAr?: string;
  required?: boolean;
  modifyMode?: boolean;
  originalItems?: SocialMediaItem[];
  fixedMediaCategory?: string;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
};

type SocialMediaFormField = {
  value?: unknown;
  pattern?: string;
  required?: boolean;
  setValue: (value: SocialMediaItem[]) => void;
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const SocialMediaAccountField: React.FC<SocialMediaAccountProps> = observer((props) => {
  const field = useField<SocialMediaFormField>();
  const form = useForm();
  const { t, i18n } = useTranslation();
  const serviceCode = useServicesStore((state) => state.userInfo.servicesCode);
  const value = (
    Array.isArray(field.value) ? field.value : []
  ) as SocialMediaItem[];
  const isReviewMode = field.pattern === "readPretty";
  const isFormLocked =
    form.pattern === "disabled" ||
    form.pattern === "readOnly" ||
    form.pattern === "readPretty";
  const isReadOnlyMode =
    !!props.disabled ||
    field.pattern === "disabled" ||
    field.pattern === "readOnly" ||
    isReviewMode ||
    isFormLocked;
  const formInitialItems = form.initialValues?.socialMediaAccounts;
  const { modifyMode, originalItems } = React.useMemo(
    () => {
      const initialItems = Array.isArray(formInitialItems)
        ? (formInitialItems as SocialMediaItem[])
        : [];
      return resolveSocialMediaAccountModifyContext({
        serviceCode,
        configuredModifyMode: props.modifyMode,
        configuredOriginalItems: props.originalItems,
        initialItems,
      });
    },
    [formInitialItems, props.modifyMode, props.originalItems, serviceCode],
  );

  const [modalVisible, setModalVisible] = React.useState(false);
  const [modalMode, setModalMode] =
    React.useState<SocialMediaModalMode>("add");
  const [editingItem, setEditingItem] = React.useState<SocialMediaItem | null>(
    null,
  );
  const { modal: deleteModal, show: showDeleteModal } = useConfirmModal<string>({
    title: t("SocialMediaAccount.deleteTitle"),
    content: t("SocialMediaAccount.deleteContent"),
    okText: t("SocialMediaAccount.deleteOk"),
    cancelText: t("SocialMediaAccount.cancel"),
    onConfirm: (id) =>
      field.setValue(
        deleteSocialMediaAccount(value, id, originalItems, modifyMode),
      ),
  });

  const [mediaSubCategoriesRaw, setMediaSubCategoriesRaw] = React.useState<
    unknown[]
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    getLookupData("SocialMediaSubCategories", serviceCode)
      .then((res: { data?: unknown }) => {
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : [];
        if (!cancelled) {
          setMediaSubCategoriesRaw(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMediaSubCategoriesRaw([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [serviceCode]);

  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const localizedAddButtonLabel = isAr
    ? props.addButtonLabelAr
    : props.addButtonLabelEn;
  const configuredAddButtonLabel =
    localizedAddButtonLabel || props.addButtonLabel;
  const resolvedAddButtonLabel =
    !configuredAddButtonLabel || configuredAddButtonLabel === "Add New"
      ? t("SocialMediaAccount.addButtonLabel")
      : configuredAddButtonLabel;
  const localizedTitle = isAr
    ? props.titleAr || props.labelNameAr
    : props.titleEn || props.labelNameEn;
  const configuredTitle = localizedTitle || props.title || props.labelName;
  const resolvedTitle =
    typeof configuredTitle === "string"
      ? configuredTitle.trim() || t("SocialMediaAccount.cardTitle")
      : configuredTitle || t("SocialMediaAccount.cardTitle");
  const containerAttributes = getSocialMediaAccountContainerAttributes({
    ...props,
    className: [
      typeof props.className === "string" ? props.className : "",
      isReadOnlyMode ? "social-media-account-container--review" : "",
    ]
      .filter(Boolean)
      .join(" "),
  });
  const mediaSubCategories = React.useMemo(
    () =>
      normalizeLookupOptions(mediaSubCategoriesRaw, isAr).map((item) => ({
        value: String(item.value),
        label: item.label,
      })),
    [mediaSubCategoriesRaw, isAr],
  );
  const mediaSubCategoryLabelByValue = React.useMemo(
    () =>
      new Map(
        mediaSubCategories.map((item) => [item.value, item.label] as const),
      ),
    [mediaSubCategories],
  );
  const handleAdd = () => {
    setModalMode("add");
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleEdit = (item: SocialMediaItem) => {
    setModalMode("edit");
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleView = (item: SocialMediaItem) => {
    setModalMode("view");
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => showDeleteModal(id);

  const handleRestore = (id: string) => {
    field.setValue(
      restoreSocialMediaAccount(value, id, originalItems, modifyMode),
    );
  };

  const handleSave = (item: Omit<SocialMediaItem, "id">) => {
    if (editingItem) {
      const valuesWithoutLookupLabels = value.map((valueItem) => {
        if (valueItem.id !== editingItem.id) return valueItem;
        const nextValue = { ...valueItem } as SocialMediaItem & {
          accountTypeName?: string;
        };
        delete nextValue.accountTypeName;
        return nextValue;
      });
      field.setValue(
        updateSocialMediaAccount(
          valuesWithoutLookupLabels,
          editingItem.id,
          item,
          originalItems,
          modifyMode,
        ),
      );
    } else {
      field.setValue(
        addSocialMediaAccount(
          value,
          {
            id: createId(),
            ...item,
          },
          modifyMode,
        ),
      );
    }
    setModalVisible(false);
    setModalMode("add");
    setEditingItem(null);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setModalMode("add");
    setEditingItem(null);
  };

  return (
    <div {...containerAttributes}>
      <Card
        className="acq-form-card"
        title={
          <span>
            <span>{resolvedTitle}</span>
            <span className="social-media-account-required" aria-hidden="true">
              *
            </span>
            <FieldDecoratorTooltip
              fallbackContent={
                typeof props.description === "string" ? props.description : null
              }
              placement="top"
            />
          </span>
        }
        extra={
          isReadOnlyMode ? null : (
            <CustomButton
              disabled={props.disabled}
              className="social-media-account-add-btn"
              onClick={handleAdd}
            >
              {resolvedAddButtonLabel}
            </CustomButton>
          )
        }
      >
        {value.length === 0 ? (
          <EmptyBox
            title={t("SocialMediaAccount.emptyTitle")}
            hasButton={false}
            onClick={handleAdd}
          />
        ) : (
          <div className="social-media-account-list">
            {value.map((item) => {
              const operation = resolveSocialMediaAccountOperation(
                item,
                originalItems,
                modifyMode,
              );
              const isDeleted = operation === "DELETE";
              const statusLabel =
                operation === "ADD"
                  ? t("SocialMediaAccount.statusNew")
                  : operation === "MODIFY"
                    ? t("SocialMediaAccount.statusModified")
                    : operation === "DELETE"
                      ? t("SocialMediaAccount.statusDeleted")
                      : null;
              const displayName =
                item.accountName || t("SocialMediaAccount.untitled");

              return (
                <Card
                  key={item.id}
                  className={`social-media-account-card${
                    isDeleted ? " social-media-account-card--deleted" : ""
                  }`}
                >
                <div className="social-media-account-card-header">
                  <div className="social-media-account-icon">
                    <SocialMediaAccountIcon
                      typeId={item.accountType}
                    />
                  </div>
                  <div className="social-media-account-info">
                    <div className="social-media-account-title-row">
                      <OverflowTooltip
                        className="social-media-account-name"
                        title={displayName}
                      >
                        {displayName}
                      </OverflowTooltip>
                      {statusLabel && (
                        <Tag
                          className={`social-media-account-status social-media-account-status--${operation?.toLowerCase()}`}
                        >
                          {statusLabel}
                        </Tag>
                      )}
                    </div>
                    {(() => {
                      const safeAccountUrl = resolveExternalWebUrl(
                        item.accountUrl,
                      );
                      const urlContent = (
                        <>
                          <span className="url-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#92722A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                          </span>
                          <span className="url-text-twoLine">
                            {item.accountUrl || t("SocialMediaAccount.noUrl")}
                          </span>
                        </>
                      );

                      return safeAccountUrl ? (
                        <a
                          className="social-media-account-url social-media-account-url--link"
                          href={safeAccountUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={item.accountUrl}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {urlContent}
                        </a>
                      ) : (
                        <div className="social-media-account-url">
                          {urlContent}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {Array.isArray(item.mediaSubCategories) &&
                  item.mediaSubCategories.length > 0 && (
                    <div className="social-media-account-categories">
                      <div className="category-label">
                        {t("SocialMediaAccount.subCategory")}
                      </div>
                      <div className="category-tags">
                        {item.mediaSubCategories.slice(0, 3).map((cat, idx) => (
                          <Tag key={idx} className="category-tag">
                            {mediaSubCategoryLabelByValue.get(String(cat)) ??
                              String(cat ?? "")}
                          </Tag>
                        ))}
                        {item.mediaSubCategories.length > 3 && (
                          <Tooltip
                            placement="top"
                            overlayClassName="social-media-tags-tooltip"
                            title={
                              <div className="hidden-tags-tooltip">
                                {item.mediaSubCategories.slice(3).map((cat, idx) => (
                                  <Tag
                                    key={`${String(cat)}-${idx}`}
                                    className="category-tag"
                                  >
                                    {mediaSubCategoryLabelByValue.get(
                                      String(cat),
                                    ) ?? String(cat ?? "")}
                                  </Tag>
                                ))}
                              </div>
                            }
                          >
                            <Tag className="category-tag category-tag-more">
                              +{item.mediaSubCategories.length - 3}
                            </Tag>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  )}

                {isReadOnlyMode ? (
                  <div className="social-media-account-actions">
                    <CustomButton
                      size="small"
                      customClassName="social-media-account-edit-btn"
                      onClick={() => handleView(item)}
                    >
                      {t(
                        modifyMode
                          ? "SocialMediaAccount.details"
                          : "SocialMediaAccount.view",
                      )}
                    </CustomButton>
                  </div>
                ) : isDeleted ? (
                  <div className="social-media-account-actions">
                    <CustomButton
                      size="small"
                      variant="text"
                      customClassName="social-media-account-delete-btn"
                      onClick={() => handleRestore(item.id)}
                    >
                      {t("SocialMediaAccount.restore")}
                    </CustomButton>
                    <CustomButton
                      size="small"
                      customClassName="social-media-account-edit-btn"
                      onClick={() => handleView(item)}
                    >
                      {t("SocialMediaAccount.details")}
                    </CustomButton>
                  </div>
                ) : (
                  <div className="social-media-account-actions">
                    <CustomButton
                      size="small"
                      variant="text"
                      disabled={props.disabled}
                      customClassName="social-media-account-delete-btn"
                      onClick={() => handleDelete(item.id)}
                    >
                      {t("SocialMediaAccount.delete")}
                    </CustomButton>
                    <CustomButton
                      size="small"
                      disabled={props.disabled}
                      customClassName="social-media-account-edit-btn"
                      onClick={() => handleEdit(item)}
                    >
                      {t("SocialMediaAccount.edit")}
                    </CustomButton>
                  </div>
                )}
                </Card>
              );
            })}
          </div>
        )}

        {deleteModal}

        <AddSocialMediaModal
          visible={modalVisible}
          mode={modalMode}
          editingItem={editingItem}
          fixedMediaCategory={props.fixedMediaCategory}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Card>
    </div>
  );
});
