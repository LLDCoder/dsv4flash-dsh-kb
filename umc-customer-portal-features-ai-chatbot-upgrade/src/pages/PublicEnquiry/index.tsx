import { Modal, Form, Select, Radio, Input, Rate, Tooltip } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import type { DefaultOptionType } from "antd/lib/select";
import type { RcFile } from "antd/lib/upload/interface";

import PublicLayout from "@/components/common/PublicLayout";
import ArrowLeft from "@/assets/icons/ArrowLeft";
import { CustomMessage } from "@/components/common";
import DocumentViewer from "@/components/common/DocumentViewer";
import SuccessPng from "@/assets/images/success.png";
import AttachmentQuestion from "@/assets/images/attachmentQuestion.svg";
import Copy from "@/assets/icons/Copy";
import { copyToClipboard } from "@/utils/copy";
import { resolveApiEntityLabel } from "@/utils/bilingualDisplay";
import {
  getPublicEnquiryTypes,
  getPublicEnquiryServices,
  postPublicEnquiry,
  postPublicUserServiceRating,
  checkPublicApplication,
} from "@/services/complaints";
import { publicFileUpload } from "@/services/media";

import "./index.less";

type EnquiryTypeOption = { label: string; value: number };

const APPLICATION_NUMBER_MAX_LENGTH = 64;
const PROBLEM_DESCRIPTION_MAX_LENGTH = 1000;

const getTrimmedText = (value: unknown) => String(value ?? "").trim();

const limitByTrimmedLength = (
  value: unknown,
  previousValue: unknown,
  maxLength: number,
) => {
  if (typeof value !== "string") {
    return value;
  }

  return getTrimmedText(value).length <= maxLength ? value : previousValue;
};

