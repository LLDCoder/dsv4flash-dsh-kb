import * as React from "react";
import { observer, useField, useForm } from "@formily/react";
import FieldDecoratorTooltip from "@/components/designable/src/components/FormItemWithHtmlTooltip/FieldDecoratorTooltip";

import {
  Button,
  Card as AntdCard,
  Col,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Table,
  Tooltip,
} from "antd";
import { ExclamationCircleFilled, InfoCircleOutlined } from "@ant-design/icons";
import { fileUpload } from "@/services/media";
import DocumentViewer from "@/components/common/DocumentViewer";
import CustomButton from "@/components/common/CustomButton";
import "./styles.less";
import EmptyBox from "@/components/common/EmptyBox/EmptyBox";
import { useTranslation } from "react-i18next";

type UrlType = "File" | "URL";

type LegacyFilmUrlItem = {
  id?: string;
  title?: string;
  url?: string;
};

export type UrlListRecord = {
  title: string;
  type: UrlType;
  data: string;
  password: string;
  fileUrl?: string;
};

type UrlListValue = Array<LegacyFilmUrlItem | UrlListRecord>;

type UrlListProps = {
  value?: UrlListValue;
  onChange?: (value: UrlListRecord[]) => void;
  addButtonText?: string;
  designMode?: boolean;
  title?: string;
  maxItems?: number;
  fileSizeLimit?: number;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
};

type FormilyLikeField = {
  value?: unknown;
  setValue?: (value: UrlListRecord[]) => void;
  designable?: boolean;
  pattern?: string;
  required?: boolean;
};

type FormValues = {
  title: string;
  type: UrlType;
  url?: string;
  password?: string;
  file?: string | string[];
  fileName?: string;
};

type DocumentViewerUploadRequest = {
  file: File;
  onSuccess?: (url: string) => void;
  onError?: (error: unknown) => void;
};

type ModalMode = "add" | "edit" | "view";

const FILE_ACCEPT =
  ".mp4,.mov,.avi,.mkv,.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
const MAX_TITLE_LENGTH = 100;
const MAX_URL_LENGTH = 2000;
const MAX_PASSWORD_LENGTH = 50;
const DEFAULT_MAX_ITEMS = 3;
const DEFAULT_FILE_SIZE_LIMIT = 100;

const PREVIEW_DATA: UrlListRecord[] = [
  { title: "Sample File", type: "File", data: "document.pdf", password: "" },
  {
    title: "Sample URL",
    type: "URL",
    data: "https://example.com/resource",
    password: "123456",
  },
];

const normalizeMaxItems = (value?: number) =>
  Math.min(
    12,
    Math.max(1, Number.isFinite(value) ? Number(value) : DEFAULT_MAX_ITEMS),
  );

const normalizeFileSizeLimit = (value?: number) =>
  Math.min(
    200,
    Math.max(
      1,
      Number.isFinite(value) ? Number(value) : DEFAULT_FILE_SIZE_LIMIT,
    ),
  );

const normalizeUrlListValue = (value: unknown): UrlListRecord[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const rawItem = item as Record<string, unknown>;
      const title = String(rawItem.title ?? "").trim();
      const rawType = rawItem.type;
      const type: UrlType = rawType === "File" ? "File" : "URL";

      if (rawType === "File" || rawType === "URL") {
        return {
          title,
          type,
          data: String(rawItem.data ?? "").trim(),
          password: String(rawItem.password ?? "").slice(
            0,
            MAX_PASSWORD_LENGTH,
          ),
          fileUrl:
            typeof rawItem.fileUrl === "string"
              ? rawItem.fileUrl.trim()
              : undefined,
        } satisfies UrlListRecord;
      }

      return {
        title,
        type: "URL",
        data: String(rawItem.url ?? "").trim(),
        password: "",
      } satisfies UrlListRecord;
    })
    .filter(
      (item): item is UrlListRecord =>
        !!item && Boolean(item.title || item.data || item.fileUrl),
    );
};

