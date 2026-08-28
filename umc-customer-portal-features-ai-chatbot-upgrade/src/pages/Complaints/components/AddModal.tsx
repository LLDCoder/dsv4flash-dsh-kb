import { Modal, Form, Select, Radio, Input, Rate } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getApplications,
  getServices,
  postEnquiry,
  postUserServiceRating,
} from "@/services/complaints";
import { useTranslation } from "react-i18next";
import { CustomButton, CustomMessage } from "@/components/common";
import DocumentViewer from "@/components/common/DocumentViewer";
import SuccessPng from "@/assets/images/success.png";
import Copy from "@/assets/icons/Copy";
import { copyToClipboard } from "@/utils/copy";
import type { DefaultOptionType } from "antd/lib/select";
import type { RcFile } from "antd/lib/upload/interface";

import "./AddModal.less";
import { useHistory } from "react-router-dom";
import { resolveApiEntityLabel } from "@/utils/bilingualDisplay";

type OptionItem = { label: string; value: number | null };

interface IAddModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit?: () => void;
  enquiryTypes: OptionItem[];
}

export default function AddModal({
  visible,
  onCancel,
  onSubmit,
  enquiryTypes,
}: IAddModalProps) {
  const { i18n, t } = useTranslation();
  const [form] = Form.useForm();
  const [, update] = useState({});
  const [hasApplicationNumber, setHasApplicationNumber] = useState(true);
  const [applicationNumberSearch, setApplicationNumberSearch] = useState("");
  const [applicationsOpts, setApplicationsOpts] = useState<DefaultOptionType[]>(
    [],
  );
  const [serviceOpts, setServicesOpts] = useState<DefaultOptionType[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [addSuccessModalVisible, setAddSuccessModalVisible] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [ticketNumber, setTicketNumber] = useState("");
  const [enquiryId, setEnquiryId] = useState("");
  const ratingSubmittingRef = useRef(false);
  const ratingSubmittedRef = useRef(false);
  const ratingSubmissionPromiseRef = useRef<Promise<boolean> | null>(null);
  const viewDetailsNavigatingRef = useRef(false);
  const history = useHistory();
  const pullApplications = useCallback(async () => {
    try {
      const res = await getApplications();
      setApplicationsOpts(
        res.data.map((item) => ({
          value: `${item.applicationDetailId}-${item.serviceId}`,
          label: item.applicationNumber,
        })),
      );
    } catch (error) {
      console.error("Failed to fetch enquiry applications:", error);
      setApplicationsOpts([]);
      CustomMessage.error(t("request.operation.failed"));
    }
  }, [t]);

  const pullServices = useCallback(async () => {
    try {
      const res = await getServices();
      setServicesOpts(
        res.data.map((item) => ({
          value: item.id,
          label: resolveApiEntityLabel(i18n.language.startsWith("ar"), item) || "",
        })),
      );
    } catch (error) {
      console.error("Failed to fetch enquiry services:", error);
      setServicesOpts([]);
      CustomMessage.error(t("request.operation.failed"));
    }
  }, [i18n.language, t]);

  useEffect(() => {
    if (!visible) return;

    form.resetFields();
    setHasApplicationNumber(true);
    setApplicationNumberSearch("");
    void pullApplications();
    void pullServices();
  }, [form, pullApplications, pullServices, visible]);

  async function handleSubmit() {
    const formData = await form.validateFields();
    formData.attachmentUrls = Array.isArray(formData.attachment)
      ? formData.attachment
      : [formData.attachment];
    delete formData.attachment;
    if (hasApplicationNumber) {
      const [applicationDetailId, serviceId] =
        formData.applicationDetailId?.split("-") ?? [];
      formData.applicationDetailId = applicationDetailId;
      formData.serviceId = serviceId;
    }
    try {
      setSubmitLoading(true);
      const res = await postEnquiry(formData);
      if (res.data) {
        setTicketNumber(res.data.enquiryNumber);
        setEnquiryId(res.data.enquiryId);
        setRating(0);
        setRatingSubmitted(false);
        setRatingSubmitting(false);
        ratingSubmittingRef.current = false;
        ratingSubmittedRef.current = false;
        ratingSubmissionPromiseRef.current = null;
        viewDetailsNavigatingRef.current = false;
        onCancel();
        onSubmit?.();
        setAddSuccessModalVisible(true);
      }
    } catch (error: unknown) {
      setSubmitLoading(false);
      console.error("Failed to submit enquiry:", error);
      CustomMessage.error(t("request.operation.failed"));
    } finally {
      setSubmitLoading(false);
    }
  }

  const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];
  const beforeUpload = (file: RcFile) => {
    const fileName = file.name;
    const fileExt = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    const isExtValid = allowedExtensions.includes(fileExt);

    if (!isExtValid) {
      CustomMessage.error(t("complaintsPage.addModal.invalidFileFormat"));
    }
    return isExtValid;
  };

  const handleSubmitSuccessModalRating = (): Promise<boolean> => {
    const normalizedTicketNumber = String(ticketNumber || "").trim();
    if (!rating || !normalizedTicketNumber) {
      CustomMessage.error(t("complaintsPage.addModal.commentFailed"));
      return Promise.resolve(false);
    }

    if (ratingSubmittedRef.current) {
      return Promise.resolve(true);
    }

    if (ratingSubmissionPromiseRef.current) {
      return ratingSubmissionPromiseRef.current;
    }

    ratingSubmittingRef.current = true;
    setRatingSubmitting(true);

    const submissionPromise = postUserServiceRating({
      rating,
      referenceNo: normalizedTicketNumber,
      isAnonymous: true,
      sourcePage: "Complaints",
    })
      .then(() => {
        CustomMessage.success(t("complaintsPage.addModal.commentSuccess"));
        ratingSubmittedRef.current = true;
        setRatingSubmitted(true);
        return true;
      })
      .catch(() => {
        CustomMessage.error(t("complaintsPage.addModal.commentFailed"));
        return false;
      })
      .finally(() => {
        ratingSubmittingRef.current = false;
        ratingSubmissionPromiseRef.current = null;
        setRatingSubmitting(false);
      });

    ratingSubmissionPromiseRef.current = submissionPromise;
    return submissionPromise;
  };

  const handleCloseSuccessModal = () => {
    setAddSuccessModalVisible(false);
  };

  const viewSuccessModal = async () => {
    if (!enquiryId) {
      CustomMessage.error(t("request.operation.failed"));
      return;
    }

    if (viewDetailsNavigatingRef.current) {
      return;
    }

    viewDetailsNavigatingRef.current = true;

    try {
      if (rating && !ratingSubmittedRef.current) {
        await handleSubmitSuccessModalRating();
      }
    } finally {
      setAddSuccessModalVisible(false);
      history.push(`/complaints/complaints-details?id=${enquiryId}`);
    }
  };

  return (
    <>
      <Modal centered
        title={t("complaintsPage.addModal.title")}
        className="complaints-add-modal"
        visible={visible}
        onCancel={onCancel}
        maskClosable={false}
        footer={false}
      >
        <div className="complaints-add-modal-content">
          <Form
            className="custorm-form"
            layout="vertical"
            form={form}
            onValuesChange={() => update({})}
          >
            <Form.Item
              label={t("complaintsPage.addModal.enquiryType")}
              name="enquiryTypeId"
              rules={[{ required: true, message: t("common.required") }]}
            >
              <Select
                placeholder={t(
                  "formPlaceholders.pages.complaints.addModal.enquiryTypePlaceholder",
                )}
              >
                {enquiryTypes.map((item) => (
                  <Select.Option
                    key={item.value ?? item.label}
                    value={item.value}
                  >
                    {item.label || "-"}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label={t("complaintsPage.addModal.hasApplicationNumber")}
            >
              <Radio.Group
                onChange={(event) => {
                  setHasApplicationNumber(event.target.value);
                  setApplicationNumberSearch("");
                  form.setFieldsValue({
                    applicationDetailId: null,
                    serviceId: null,
                  });
                }}
                value={hasApplicationNumber}
              >
                <Radio value={true}>{t("complaintsPage.addModal.yes")}</Radio>
                <Radio value={false}>{t("complaintsPage.addModal.no")}</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              label={
                hasApplicationNumber
                  ? t("complaintsPage.addModal.applicationNumber")
                  : t("complaintsPage.addModal.serviceName")
              }
              name={hasApplicationNumber ? "applicationDetailId" : "serviceId"}
              rules={[{ required: true, message: t("common.required") }]}
            >
              <Select
                showSearch
                searchValue={
                  hasApplicationNumber ? applicationNumberSearch : undefined
                }
                onSearch={(value) => {
                  if (hasApplicationNumber) {
                    setApplicationNumberSearch(value.slice(0, 200));
                  }
                }}
                filterOption={(input, option) => {
                  return String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase());
                }}
                options={hasApplicationNumber ? applicationsOpts : serviceOpts}
                placeholder={
                  hasApplicationNumber
                    ? t(
                        "formPlaceholders.pages.complaints.addModal.applicationPlaceholder",
                      )
                    : t(
                        "formPlaceholders.pages.complaints.addModal.servicePlaceholder",
                      )
                }
                onSelect={() => setApplicationNumberSearch("")}
              />
            </Form.Item>
            <Form.Item
              label={t("complaintsPage.addModal.attachment")}
              name="attachment"
            >
              <DocumentViewer
                hasDelete
                uploadConfig={{
                  maxCount: 3,
                  maxSize: 5,
                  accept: ".jpg,.jpeg,.png,.pdf",
                  beforeUpload,
                  uploadTip: t("complaintsPage.addModal.uploadTip"),
                  maxSizeErrorMessage: t(
                    "complaintsPage.addModal.fileSizeExceeded",
                  ),
                }}
              />
            </Form.Item>
            <div
              className={`complaints-add-moda-desc${
                i18n.language.startsWith("ar") ? " complaints-add-moda-desc-rtl" : ""
              }`}
            >
              <Form.Item
                label={t("complaintsPage.addModal.notes")}
                name="description"
                className="complaints-add-moda-desc-item"
                rules={[{ required: true, message: t("common.required") }]}
              >
                <Input.TextArea
                  maxLength={1000}
                  placeholder={t(
                    "formPlaceholders.common.provideRequestDetails",
                  )}
                  style={{ resize: "none" }}
                  rows={4}
                />
              </Form.Item>
              <div className="complaints-additional-notes-tip-wrapper">
                {/* <div className="complaints-additional-notes-tip">{t('complaintsPage.addModal.maxCharacters')}</div> */}
                <div className="complaints-additional-notes-tip">
                  {form.getFieldValue("description")?.length || 0}/1000
                </div>
              </div>
            </div>
          </Form>
        </div>
        <div className="complaints-add-modal-footer">
          <CustomButton
            customClassName="footer-btn-cancel"
            variant="outline"
            text={t("common.cancel")}
            onClick={onCancel}
          />
          <CustomButton
            loading={submitLoading}
            disabled={
              !form.getFieldValue("enquiryTypeId") ||
              !(
                form.getFieldValue("applicationDetailId") ||
                form.getFieldValue("serviceId")
              ) ||
              !form.getFieldValue("description")
            }
            customClassName="footer-btn-submit"
            text={t("common.submit")}
            onClick={handleSubmit}
          />
        </div>
      </Modal>
      <Modal centered
        className="complaints-add-success-mdoal"
        title={false}
        footer={false}
        onCancel={handleCloseSuccessModal}
        visible={addSuccessModalVisible}
        maskClosable={false}
      >
        <div className="complaints-add-success-content">
          <img src={SuccessPng} />
          <div className="title">
            {t("complaintsPage.addModal.successTitle")}
          </div>
          <div className="desc">{t("complaintsPage.addModal.successDesc")}</div>
          <div className="ticket-number-wrapper">
            <span className="title">
              {t("complaintsPage.addModal.ticketNumberLabel")}
            </span>
            <span className="value">{ticketNumber}</span>
            <span
              className="copy"
              onClick={() => {
                copyToClipboard(ticketNumber);
              }}
            >
              <Copy />
            </span>
          </div>

          <div className="complaints-add-success-mdoal-footer">
            <CustomButton
              customClassName="footer-btn-close"
              text={t("common.close")}
              variant="outline"
              onClick={handleCloseSuccessModal}
            />
            <CustomButton
              customClassName="footer-btn-view"
              text={t("complaintsPage.addModal.viewDetails")}
              onClick={viewSuccessModal}
            />
          </div>
          <div className="rating-section">
          <div className="share">
            {t("complaintsPage.addModal.shareFeedback")}
          </div>
          <div className="rating-wrapper">
            <div className="stars">
              <Rate
                value={rating}
                disabled={ratingSubmitting}
                onChange={setRating}
                className="custom-rate"
                character={(props) => {
                  const selected =
                    props.index !== undefined &&
                    props.value !== undefined &&
                    props.index < props.value;
                  return selected ? (
                    <svg
                      width="34"
                      height="33"
                      viewBox="0 0 34 33"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M33.6479 12.2632C33.5325 11.899 33.3104 11.5778 33.0103 11.3413C32.7103 11.1048 32.3462 10.9638 31.9651 10.9366L22.3604 10.1554L18.6604 1.19755C18.5147 0.843269 18.267 0.540281 17.9487 0.32706C17.6304 0.113838 17.256 0 16.8729 0C16.4898 0 16.1154 0.113838 15.7971 0.32706C15.4789 0.540281 15.2311 0.843269 15.0854 1.19755L11.3854 10.1554L1.78072 10.9366C1.39903 10.969 1.0354 11.1134 0.735443 11.3516C0.435481 11.5899 0.212534 11.9114 0.0945577 12.2758C-0.0234185 12.6403 -0.0311718 13.0314 0.0722698 13.4003C0.175711 13.7691 0.385743 14.0992 0.676028 14.3491L7.99634 20.6632L5.75884 30.0991C5.66513 30.4721 5.68504 30.8647 5.816 31.2263C5.94696 31.588 6.18301 31.9022 6.49384 32.1287C6.80467 32.3553 7.17611 32.4837 7.56048 32.4977C7.94485 32.5116 8.32461 32.4104 8.65103 32.2069L16.8729 27.1507L25.0948 32.2069C25.4178 32.411 25.7949 32.5125 26.1767 32.4983C26.5584 32.4841 26.9269 32.3547 27.2338 32.1272C27.5494 31.9039 27.7901 31.5905 27.9245 31.2281C28.0589 30.8656 28.0807 30.471 27.987 30.096L25.7495 20.6554L33.0698 14.3413C33.3632 14.0926 33.5751 13.7616 33.6782 13.3911C33.7813 13.0206 33.7707 12.6276 33.6479 12.2632Z"
                        fill="#986F2F"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="34"
                      height="33"
                      viewBox="0 0 34 33"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M33.6479 12.2632C33.5325 11.899 33.3104 11.5778 33.0103 11.3413C32.7103 11.1048 32.3462 10.9638 31.9651 10.9366L22.3604 10.1554L18.6604 1.19755C18.5147 0.843269 18.267 0.540281 17.9487 0.32706C17.6304 0.113838 17.256 0 16.8729 0C16.4898 0 16.1154 0.113838 15.7971 0.32706C15.4789 0.540281 15.2311 0.843269 15.0854 1.19755L11.3854 10.1554L1.78072 10.9366C1.39903 10.969 1.0354 11.1134 0.735443 11.3516C0.435481 11.5899 0.212534 11.9114 0.0945577 12.2758C-0.0234185 12.6403 -0.0311718 13.0314 0.0722698 13.4003C0.175711 13.7691 0.385743 14.0992 0.676028 14.3491L7.99634 20.6632L5.75884 30.0991C5.66513 30.4721 5.68504 30.8647 5.816 31.2263C5.94696 31.588 6.18301 31.9022 6.49384 32.1287C6.80467 32.3553 7.17611 32.4837 7.56048 32.4977C7.94485 32.5116 8.32461 32.4104 8.65103 32.2069L16.8729 27.1507L25.0948 32.2069C25.4178 32.411 25.7949 32.5125 26.1767 32.4983C26.5584 32.4841 26.9269 32.3547 27.2338 32.1272C27.5494 31.9039 27.7901 31.5905 27.9245 31.2281C28.0589 30.8656 28.0807 30.471 27.987 30.096L25.7495 20.6554L33.0698 14.3413C33.3632 14.0926 33.5751 13.7616 33.6782 13.3911C33.7813 13.0206 33.7707 12.6276 33.6479 12.2632ZM32.2526 13.3976L24.6463 19.9601C24.5597 20.0348 24.4953 20.1318 24.46 20.2407C24.4247 20.3495 24.42 20.4659 24.4463 20.5772L26.7698 30.3882C26.8039 30.5223 26.7964 30.6635 26.7484 30.7933C26.7004 30.923 26.6142 31.0351 26.501 31.1147C26.3934 31.1951 26.2638 31.2408 26.1296 31.2458C25.9954 31.2508 25.8628 31.2149 25.7495 31.1429L17.201 25.8851C17.1024 25.8242 16.9888 25.792 16.8729 25.792C16.757 25.792 16.6434 25.8242 16.5448 25.8851L7.99634 31.1429C7.88298 31.2149 7.7504 31.2508 7.61618 31.2458C7.48196 31.2408 7.35243 31.1951 7.24478 31.1147C7.13165 31.0351 7.04539 30.923 6.99739 30.7933C6.9494 30.6635 6.94195 30.5223 6.97603 30.3882L9.29947 20.5772C9.32581 20.4659 9.32109 20.3495 9.28582 20.2407C9.25055 20.1318 9.1861 20.0348 9.09947 19.9601L1.49322 13.3976C1.38814 13.309 1.31224 13.1907 1.27544 13.0583C1.23864 12.9259 1.24266 12.7855 1.28697 12.6554C1.32771 12.5265 1.40628 12.4129 1.51244 12.3293C1.61861 12.2457 1.74747 12.196 1.88228 12.1866L11.8729 11.3726C11.9878 11.3634 12.098 11.3227 12.1912 11.2548C12.2844 11.187 12.357 11.0947 12.401 10.9882L16.2479 1.67568C16.2983 1.54944 16.3854 1.44121 16.4979 1.36497C16.6104 1.28873 16.7432 1.24798 16.8792 1.24798C17.0151 1.24798 17.1479 1.28873 17.2604 1.36497C17.3729 1.44121 17.46 1.54944 17.5104 1.67568L21.3573 10.9882C21.4003 11.093 21.471 11.1841 21.5619 11.2518C21.6527 11.3195 21.7602 11.3612 21.8729 11.3726L31.8573 12.1772C31.9921 12.1866 32.1209 12.2364 32.2271 12.3199C32.3333 12.4035 32.4118 12.5171 32.4526 12.646C32.4997 12.7767 32.5058 12.9187 32.4701 13.053C32.4343 13.1873 32.3584 13.3075 32.2526 13.3976Z"
                        fill="#986F2F"
                      />
                    </svg>
                  );
                }}
                count={5}
              />
            </div>
            <div className="extremely">
              <div className="dissatisfied">
                {t("complaintsPage.addModal.extremelyDissatisfied")}
              </div>
              <div className="satisfied">
                {t("complaintsPage.addModal.extremelySatisfied")}
              </div>
            </div>
          </div>
          {!ratingSubmitted && (
            <CustomButton
              customClassName="rating-submit"
              disabled={!rating || ratingSubmitting}
              loading={ratingSubmitting}
              text={t("complaintsPage.addModal.submit")}
              onClick={handleSubmitSuccessModalRating}
            />
          )}
          </div>
        </div>
      </Modal>
    </>
  );
}