export default function PublicEnquiry() {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const [form] = Form.useForm();
  const [, update] = useState({});
  const history = useHistory();

  const [hasApplicationNumber, setHasApplicationNumber] = useState(true);
  const [enquiryTypes, setEnquiryTypes] = useState<EnquiryTypeOption[]>([]);
  const [serviceOpts, setServiceOpts] = useState<DefaultOptionType[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [addSuccessModalVisible, setAddSuccessModalVisible] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [ticketNumber, setTicketNumber] = useState("");

  // Bytes of each uploaded attachment keyed by its returned url, for the 5MB total cap.
  const sizeByUrlRef = useRef<Record<string, number>>({});

  const pullEnquiryTypes = useCallback(() => {
    getPublicEnquiryTypes().then((res) => {
      const list = (res as any).data ?? [];
      setEnquiryTypes(
        list.map((item: any) => ({
          value: item.id,
          label: resolveApiEntityLabel(isAr, item) || "",
        })),
      );
    });
  }, [isAr]);

  const pullServices = useCallback(() => {
    getPublicEnquiryServices().then((res) => {
      const list = (res as any).data ?? [];
      setServiceOpts(
        list.map((item: any) => ({
          value: item.id,
          label: resolveApiEntityLabel(isAr, item) || "",
        })),
      );
    });
  }, [isAr]);

  useEffect(() => {
    pullEnquiryTypes();
  }, [pullEnquiryTypes]);

  useEffect(() => {
    pullServices();
  }, [pullServices]);

  const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];
  const MAX_TOTAL_BYTES = 5 * 1024 * 1024; // 5MB total across all attachments
  const currentAttachmentBytes = () => {
    const att = form.getFieldValue("attachment");
    const urls = Array.isArray(att) ? att : att ? [att] : [];
    return urls.reduce(
      (sum: number, u: string) => sum + (sizeByUrlRef.current[u] || 0),
      0,
    );
  };
  const beforeUpload = (file: RcFile) => {
    const fileName = file.name;
    const fileExt = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      CustomMessage.error(t("complaintsPage.addModal.publicInvalidFileFormat"));
      return false;
    }
    if (currentAttachmentBytes() + file.size > MAX_TOTAL_BYTES) {
      CustomMessage.error(t("complaintsPage.addModal.attachmentTotalExceeds"));
      return false;
    }
    return true;
  };

  // Upload to the anonymous public endpoint (mirrors DocumentViewer's default uploadFile).
  const publicUploadRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append("files", file);
    try {
      const res = await publicFileUpload(formData);
      const responseData = (res as any).data as Array<
        string | { url?: string; fileName?: string; name?: string }
      >;
      if (Array.isArray(responseData) && responseData.length > 0) {
        const item = responseData[0];
        const url =
          typeof item === "string"
            ? item
            : (item?.url ?? item?.fileName ?? item?.name ?? item);
        if (typeof url === "string" && url) {
          sizeByUrlRef.current[url] = (file as RcFile)?.size || 0;
          onSuccess?.(url);
        }
      }
    } catch (error) {
      onError?.(error);
    }
  };

  async function submitEnquiry() {
    const formData = await form.validateFields();
    const att = formData.attachment;
    const attachmentUrls = (Array.isArray(att) ? att : att ? [att] : []).filter(
      Boolean,
    );
    const payload: any = {
      enquiryTypeId: formData.enquiryTypeId,
      fullName: formData.fullName?.trim(),
      email: formData.email?.trim(),
      description: getTrimmedText(formData.description),
      attachmentUrls,
      // Duplicate detection was dropped per product; always create directly.
      forceCreate: true,
    };
    if (hasApplicationNumber) {
      payload.applicationNumber = getTrimmedText(formData.applicationNumber);
    } else {
      payload.serviceId = formData.serviceId;
    }
    try {
      setSubmitLoading(true);
      const res = await postPublicEnquiry(payload);
      const data = (res as any).data;
      if (data?.enquiryNumber) {
        setTicketNumber(data.enquiryNumber);
        setRating(0);
        setAddSuccessModalVisible(true);
      }
    } catch (error) {
      console.error("Failed to submit public enquiry:", error);
      CustomMessage.error(t("complaintsPage.addModal.submitFailed"));
    } finally {
      setSubmitLoading(false);
    }
  }

  const handleSubmit = () => submitEnquiry();

  const submitSuccessModalRating = async () => {
    if (!rating || ratingSubmitting) {
      return false;
    }
    try {
      setRatingSubmitting(true);
      await postPublicUserServiceRating({
        rating,
        referenceNo: ticketNumber,
        isAnonymous: true,
        sourcePage: "Complaints",
      });
      CustomMessage.success(t("complaintsPage.addModal.commentSuccess"));
      return true;
    } catch {
      CustomMessage.error(t("complaintsPage.addModal.commentFailed"));
      return false;
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    if (ratingSubmitting) {
      return;
    }
    setAddSuccessModalVisible(false);
    history.push("/login");
  };

  const handleSubmitSuccessModalRating = async () => {
    const submitted = await submitSuccessModalRating();
    if (submitted) {
      handleCloseSuccessModal();
    }
  };

  const descriptionValue = form.getFieldValue("description");
  const applicationNumberInvalid =
    hasApplicationNumber &&
    (form.getFieldError("applicationNumber").length > 0 ||
      form.isFieldValidating("applicationNumber"));
  const submitDisabled =
    applicationNumberInvalid ||
    !form.getFieldValue("fullName") ||
    !form.getFieldValue("email") ||
    !form.getFieldValue("enquiryTypeId") ||
    !(form.getFieldValue("applicationNumber") || form.getFieldValue("serviceId")) ||
    !String(descriptionValue ?? "").trim();
    !(hasApplicationNumber
      ? getTrimmedText(form.getFieldValue("applicationNumber"))
      : form.getFieldValue("serviceId")) ||
    !getTrimmedText(form.getFieldValue("description"));

  // Required asterisk rendered AFTER the label, in red — matches Figma (antd v4 has no function requiredMark).
  const reqLabel = (text: string) => (
    <span className="pe-label">
      {text}
      <span className="pe-req">*</span>
    </span>
  );

  return (
    <PublicLayout>
      <div className="public-enquiry">
        <div className="pe-card">
          <div className="pe-title">
            <ArrowLeft className="pe-back" onClick={() => history.goBack()} />
            <div className="pe-title-text">{t("complaintsPage.addModal.publicTitle")}</div>
          </div>

          <Form
            className="pe-form"
            layout="vertical"
            form={form}
            requiredMark={false}
            onValuesChange={() => update({})}
            onFieldsChange={() => update({})}
          >
            <div className="pe-grid">
              <Form.Item
                label={reqLabel(t("complaintsPage.addModal.enquiryType"))}
                name="enquiryTypeId"
                rules={[{ required: true, message: t("common.required") }]}
              >
                <Select
                  className="pe-select"
                  placeholder={t("complaintsPage.addModal.enquiryTypePlaceholder")}
                >
                  {enquiryTypes.map((item) => (
                    <Select.Option key={item.value} value={item.value}>
                      {item.label || "-"}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                className="pe-radio-item"
                label={reqLabel(t("complaintsPage.addModal.hasApplicationNumber"))}
              >
                <Radio.Group
                  onChange={() => {
                    setHasApplicationNumber(!hasApplicationNumber);
                    form.setFieldsValue({ applicationNumber: null, serviceId: null });
                  }}
                  value={hasApplicationNumber}
                >
                  <Radio value={true}>{t("complaintsPage.addModal.yes")}</Radio>
                  <Radio value={false}>{t("complaintsPage.addModal.no")}</Radio>
                </Radio.Group>
              </Form.Item>

              {hasApplicationNumber ? (
                <Form.Item
                  label={reqLabel(t("complaintsPage.addModal.applicationNumber"))}
                  name="applicationNumber"
                  normalize={(value, previousValue) =>
                    limitByTrimmedLength(
                      value,
                      previousValue,
                      APPLICATION_NUMBER_MAX_LENGTH,
                    )
                  }
                  validateTrigger={["onBlur"]}
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: t("common.required"),
                    },
                    {
                      validator: async (_, value) => {
                        const v = getTrimmedText(value);
                        if (!v) return;
                        const res = await checkPublicApplication(v);
                        if (!(res as any)?.data) {
                          throw new Error(
                            t("complaintsPage.addModal.applicationNotFound"),
                          );
                        }
                      },
                    },
                  ]}
                >
                  <Input
                    className="pe-input"
                    placeholder={t("complaintsPage.addModal.applicationNumberInputPlaceholder")}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  label={reqLabel(t("complaintsPage.addModal.serviceName"))}
                  name="serviceId"
                  rules={[{ required: true, message: t("common.required") }]}
                >
                  <Select
                    className="pe-select"
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={serviceOpts}
                    placeholder={t("complaintsPage.addModal.serviceNamePlaceholder")}
                  />
                </Form.Item>
              )}

              <Form.Item
                label={reqLabel(t("complaintsPage.addModal.fullName"))}
                name="fullName"
                rules={[{ required: true, message: t("common.required") }]}
              >
                <Input
                  className="pe-input"
                  maxLength={256}
                  placeholder={t("complaintsPage.addModal.fullNamePlaceholder")}
                />
              </Form.Item>

              <Form.Item
                label={reqLabel(t("complaintsPage.addModal.email"))}
                name="email"
                rules={[
                  { required: true, message: t("common.required") },
                  { type: "email", message: t("complaintsPage.addModal.emailInvalid") },
                ]}
              >
                <Input
                  className="pe-input"
                  type="email"
                  maxLength={256}
                  placeholder={t("complaintsPage.addModal.emailPlaceholder")}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="pe-label pe-attach-label">
                    {t("complaintsPage.addModal.publicAttachment")}
                    <Tooltip title={t("complaintsPage.addModal.publicUploadTip")}>
                      <img src={AttachmentQuestion} className="pe-attach-info" alt="" />
                    </Tooltip>
                  </span>
                }
                name="attachment"
              >
                <DocumentViewer
                  hasDelete
                  uploadConfig={{
                    maxCount: 3,
                    maxSize: 5,
                    accept: ".jpg,.jpeg,.png,.pdf",
                    beforeUpload,
                    customRequest: publicUploadRequest,
                    uploadTip: "",
                  }}
                />
              </Form.Item>

              <div className="pe-notes-cell">
                <Form.Item
                  className="pe-notes-item"
                  label={reqLabel(t("complaintsPage.addModal.problemDescription"))}
                  name="description"
                  normalize={(value, previousValue) =>
                    limitByTrimmedLength(
                      value,
                      previousValue,
                      PROBLEM_DESCRIPTION_MAX_LENGTH,
                    )
                  }
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      type: "string",
                      message: t("common.required"),
                    },
                  ]}
                >
                  <Input.TextArea
                    className="pe-textarea"
                    placeholder={t("formPlaceholders.common.provideRequestDetails")}
                    style={{ resize: "none" }}
                    rows={3}
                  />
                </Form.Item>
                <div className="pe-notes-counter">
                  {`${getTrimmedText(form.getFieldValue("description")).length}/${PROBLEM_DESCRIPTION_MAX_LENGTH}`}
                </div>
              </div>
            </div>
          </Form>

          <div className="pe-footer">
            <button type="button" className="pe-btn pe-btn-outline" onClick={() => history.push("/login")}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="pe-btn pe-btn-primary"
              disabled={submitDisabled || submitLoading}
              onClick={handleSubmit}
            >
              {t("common.submit")}
            </button>
          </div>
        </div>
      </div>

      <Modal
        className="pe-success-modal"
        closeIcon={<span className="pe-success-close-icon" aria-hidden="true" />}
        title={false}
        footer={false}
        onCancel={handleCloseSuccessModal}
        visible={addSuccessModalVisible}
        maskClosable={false}
        centered
      >
        <div className="pe-success-body">
          <div className="pe-success-content">
            <div className="pe-success-icon">
              <img src={SuccessPng} alt="success" />
            </div>
            <div className="pe-success-tt">
              <div className="pe-success-title">{t("complaintsPage.addModal.successTitle")}</div>
              <div className="pe-success-sub">{t("complaintsPage.addModal.publicSuccessDesc")}</div>
            </div>
            <div className="pe-ticket-box">
              <div className="pe-ticket-inner">
                <span className="pe-ticket-label">{t("complaintsPage.addModal.ticketNumberLabel")}</span>
                <span className="pe-ticket-value">{ticketNumber}</span>
              </div>
              <span className="pe-ticket-copy" onClick={() => copyToClipboard(ticketNumber)}>
                <Copy />
              </span>
            </div>
          </div>

          <div className="pe-rating">
            <div className="pe-rating-title">{t("complaintsPage.addModal.shareFeedback")}</div>
            <div className="pe-rating-stars">
              <Rate
                value={rating}
                disabled={ratingSubmitting}
                onChange={setRating}
                className="pe-stars"
                count={5}
              />
              <div className="pe-rating-labels">
                <span>{t("complaintsPage.addModal.extremelyDissatisfied")}</span>
                <span>{t("complaintsPage.addModal.extremelySatisfied")}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="pe-btn pe-btn-primary pe-rating-submit"
            disabled={!rating || ratingSubmitting}
            onClick={handleSubmitSuccessModalRating}
          >
            {t("complaintsPage.addModal.submit")}
          </button>
        </div>
      </Modal>

    </PublicLayout>
  );
}
