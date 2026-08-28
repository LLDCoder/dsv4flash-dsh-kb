import React, { useEffect, useState } from "react";
import AED from "@/assets/icons/Aed";
import { Input, Modal, Form } from "antd";
import { useTranslation } from "react-i18next";
import CardPay from "@/assets/icons/CardPay";
import Loading from "@/components/common/Loading";

interface RechargeModalProps {
  show: boolean;
  close: () => void;
  recharge: (amount: string) => void;
}
const RechargeModal: React.FC<RechargeModalProps> = ({
  show,
  close,
  recharge,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [activeAmount, setActiveAmount] = useState("0.00");
  const [, update] = useState({});
  const [hasError, setHasError] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  useEffect(() => {
    if (show) {
      form?.resetFields();
      setActiveAmount("0.00");
      update({});
    }
  }, [form, show]);
  const handleRecharge = () => {
    if (rechargeLoading) return;
    if (activeAmount === "0.00" && hasError) {
      return;
    }
    let { amount } = form.getFieldsValue();
    if (!amount || amount < 100) {
      amount = activeAmount;
    }
    if (!amount || amount === "0.00") {
      return;
    }
    setRechargeLoading(true);
    recharge(amount);
  };
  return (
    <Modal centered
      className="payments-modal"
      afterClose={() => setRechargeLoading(false)}
      maskClosable={false}
      visible={show}
      onCancel={close}
      footer={false}
      title={
        <div className="payments-modal-header">
          <div className="title">{t("payments.recharge.title")}</div>
          <div className="desc">{t("payments.recharge.desc")}</div>
        </div>
      }
    >
      <div className="payments-modal-content">
        <div className="recharge-amount">
          <div className="recharge-amount-title">
            {t("payments.recharge.rechargeAmount")}
          </div>
          <div className="recharge-amount-amount">
            {["100.00", "500.00", "1000.00", "2000.00", "5000.00"].map(
              (item) => {
                return (
                  <div
                    key={item}
                    className={
                      item === activeAmount ? "recharge-amount-active" : ""
                    }
                    onClick={() => {
                      if (activeAmount === item) {
                        setActiveAmount("0.00");
                      } else {
                        setActiveAmount(item);
                      }
                      form.setFieldValue("amount", undefined);
                      update({});
                    }}
                  >
                    <AED />
                    {item}
                  </div>
                );
              },
            )}
            <Form
              form={form}
              layout="vertical"
              onChange={() => {
                setActiveAmount("0.00");
                update({});
              }}
              onValuesChange={() => {
                setActiveAmount("0.00");
                update({});
              }}
              className={`custorm-form`}
            >
              <Form.Item
                name="amount"
                rules={[
                  {
                    validator: (_, value) => {
                      if (value && value < 100) {
                        setHasError(true);
                        return Promise.reject();
                      } else {
                        setHasError(false);
                        return Promise.resolve();
                      }
                    },
                  },
                ]}
              >
                <Input
                  className="custom-amount-input"
                  autoComplete="off"
                  onChange={(e) => {
                    const num = e.target.value.replace(/\D/g, "");
                    const val = Math.min(Number(num), 50000);
                    form.setFieldValue("amount", val);
                    update({});
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    const num = target.value.replace(/\D/g, "");
                    const val = Math.min(Number(num), 50000);
                    form.setFieldValue("amount", val);
                    update({});
                  }}
                  onBlur={(e) => {
                    const num = e.target.value.replace(/\D/g, "");
                    const val = Math.min(Number(num), 50000);
                    form.setFieldValue("amount", val);
                    update({});
                  }}
                  // style={{ color: isCustomHighlighted ? "#fff" : undefined }}
                  placeholder={t("formPlaceholders.pages.payments.recharge.customAmount")}
                />
              </Form.Item>
              <div
                className={`payments-modal-form-desc ${
                  hasError ? "error" : ""
                }`}
              >
                {t("payments.recharge.minAmount")} <AED /> 100.00
              </div>
            </Form>
          </div>
        </div>
      </div>
      <div className="card-pay">
        <div className="card-pay-title">
          <CardPay />
          {t("payments.recharge.cardPayment")}
        </div>
        <div className="card-pay-desc">
          {t("payments.recharge.cardPaymentDesc")}
        </div>
      </div>
      <div className="payments-modal-footer">
        <div className="total-amount">
          <div className="total-amount-text">
            {t("payments.recharge.totalAmount")}
          </div>
          <div className="total-amount-amount">
            <AED />{" "}
            {activeAmount === "0.00" ||
            (!hasError && !!form.getFieldValue("amount"))
              ? !form.getFieldValue("amount")
                ? "0.00"
                : form.getFieldValue("amount")
              : activeAmount ?? 0}
          </div>
        </div>
        <div
          onClick={handleRecharge}
          className={`submit-btn ${
            (activeAmount === "0.00" && !form.getFieldValue("amount")) ||
            (activeAmount === "0.00" && hasError)
              ? "disabled"
              : ""
          }`}
        >
          <Loading loading={rechargeLoading}>
            {t("payments.recharge.continueToPayment")}
          </Loading>
        </div>
      </div>
    </Modal>
  );
};

export default RechargeModal;
