import React, { useEffect, useState } from "react";
import { Form, Input, Modal, Select, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import CustomButton from "@/components/common/CustomButton";
import CustomMessage from "@/components/common/CustomMessage";
import FileUpload, { type FileItem } from "@/components/common/FileUpload";
import {
  createAppeal,
  getAppealableViolations,
  getAppealReasons,
  unwrapApiData,
  type AppealDetailDto,
  type AppealableViolationDto,
} from "@/services/appeal";
import type { AppealReasonOption } from "../utils/fixtures";
import type { SubmitAppealValues } from "../utils/types";
import {
  getRequestErrorMessage,
  isOtherAppealReason,
  mapAppealReasonDtos,
  MAX_MESSAGE_LENGTH,
  normalizeAppealViolationListData,
  uploadRequest,
} from "../utils/utils";

const renderSubmitAppealLabel = (
  label: string,
  required = false,
  extra?: React.ReactNode,
) => (
  <span className="violations-fines-submit-form__label">
    <span>{label}</span>
    {required ? (
      <span className="violations-fines-submit-form__required">*</span>
    ) : null}
    {extra}
  </span>
);

const SubmitAppealModal = ({
  visible,
  initialViolationId,
  appealReasons: appealReasonsProp,
  appealReasonsLoading: appealReasonsLoadingProp = false,
  onCancel,
  onSubmitted,
}: {
  visible: boolean;
  initialViolationId?: number;
  appealReasons?: AppealReasonOption[];
  appealReasonsLoading?: boolean;
  onCancel: () => void;
  onSubmitted: (appeal: AppealDetailDto) => void;
}) => {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm<SubmitAppealValues>();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [eligibleViolations, setEligibleViolations] = useState<AppealableViolationDto[]>([]);
  const [localAppealReasons, setLocalAppealReasons] = useState<AppealReasonOption[]>([]);
  const [localAppealReasonsLoading, setLocalAppealReasonsLoading] = useState(false);
  const [formValues, setFormValues] = useState<SubmitAppealValues>({});
  const [submitting, setSubmitting] = useState(false);
  const appealReasons = appealReasonsProp ?? localAppealReasons;
  const appealReasonsLoading = appealReasonsProp
    ? appealReasonsLoadingProp
    : localAppealReasonsLoading;
  const selectedReasonId = formValues.reasonId;
  const selectedViolationId = formValues.violationId;
  const notesRequired = isOtherAppealReason(selectedReasonId, appealReasons);
  const hasAttachment = files.length > 0;
  const canSubmit =
    Boolean(selectedViolationId) &&
    Boolean(selectedReasonId) &&
    hasAttachment &&
    appealReasons.length > 0 &&
    (!notesRequired || Boolean(formValues.remark?.trim()));

  useEffect(() => {
    if (!visible || appealReasonsProp) return;
    let cancelled = false;
    setLocalAppealReasonsLoading(true);
    getAppealReasons()
      .then((response) => {
        if (!cancelled) {
          setLocalAppealReasons(
            mapAppealReasonDtos(unwrapApiData(response), i18n.language.startsWith("ar")),
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLocalAppealReasons([]);
          CustomMessage.error(
            getRequestErrorMessage(
              error,
              t("violationsFinesPage.messages.loadAppealReasonsFailed"),
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLocalAppealReasonsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [appealReasonsProp, i18n.language, t, visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getAppealableViolations()
      .then((response) => {
        const data = normalizeAppealViolationListData(unwrapApiData(response));
        if (!cancelled) {
          setEligibleViolations(data.items);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setEligibleViolations([]);
          CustomMessage.error(
            getRequestErrorMessage(
              error,
              t("violationsFinesPage.messages.loadAppealableViolationsFailed"),
            ),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t, visible]);

  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setFiles([]);
      setFormValues({});
      setSubmitting(false);
      return;
    }
    if (initialViolationId) {
      form.setFieldsValue({ violationId: initialViolationId });
      setFormValues((value) => ({ ...value, violationId: initialViolationId }));
    }
  }, [form, initialViolationId, visible]);

  useEffect(() => {
    if (!notesRequired) {
      form.setFields([{ name: "remark", errors: [] }]);
    }
  }, [form, notesRequired]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (!canSubmit || !values.violationId || !values.reasonId || submitting) return;
    const payload = {
      violationId: values.violationId,
      reasonId: values.reasonId,
      remark: values.remark,
      attachmentUrl1: files[0]?.url,
      attachmentUrl2: files[1]?.url,
      attachmentUrl3: files[2]?.url,
    };
    setSubmitting(true);
    let appealDetail: AppealDetailDto;
    try {
      const response = await createAppeal(payload);
      appealDetail = unwrapApiData(response);
      if (response.isSuccess === false || !appealDetail?.appealNo?.trim()) {
        throw new Error(
          response.message ||
            t("violationsFinesPage.messages.submitAppealFailed"),
        );
      }
    } catch (error) {
      CustomMessage.error(
        getRequestErrorMessage(
          error,
          t("violationsFinesPage.messages.submitAppealFailed"),
        ),
      );
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onCancel();
    onSubmitted(appealDetail);
  };

  const handleCancel = () => {
    if (!submitting) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      title={t("violationsFinesPage.submitAppeal.title")}
      footer={null}
      closable={!submitting}
      keyboard={!submitting}
      maskClosable={!submitting}
      onCancel={handleCancel}
      destroyOnClose
      centered
      wrapClassName="violations-fines-submit-modal"
    >
      <Form<SubmitAppealValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        className="violations-fines-submit-form"
        onValuesChange={(_, allValues) => setFormValues(allValues)}
      >
        <div className="violations-fines-submit-form__body">
          <Form.Item
            name="violationId"
            label={renderSubmitAppealLabel(
              t("violationsFinesPage.submitAppeal.selectCase"),
              true,
            )}
            rules={[
              {
                required: true,
                message: t(
                  "violationsFinesPage.submitAppeal.selectCaseRequired",
                ),
              },
            ]}
          >
            <Select
              className="violations-fines-submit-form__select"
              showSearch
              listHeight={224}
              placeholder={t(
                "formPlaceholders.pages.violationsFines.submitAppeal.selectCasePlaceholder",
              )}
              optionFilterProp="label"
              dropdownClassName="violations-fines-select-case-dropdown"
              options={eligibleViolations.map((item) => ({
                label: item.violationNo,
                value: item.violationId,
              }))}
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            name="reasonId"
            label={renderSubmitAppealLabel(
              t("violationsFinesPage.submitAppeal.appealReason"),
              true,
            )}
            rules={[
              {
                required: true,
                message: t(
                  "violationsFinesPage.submitAppeal.appealReasonRequired",
                ),
              },
            ]}
          >
            <Select
              className="violations-fines-submit-form__select"
              placeholder={t(
                "formPlaceholders.pages.violationsFines.submitAppeal.appealReasonPlaceholder",
              )}
              loading={appealReasonsLoading}
              disabled={appealReasonsLoading || appealReasons.length === 0}
              options={appealReasons.map((item) => ({
                label: item.label,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            label={
              renderSubmitAppealLabel(
                t("violationsFinesPage.submitAppeal.attachment"),
                true,
                <Tooltip
                  overlayClassName="violations-fines-submit-form__tooltip"
                  title={t("violationsFinesPage.submitAppeal.attachmentTooltip")}
                >
                  <span className="violations-fines-submit-form__help">?</span>
                </Tooltip>,
              )
            }
          >
            <FileUpload
              value={files}
              onChange={setFiles}
              maxCount={3}
              maxSize={5}
              placeholder={t("formPlaceholders.common.uploadFile")}
              customRequest={uploadRequest}
              uploadTip={t("violationsFinesPage.submitAppeal.uploadTip")}
              isSingle={false}
            />
          </Form.Item>
          <Form.Item
            className="violations-fines-submit-form__item violations-fines-submit-form__item--notes"
            name="remark"
            label={renderSubmitAppealLabel(
              t("violationsFinesPage.submitAppeal.notes"),
              notesRequired,
            )}
            rules={[
              {
                required: notesRequired,
                message: t("violationsFinesPage.submitAppeal.notesRequired"),
              },
              {
                max: MAX_MESSAGE_LENGTH,
                message: t("violationsFinesPage.submitAppeal.maxCharacters"),
              },
            ]}
          >
            <Input.TextArea
              className="violations-fines-submit-form__notes"
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={t("formPlaceholders.common.provideRequestDetails")}
              rows={4}
              showCount
            />
          </Form.Item>
        </div>
        <div className="violations-fines-submit-form__footer">
          <CustomButton
            text={t("violationsFinesPage.common.cancel")}
            variant="outline"
            disabled={submitting}
            onClick={handleCancel}
            customClassName="violations-fines-submit-form__button violations-fines-submit-form__button--cancel"
          />
          <CustomButton
            text={t("violationsFinesPage.common.submit")}
            variant="primary"
            disabled={!canSubmit || submitting}
            loading={submitting}
            onClick={handleSubmit}
            customClassName="violations-fines-submit-form__button violations-fines-submit-form__button--submit"
          />
        </div>
      </Form>
    </Modal>
  );
};

export default SubmitAppealModal;
