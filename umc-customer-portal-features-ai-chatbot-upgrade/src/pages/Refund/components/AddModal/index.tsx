import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Modal, Input, Select, Row, Col, Form, Radio } from "antd";
import type { UploadProps } from "antd";
import { useTranslation } from "react-i18next";
import { CustomButton, FileUpload } from "@/components/common";
import type { FileItem } from "@/components/common";
import WarnningIcon from "@/assets/icons/warning_fill.svg";
import {
  refundApplicationModel,
  queryReasons,
  queryApplicationFee,
  queryNumbers,
  type ValueObj,
} from "@/services/refund";
import { fileUpload } from "@/services/media";
import type { ITransaction } from "@/pages/Payments";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import AED from "@/assets/icons/Aed";
import formatMoney from "@/utils/formatMoney";
import "./index.less";

interface AddModalProps {
  show: boolean;
  close: () => void;
  record?: ITransaction | null;
  refresh: () => void;
  success: (id: number, applicationNumber: string) => void;
}

interface RefundFormValues {
  categoryId?: number | null;
  fineNumber?: string;
  amount?: string;
  reasonId?: number;
  attachments?: FileItem[];
  additionalComments?: string;
}

interface ErrorWithResponse {
  response?: {
    data?: {
      statusCode?: number;
      message?: string;
    };
  };
}

const getUniqueNumberOptions = (numbers: string[] = []) => {
  const seenNumbers = new Set<string>();

  return numbers.reduce<{ label: string; value: string }[]>((options, item) => {
    if (!item || seenNumbers.has(item)) {
      return options;
    }

    seenNumbers.add(item);
    options.push({ label: item, value: item });
    return options;
  }, []);
};