const getFileNameFromPath = (value?: string) => {
  if (!value) return "";
  const normalized = value.split("?")[0];
  const parts = normalized.split("/");
  return parts[parts.length - 1] || normalized;
};

export const FilmsUrlsListField: React.FC<UrlListProps> = observer((props) => {
  const { t } = useTranslation();
  const field = useField<FormilyLikeField>();
  const formilyForm = useForm();
  const designMode = Boolean(props.designMode ?? field?.designable);
  const externalValue = field ? field.value : props.value;
  const normalizedExternalValue = React.useMemo(
    () => normalizeUrlListValue(externalValue),
    [externalValue],
  );

  const [data, setData] = React.useState<UrlListRecord[]>(
    designMode ? PREVIEW_DATA : normalizedExternalValue,
  );
  const [modalVisible, setModalVisible] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<ModalMode>("add");
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = React.useState<number | null>(null);
  const [pendingFormValues, setPendingFormValues] =
    React.useState<Partial<FormValues> | null>(null);
  const [form] = Form.useForm<FormValues>();

  const normalizedMaxItems = React.useMemo(
    () => normalizeMaxItems(props.maxItems),
    [props.maxItems],
  );
  const normalizedFileSizeLimit = React.useMemo(
    () => normalizeFileSizeLimit(props.fileSizeLimit),
    [props.fileSizeLimit],
  );
  const isPreviewMode =
    field?.pattern === "readPretty" ||
    field?.pattern === "disabled" ||
    formilyForm?.pattern === "readPretty" ||
    formilyForm?.pattern === "disabled";
  const isDisabled =
    Boolean(props.disabled || props.readOnly) ||
    field?.pattern === "readOnly" ||
    field?.pattern === "readPretty" ||
    field?.pattern === "disabled" ||
    formilyForm?.pattern === "readOnly" ||
    formilyForm?.pattern === "readPretty" ||
    formilyForm?.pattern === "disabled";
  const hideActionControls = designMode || isPreviewMode || isDisabled;
  const showPreviewViewAction = !designMode && isPreviewMode;
  const isViewMode = modalMode === "view";
  React.useEffect(() => {
    setData(designMode ? PREVIEW_DATA : normalizedExternalValue);
  }, [designMode, normalizedExternalValue]);

  React.useEffect(() => {
    if (!modalVisible || !pendingFormValues) return;
    form.resetFields();
    form.setFieldsValue(pendingFormValues);
    setPendingFormValues(null);
  }, [form, modalVisible, pendingFormValues]);

  const triggerChange = React.useCallback(
    (next: UrlListRecord[]) => {
      setData(next);
      field?.setValue?.(next);
      props.onChange?.(next);
    },
    [field, props],
  );

  const reachedMaxItems = !designMode && data.length >= normalizedMaxItems;

  const openAddModal = React.useCallback(() => {
    if (designMode || isDisabled || reachedMaxItems) return;
    setModalMode("add");
    setEditingIndex(null);
    setPendingFormValues({ type: "File" });
    setModalVisible(true);
  }, [designMode, isDisabled, reachedMaxItems]);

  const openEditModal = React.useCallback(
    (record: UrlListRecord, index: number) => {
      if (designMode || isDisabled) return;
      setModalMode("edit");
      setEditingIndex(index);
      setPendingFormValues({
        title: record.title,
        type: record.type,
        url: record.type === "URL" ? record.data : undefined,
        password: record.type === "URL" ? record.password : undefined,
        file: record.type === "File" ? record.fileUrl : undefined,
        fileName: record.type === "File" ? record.data : undefined,
      });
      setModalVisible(true);
    },
    [designMode, isDisabled],
  );

  const openViewModal = React.useCallback(
    (record: UrlListRecord) => {
      setModalMode("view");
      setEditingIndex(null);
      setPendingFormValues({
        title: record.title,
        type: record.type,
        url: record.type === "URL" ? record.data : undefined,
        password: record.type === "URL" ? record.password : undefined,
        file: record.type === "File" ? record.fileUrl : undefined,
        fileName: record.type === "File" ? record.data : undefined,
      });
      setModalVisible(true);
    },
    [],
  );

  const confirmDelete = React.useCallback(
    (index: number) => {
      if (designMode || isDisabled) return;
      setDeletingIndex(index);
      setDeleteModalVisible(true);
    },
    [designMode, isDisabled],
  );

  const handleDeleteConfirm = React.useCallback(() => {
    if (deletingIndex == null) return;
    const next = data.filter((_, index) => index !== deletingIndex);
    triggerChange(next);
    setDeleteModalVisible(false);
    setDeletingIndex(null);
  }, [data, deletingIndex, triggerChange]);

  const closeFormModal = React.useCallback(() => {
    setModalVisible(false);
    setPendingFormValues(null);
    setEditingIndex(null);
    setModalMode("add");
    form.resetFields();
  }, [form]);

  const handleOk = React.useCallback(async () => {
    try {
      const values = await form.validateFields();
      const normalizedTitle = String(values.title || "")
        .slice(0, MAX_TITLE_LENGTH)
        .trim();
      const type = values.type || "File";
      const uploadedUrl = Array.isArray(values.file)
        ? values.file[0]
        : values.file;
      const urlValue = String(values.url || "")
        .slice(0, MAX_URL_LENGTH)
        .trim();
      const passwordValue = String(values.password || "").slice(
        0,
        MAX_PASSWORD_LENGTH,
      );
      const item: UrlListRecord = {
        title: normalizedTitle,
        type,
        data:
          type === "File"
            ? String(values.fileName || getFileNameFromPath(uploadedUrl)).trim()
            : urlValue,
        password: type === "URL" ? passwordValue : "",
        fileUrl: type === "File" ? uploadedUrl : undefined,
      };
      const next = [...data];
      if (editingIndex != null) {
        next[editingIndex] = item;
      } else {
        next.push(item);
      }
      triggerChange(next);
      setModalVisible(false);
      setPendingFormValues(null);
      form.resetFields();
    } catch {
      // validation handled by antd form
    }
  }, [data, editingIndex, form, triggerChange]);

  const customRequest = React.useCallback(
    async (options: DocumentViewerUploadRequest) => {
      const { file, onSuccess, onError } = options;
      const formData = new FormData();
      formData.append("files", file as Blob);

      try {
        const res = await fileUpload(formData);
        if (Array.isArray(res.data) && res.data.length > 0) {
          const fileUrl = res.data[0];
          onSuccess?.(fileUrl);
          return;
        }

        onError?.(new Error(t("UrlList.validation.uploadResponseEmpty")));
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [t],
  );

  const validateUrl = React.useCallback(
    async (_: unknown, value?: string) => {
      const trimmed = String(value || "").trim();
      if (!trimmed) {
        return Promise.resolve();
      }

      try {
        const parsed = new URL(trimmed);
        if (!/^https?:$/.test(parsed.protocol)) {
          return Promise.reject(new Error(t("UrlList.validation.validUrl")));
        }
        return Promise.resolve();
      } catch {
        return Promise.reject(new Error(t("UrlList.validation.validUrl")));
      }
    },
    [t],
  );

  const columns = React.useMemo(() => {
    const baseColumns = [
      {
        title: t("UrlList.columns.title"),
        dataIndex: "title",
        key: "title",
        width: 120,
        ellipsis: true,
      },
      {
        title: t("UrlList.columns.type"),
        dataIndex: "type",
        key: "type",
        width: 120,
      },
      {
        title: t("UrlList.columns.data"),
        dataIndex: "data",
        key: "data",
        width: 160,
        ellipsis: true,
      },
      {
        title: t("UrlList.columns.password"),
        key: "password",
        width: 180,
        ellipsis: true,
        render: (_: unknown, record: UrlListRecord) =>
          record.type === "URL" ? record.password || "" : "---",
      },
    ];

    if (showPreviewViewAction) {
      return [
        ...baseColumns,
        {
          title: t("UrlList.columns.actions"),
          key: "actions",
          width: 100,
          render: (_: unknown, record: UrlListRecord) => (
            <span className="new-url-list-actions">
              <a className="action-link" onClick={() => openViewModal(record)}>
                {t("UrlList.view")}
              </a>
            </span>
          ),
        },
      ];
    }

    if (hideActionControls) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        title: t("UrlList.columns.actions"),
        key: "actions",
        width: 140,
        render: (_: unknown, record: UrlListRecord, index: number) => (
          <span className="new-url-list-actions">
            <a className="action-link" onClick={() => openEditModal(record, index)}>
              {t("UrlList.edit")}
            </a>
            <a className="action-link" onClick={() => confirmDelete(index)}>
              {t("UrlList.delete")}
            </a>
          </span>
        ),
      },
    ];
  }, [confirmDelete, hideActionControls, openEditModal, openViewModal, showPreviewViewAction, t]);

  return (
    <div className="new-url-list-wrapper">
      <AntdCard
        title={
          <div className="new-url-list-inner-header">
            <div className="new-url-list-inner-title">
              <span>{props.title || t("UrlList.title")}</span>
              <span className="new-url-list-required">*</span>
              <FieldDecoratorTooltip placement="top" />
            </div>
            {!hideActionControls ? (
              <Button
                type="primary"
                className="new-url-list-add-btn"
                onClick={openAddModal}
                disabled={reachedMaxItems}
              >
                {props.addButtonText || t("UrlList.addNew")}
              </Button>
            ) : null}
          </div>
        }
        className="new-url-list-card"
      >
        {data.length > 0 ? (
          <Table
            rowKey={(_, index) => `row-${index}`}
            columns={columns}
            dataSource={data}
            pagination={false}
            className="new-url-list-table"
            scroll={{ x: 680 }}
          />
        ) : (
          <div className="new-url-list-empty">
            <EmptyBox title={t("UrlList.noData")} />
          </div>
        )}
      </AntdCard>

      <Modal
        title={
          isViewMode
            ? t("UrlList.view")
            : editingIndex != null
              ? t("UrlList.edit")
              : t("UrlList.addNew")
        }
        visible={modalVisible}
        onCancel={closeFormModal}
        centered
        footer={null}
        destroyOnClose
        className={
          isViewMode
            ? "datalist-form-modal new-url-list-form-modal new-url-list-form-modal--view"
            : "datalist-form-modal new-url-list-form-modal"
        }
        maskClosable={false}
        getContainer={() => document.body}
        width={900}
      >
        <Form
          form={form}
          layout="vertical"
          className="Formily-Modal-Form new-url-list-modal-form"
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label={t("UrlList.form.title")}
                name="title"
                rules={[
                  {
                    required: true,
                    message: t("UrlList.validation.enterTitle"),
                  },
                ]}
              >
                <Input
                  className="new-url-list-title-input"
                  disabled={isViewMode}
                  placeholder={t("UrlList.placeholder.enterTitle")}
                  maxLength={MAX_TITLE_LENGTH}
                  onChange={(event) => {
                    const next = event.target.value.slice(0, MAX_TITLE_LENGTH);
                    if (next !== event.target.value) {
                      form.setFieldsValue({ title: next });
                    }
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={t("UrlList.form.type")}
                name="type"
                rules={[
                  {
                    required: true,
                    message: t("UrlList.validation.selectType"),
                  },
                ]}
              >
                <Radio.Group disabled={isViewMode}>
                  <Radio value="File">{t("UrlList.type.file")}</Radio>
                  <Radio value="URL">{t("UrlList.type.url")}</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>

            <Form.Item noStyle dependencies={["type"]}>
              {({ getFieldValue }) => {
                const currentType = getFieldValue("type") as
                  | UrlType
                  | undefined;
                const isFile = currentType === "File";

                return isFile ? (
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <span className="new-url-list-label-with-tip">
                          {t("UrlList.form.file")}
                          <Tooltip title={t("UrlList.fileTooltip")}>
                            <InfoCircleOutlined className="label-tip-icon" />
                          </Tooltip>
                        </span>
                      }
                      name="file"
                      rules={[
                        {
                          required: true,
                          message: t("UrlList.validation.uploadFile"),
                        },
                      ]}
                    >
                      <DocumentViewer
                        hasView={true}
                        hasDownload={true}
                        hasDelete={!isDisabled && !isViewMode}
                        disabled={isDisabled || isViewMode}
                        uploadConfig={{
                          maxCount: 1,
                          maxSize: normalizedFileSizeLimit,
                          accept: FILE_ACCEPT,
                          placeholder: t("UrlList.placeholder.uploadFile"),
                          uploadTip: t("UrlList.uploadTip", {
                            size: normalizedFileSizeLimit,
                          }),
                          invalidFileTypeMessage: t(
                            "UrlList.validation.invalidFileType",
                          ),
                          maxSizeErrorMessage: t(
                            "UrlList.validation.maxFileSize",
                            {
                              size: normalizedFileSizeLimit,
                            },
                          ),
                          customRequest,
                          onUploadSuccess: (fileData) => {
                            form.setFieldsValue({
                              fileName: fileData[0]?.name || "",
                            });
                          },
                        }}
                      />
                    </Form.Item>
                  </Col>
                ) : (
                  <>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label={t("UrlList.form.url")}
                        name="url"
                        rules={[
                          {
                            required: true,
                            message: t("UrlList.validation.enterUrl"),
                          },
                          { validator: validateUrl },
                        ]}
                      >
                        <Input
                          disabled={isViewMode}
                          placeholder="https://"
                          maxLength={MAX_URL_LENGTH}
                          onChange={(event) => {
                            const next = event.target.value.slice(
                              0,
                              MAX_URL_LENGTH,
                            );
                            if (next !== event.target.value) {
                              form.setFieldsValue({ url: next });
                            }
                          }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        label={t("UrlList.form.password")}
                        name="password"
                      >
                        <Input
                          disabled={isViewMode}
                          placeholder={t("UrlList.placeholder.enterPassword")}
                          maxLength={MAX_PASSWORD_LENGTH}
                          onChange={(event) => {
                            const next = event.target.value.slice(
                              0,
                              MAX_PASSWORD_LENGTH,
                            );
                            if (next !== event.target.value) {
                              form.setFieldsValue({ password: next });
                            }
                          }}
                        />
                      </Form.Item>
                    </Col>
                  </>
                );
              }}
            </Form.Item>
          </Row>
        </Form>

        <div className="formily-modal-footer">
          <CustomButton variant="outline" onClick={closeFormModal}>
            {isViewMode ? t("UrlList.close") : t("UrlList.cancel")}
          </CustomButton>
          {!isViewMode ? (
            <CustomButton onClick={handleOk}>
              {editingIndex != null ? t("UrlList.save") : t("UrlList.confirm")}
            </CustomButton>
          ) : null}
        </div>
      </Modal>

      <Modal centered
        title={null}
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        footer={null}
        destroyOnClose
        className="new-url-list-delete-modal"
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
              {t("UrlList.deleteRecord")}
            </div>
            <div className="delete-modal-desc">
              {t("UrlList.deleteRecordDesc")}
            </div>
          </div>
        </div>
        <div className="formily-modal-footer">
          <CustomButton
            variant="outline"
            onClick={() => setDeleteModalVisible(false)}
          >
            {t("UrlList.cancel")}
          </CustomButton>
          <CustomButton variant="danger" onClick={handleDeleteConfirm}>
            {t("UrlList.confirm")}
          </CustomButton>
        </div>
      </Modal>
    </div>
  );
});
