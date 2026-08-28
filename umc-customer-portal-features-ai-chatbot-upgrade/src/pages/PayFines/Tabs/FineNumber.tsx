import { useState } from "react";
import { Form, Input } from "antd";
import { useTranslation } from "react-i18next";
import type { PayFineSearchByViolationNumberParams } from "@/services/violationFine";

interface FineNumberProps {
  disabled: boolean;
  onValuesChange: (params: PayFineSearchByViolationNumberParams) => void;
  onSearch: (params: PayFineSearchByViolationNumberParams) => void;
}

export default function FineNumber({
  disabled,
  onValuesChange,
  onSearch,
}: FineNumberProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<PayFineSearchByViolationNumberParams>();
  const [canSearch, setCanSearch] = useState(false);

  const handleValuesChange = (
    _: Partial<PayFineSearchByViolationNumberParams>,
    values: PayFineSearchByViolationNumberParams,
  ) => {
    setCanSearch(Boolean(values.violationNumber?.trim()));
    onValuesChange(values);
  };

  const handleFinish = (values: PayFineSearchByViolationNumberParams) => {
    if (!disabled) onSearch(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      onValuesChange={handleValuesChange}
      className="custorm-form pay-fines-form"
    >
      <Form.Item
        name="violationNumber"
        label={t("fineNumber.fineNumber")}
        rules={[{ required: true, message: t("fineNumber.please.fineNumber") }]}
      >
        <Input allowClear placeholder={t("fineNumber.placeholder.fineNumber")} />
      </Form.Item>
      <button
        type="submit"
        className={`pay-fines-tabs-btn-search${
          disabled || !canSearch ? " disabled" : ""
        }`}
      >
        {t("common.search")}
      </button>
    </Form>
  );
}