const AddModal: React.FC<AddModalProps> = ({
  record,
  show,
  close,
  refresh,
  success,
}) => {
  const { i18n, t } = useTranslation();
  const [form] = Form.useForm();
  const { TextArea } = Input;
  const [reasons, setReasons] = useState<ValueObj[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [numberList, setNumberList] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [notes, setNotes] = useState("");
  const [formStateVersion, setFormStateVersion] = useState(0);
  const numbersRequestIdRef = useRef(0);
  const feeRequestIdRef = useRef(0);
  const categoryId = Form.useWatch("categoryId", form);
  const fineNumber = Form.useWatch("fineNumber", form);
  const reasonId = Form.useWatch("reasonId", form);
  const additionalComments = Form.useWatch("additionalComments", form);
  const amount = Form.useWatch("amount", form);
  const hasAmount = amount != null && String(amount).trim() !== "";
  const isOtherReason = String(reasonId ?? "").trim() === "10";
  const isSubmitDisabled = useMemo(() => {
    const requiredFields = ["categoryId", "fineNumber", "amount", "reasonId"];
    const requiredValues = [categoryId, fineNumber, amount, reasonId];
    if (isOtherReason) {
      requiredFields.push("additionalComments");
      requiredValues.push(additionalComments);
    }
    return (
      submitLoading ||
      feeLoading ||
      requiredValues.some(
        (value) => value == null || String(value).trim() === "",
      ) ||
      form
        .getFieldsError(requiredFields)
        .some(({ errors }) => errors.length > 0) ||
      requiredFields.some((field) => form.isFieldValidating(field))
    );
  }, [
    additionalComments,
    amount,
    categoryId,
    fineNumber,
    feeLoading,
    form,
    formStateVersion,
    isOtherReason,
    reasonId,
    submitLoading,
  ]);

  const reasonOptions = useMemo(
    () =>
      reasons.map((r) => ({
        label: preferLocalizedEnAr(
          i18n.language.startsWith("ar"),
          r.nameEn,
          r.nameAr,
        ),
        value: r.id,
      })),
    [reasons, i18n.language],
  );

  const getReasons = useCallback(() => {
    queryReasons().then((res) => {
      setReasons(res.data);
    });
  }, []);

  const getNumbers = useCallback(() => {
    const requestId = ++numbersRequestIdRef.current;
    setNumberList([]);
    queryNumbers(categoryId ?? 1).then((res) => {
      if (requestId !== numbersRequestIdRef.current) {
        return;
      }
      const list = getUniqueNumberOptions(res.data);
      setNumberList(list);
    });
  }, [categoryId]);

  useEffect(() => {
    if (record) {
      const data = {
        categoryId:
          record.transactionTypeId === 2
            ? 2
            : record.transactionTypeId === 3
            ? 1
            : null,
        // `amount` is the gross total the payer was charged; the Magnati channel fee and its VAT inside it
        // are not refundable, so a refund raised for it is rejected by the API. Prefill the refundable
        // (bare settled) amount instead, falling back to `amount` for rows without a channel fee.
        amount: record.refundableAmount ?? record.amount,
        fineNumber: record.referenceNumber,
      };
      form.setFieldsValue(data);
    }
  }, [record, form]);
  useEffect(() => {
    form.setFieldsValue({ categoryId: 1 });
  }, [form]);
  useEffect(() => {
    if (show) {
      getReasons();
    }
  }, [show, getReasons]);
  useEffect(() => {
    if (show) {
      getNumbers();
    }
  }, [show, getNumbers]);
  useEffect(() => {
    if (!isOtherReason) {
      form.setFields([{ name: "additionalComments", errors: [] }]);
    }
  }, [form, isOtherReason]);
  const uploadFile: UploadProps["customRequest"] = async (options) => {
    if (!options) {
      return;
    }

    const { file, onSuccess } = options;
    const formData = new FormData();
    formData.append("files", file);
    try {
      const res = await fileUpload(formData);
      onSuccess?.(res.data[0]);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };
  const fileObjectHandle = (arr: FileItem[]) => {
    const obj: { [key: string]: string } = {};
    arr.forEach((item, i) => {
      obj[`attachmentsURL0${i + 1}`] = item.url;
    });
    return obj;
  };
  const handleCancel = () => {
    close();
  };
  const queryFee = useCallback(
    async (value: string) => {
      const requestId = ++feeRequestIdRef.current;
      if (!value) {
        setFeeLoading(false);
        return;
      }

      setFeeLoading(true);
      try {
        const res = await queryApplicationFee(value);
        if (requestId !== feeRequestIdRef.current) {
          return;
        }
        if (res.data != null) {
          form.setFieldValue("amount", Number(res.data).toFixed(2));
        }
      } catch (err) {
        if (requestId !== feeRequestIdRef.current) {
          return;
        }
        form.setFieldValue("amount", null);
        const normalizedError = err as ErrorWithResponse;
        const { statusCode, message } = normalizedError.response?.data ?? {};
        if (statusCode === 4001) {
          throw new Error(
            i18n.t("payments.refundRequestModal.invalidReference"),
          );
        }
        if (statusCode === 4002) {
          throw new Error(
            i18n.t("payments.refundRequestModal.duplicateRefund"),
          );
        }
        if (statusCode === 4003) {
          throw new Error(
            message || i18n.t("payments.refundRequestModal.invalidReference"),
          );
        }
        throw err;
      } finally {
        if (requestId === feeRequestIdRef.current) {
          setFeeLoading(false);
        }
      }
    },
    [i18n, form],
  );

  const refreshForm = () => {
    feeRequestIdRef.current += 1;
    setFeeLoading(false);
    form.resetFields();
    form.setFieldsValue({ categoryId: 1 });
    setNotes("");
  };
  const submit = async () => {
    if (!form.getFieldValue("fineNumber")) {
      return form.setFields([
        {
          name: "fineNumber",
          errors: [t("formPlaceholders.pages.refund.requestModal.referenceRequired")],
        },
      ]);
    }
    try {
      const isValidate = await form.validateFields([
        "amount",
        "reasonId",
        "attachments",
        "additionalComments",
      ]);
      console.log("isValidate", isValidate);
      const formValues = form.getFieldsValue() as RefundFormValues;
      const uploadedFileMap = fileObjectHandle(formValues.attachments || []);
      const formData = {
        categoryId: Number(formValues.categoryId || 1),
        referenceNumber: formValues.fineNumber || "",
        applicationNumber: formValues.fineNumber || "",
        amount: Number(formValues.amount || 0),
        reasonId: Number(formValues.reasonId || 0),
        additionalComments: formValues.additionalComments || "",
        attachmentsURL01: uploadedFileMap.attachmentsURL01,
        attachmentsURL02: uploadedFileMap.attachmentsURL02,
        attachmentsURL03: uploadedFileMap.attachmentsURL03,
      };
      setSubmitLoading(true);
      const res = await refundApplicationModel(formData);
      close();
      success(res.data.id, res.data.applicationNumber);
      refresh();
    } catch (error) {
      console.log("Failed:", error);
    } finally {
      setSubmitLoading(false);
    }
  };
  return (
    <Modal centered
    wrapClassName="service-modal"
      title={t("payments.refundRequestModal.title")}
      destroyOnClose
      forceRender
      visible={show}
      afterClose={refreshForm}
      onCancel={handleCancel}
      footer={
        <div className="refund-add-modal__footer">
          {hasAmount && (
            <div className="refund-add-modal__amount">
              <span className="refund-add-modal__amount-label">
                {t("payments.refundRequestModal.refundAmount")}
              </span>
              <span className="refund-add-modal__amount-value">
                <span
                  className="refund-add-modal__amount-icon"
                  aria-hidden="true"
                >
                  <AED />
                </span>
                {formatMoney(Number(amount))}
              </span>
            </div>
          )}
          <div className="refund-add-modal__footer-actions">
            <CustomButton
              text={t("payments.refundRequestModal.close")}
              variant="outline"
              onClick={handleCancel}
            />
            <CustomButton
              text={t("payments.refundRequestModal.submit")}
              variant="primary"
              disabled={isSubmitDisabled}
              loading={submitLoading}
              onClick={submit}
            />
          </div>
        </div>
      }
    >
      <div className="warn-box">
        <img src={WarnningIcon} alt="" />
        <div className="warn-content">
          <div className="warn-text">
            {t("payments.refundRequestModal.warning")}
          </div>
        </div>
      </div>
      {/* Form */}
      <div className="form-box">
        <Form
          className="custorm-form"
          layout="vertical"
          form={form}
          onFieldsChange={() =>
            setFormStateVersion((version) => version + 1)
          }
        >
          <div className="bottom-border-box">
            <Row gutter={{ xs: 8, sm: 16 }}>
            <Col xs={24} md={12}>
            <Form.Item
            label={t("payments.refundRequestModal.refundCategory")}
                  name="categoryId"
                  rules={[
                    {
                      required: true,
                      message: t("payments.refundRequestModal.categoryRequired"),
                    },
                  ]}
                >
                  <Radio.Group
                    disabled={!!record}
                    onChange={() => {
                      feeRequestIdRef.current += 1;
                      setFeeLoading(false);
                      setNumberList([]);
                      form.setFieldsValue({ fineNumber: null, amount: null });
                    }}
                  >
                    <Radio className="custom-radio" value={1}>
                      {t("payments.refundRequestModal.fineRefund")}
                    </Radio>
                    <Radio className="custom-radio" value={2}>
                      {t("payments.refundRequestModal.applicationRefund")}
                    </Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={{ xs: 8, sm: 16 }}>
            <Col xs={24} md={12}>
            <Form.Item
            label={
            categoryId === 1
                      ? t("payments.refundRequestModal.fineNumber")
                      : t("payments.refundRequestModal.applicationNumber")
                  }
                  name="fineNumber"
                  rules={[
                    { required: true },
                    { validator: (_, value) => queryFee(value) },
                  ]}
                >
                  <Select
                    showSearch
                    disabled={!!record}
                    value={form.getFieldValue("fineNumber")}
                    onChange={() => form.setFieldValue("amount", null)}
                    placeholder={
                      categoryId === 1
                        ? t("formPlaceholders.pages.refund.requestModal.enterFineNumber")
                        : t("formPlaceholders.pages.refund.requestModal.enterApplicationNumber")
                    }
                    options={numberList}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
              <Form.Item
              label={
              <span className="refund-add-modal__amount-field-label">
                      <span>
                        {t("payments.refundRequestModal.refundAmount")}
                      </span>
                      <span
                        className="refund-add-modal__amount-field-currency"
                        aria-hidden="true"
                      >
                        (<AED />)
                      </span>
                    </span>
                  }
                  name="amount"
                  rules={[
                    {
                      required: true,
                      message: t("payments.refundRequestModal.amountRequired"),
                    },
                  ]}
                >
                  <Input
                    disabled
                    size="large"
                    placeholder={t("formPlaceholders.pages.refund.requestModal.amountAuto")}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
          <div className="form-columns">
            <div className="form-column">
              <Form.Item
                label={t("payments.refundRequestModal.refundReason")}
                name="reasonId"
                rules={[{ required: true }]}
              >
                <Select
                  value={form.getFieldValue("reasonId")}
                  placeholder={t("formPlaceholders.pages.refund.requestModal.selectReason")}
                  options={reasonOptions}
                />
              </Form.Item>
              <div>
                <Form.Item
                  className="notes-item"
                  label={t("payments.refundRequestModal.notes")}
                  name="additionalComments"
                  dependencies={["reasonId"]}
                  rules={[
                    {
                      required: isOtherReason,
                      message: t("payments.refundRequestModal.notesRequired"),
                    },
                  ]}
                >
                  <TextArea
                    maxLength={500}
                    onChange={(val) => setNotes(val.target.value)}
                    placeholder={t("formPlaceholders.pages.refund.requestModal.notesPlaceholder")}
                  />
                </Form.Item>
                <div className="area-count">{notes.length} / 500</div>
              </div>
            </div>
            <div className="form-column">
              <Form.Item
                className="no-bottom"
                label={t("payments.refundRequestModal.attachments")}
                name="attachments"
              >
                <FileUpload
                  maxCount={3}
                  maxSize={5}
                  placeholder={t("formPlaceholders.common.uploadFile")}
                  uploadTip={t("payments.refundRequestModal.attachmentsUploadTip")}
                  maxSizeErrorMessage={t(
                    "payments.refundRequestModal.attachmentsMaxSizeError",
                  )}
                  customRequest={uploadFile}
                />
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default AddModal;
