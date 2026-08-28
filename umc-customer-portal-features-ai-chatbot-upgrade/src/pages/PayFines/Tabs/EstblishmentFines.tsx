import { useEffect, useMemo, useState } from "react";
import { Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import {
  getPayFineEmirates,
  type PayFineEmirateDto,
  type PayFineSearchByEstablishmentParams,
} from "@/services/violationFine";

const PURE_DIGITS_PATTERN = /^\d+$/;
const CN_LICENSE_PATTERN = /^CN-\d+$/i;

const isValidLicenseFormat = (value?: string) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;
  return PURE_DIGITS_PATTERN.test(trimmed) || CN_LICENSE_PATTERN.test(trimmed);
};

const isAbuDhabiEmirate = (option?: PayFineEmirateDto) => {
  if (!option) return false;
  if (option.code) return option.code.toUpperCase() === "AUH";
  return option.nameEn?.trim().toLowerCase() === "abu dhabi" || option.id === 1;
};

interface EstblishmentFinesProps {
  disabled: boolean;
  onValuesChange: (params: PayFineSearchByEstablishmentParams) => void;
  onSearch: (params: PayFineSearchByEstablishmentParams) => void;
}

export default function EstblishmentFines({
  disabled,
  onValuesChange,
  onSearch,
}: EstblishmentFinesProps) {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm<PayFineSearchByEstablishmentParams>();
  const [canSearch, setCanSearch] = useState(false);
  const [emirateOptions, setEmirateOptions] = useState<PayFineEmirateDto[]>([]);
  const [emirateLoading, setEmirateLoading] = useState(false);
  const [selectedEmirateId, setSelectedEmirateId] = useState<number | undefined>();

  useEffect(() => {
    let cancelled = false;
    setEmirateLoading(true);
    getPayFineEmirates()
      .then((response) => {
        if (!cancelled) setEmirateOptions(response.data);
      })
      .catch(() => {
        if (!cancelled) setEmirateOptions([]);
      })
      .finally(() => {
        if (!cancelled) setEmirateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEmirate = useMemo(
    () => emirateOptions.find((item) => item.id === selectedEmirateId),
    [emirateOptions, selectedEmirateId],
  );
  const abuDhabiSelected = isAbuDhabiEmirate(selectedEmirate);

  // Requirement §9.3 gates search on format only (letters must be the CN-
  // prefix, pure digits pass). The Abu Dhabi "must start with CN-" rule is a
  // non-blocking hint — the backend performs the authoritative validation.
  const evaluateCanSearch = (
    values: Partial<PayFineSearchByEstablishmentParams>,
  ) =>
    Boolean(
      isValidLicenseFormat(values.CommercialLicenseNumber) && values.EmirateId,
    );

  const handleValuesChange = (
    _: Partial<PayFineSearchByEstablishmentParams>,
    values: PayFineSearchByEstablishmentParams,
  ) => {
    setSelectedEmirateId(values.EmirateId);
    setCanSearch(evaluateCanSearch(values));
    onValuesChange(values);
  };

  const handleEmirateChange = (value?: number) => {
    setSelectedEmirateId(value);
  };

  const handleFinish = (values: PayFineSearchByEstablishmentParams) => {
    if (!disabled && canSearch) onSearch(values);
  };

  return (
    <div className="individual-fines">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        onValuesChange={handleValuesChange}
        className="custorm-form individual-fines-form"
      >
        <div className="individual-fines-input">
          <Form.Item
            name="CommercialLicenseNumber"
            label={t("estblishmentFines.licenseNumber")}
            rules={[
              {
                required: true,
                message: t("estblishmentFines.please.licenseNumber"),
              },
              {
                validator: (_rule, value?: string) =>
                  !value || isValidLicenseFormat(value)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(t("estblishmentFines.please.licenseFormat")),
                      ),
              },
            ]}
            extra={
              abuDhabiSelected ? (
                <span className="pay-fines-field-hint">
                  {t("estblishmentFines.please.licenseAbuDhabi")}
                </span>
              ) : null
            }
          >
            <Input
              allowClear
              placeholder={t("estblishmentFines.placeholder.licenseNumber")}
            />
          </Form.Item>
          <Form.Item
            name="EmirateId"
            label={t("estblishmentFines.emirate")}
            rules={[
              {
                required: true,
                message: t("estblishmentFines.please.emirate"),
              },
            ]}
          >
            <Select
              allowClear
              loading={emirateLoading}
              placeholder={t("estblishmentFines.placeholder.emirate")}
              onChange={handleEmirateChange}
            >
              {emirateOptions.map((item) => (
                <Select.Option key={item.id} value={item.id}>
                  {i18n.language?.startsWith("ar") ? item.nameAr : item.nameEn}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
        <div className="pay-fines-tabs-btns">
          <button
            type="submit"
            className={`pay-fines-tabs-btn-search${
              disabled || !canSearch ? " disabled" : ""
            }`}
          >
            {t("common.search")}
          </button>
        </div>
      </Form>
    </div>
  );
}
