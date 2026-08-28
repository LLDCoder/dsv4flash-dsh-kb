import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { observer, useField } from "@formily/react";
import { Input, Radio, Row, Col, Select, Card as AntdCard } from "antd";
import type { RadioChangeEvent } from "antd/lib/radio";
import type { RcFile } from "antd/lib/upload";
import DocumentViewer from "@/components/common/DocumentViewer";
import CustomMessage from "@/components/common/CustomMessage";
import { getAuthoritiesByEmirateId } from "@/services/services";
import { getEmirateList, type EmirateItem } from "@/services/userProfile";
import {
  normalizeTradeLicenseAuthorityList,
  unwrapTradeLicenseListResponse,
  type TradeLicenseAuthorityItem,
} from "@/services/tradeLicense";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import "./styles.less";

const { Option } = Select;

export type TradeLicenseDetailsValue = {
  tradeLicenseNumber?: string;
  hasValidTaxRegistration?: boolean;
  taxRegistrationNumber?: string;
  emirateId?: number;
  authorityId?: number;
  tradeLicenseFile?: string;
};

const MAX_LEN = 50;

const slice50 = (s: string) => s.slice(0, MAX_LEN);

function validateTradeLicenseDetailsValue(
  val: TradeLicenseDetailsValue | undefined,
  messages: {
    tradeLicenseNumber: string;
    taxQuestion: string;
    taxRegistrationNumber: string;
    emirate: string;
    authority: string;
    tradeLicenseFile: string;
  }
): string {
  const v = val || {};
  if (!String(v.tradeLicenseNumber || "").trim()) {
    return messages.tradeLicenseNumber;
  }
  if (typeof v.hasValidTaxRegistration !== "boolean") {
    return messages.taxQuestion;
  }
  if (
    v.hasValidTaxRegistration &&
    !String(v.taxRegistrationNumber || "").trim()
  ) {
    return messages.taxRegistrationNumber;
  }
  if (v.emirateId == null || Number.isNaN(Number(v.emirateId))) {
    return messages.emirate;
  }
  if (v.authorityId == null || Number.isNaN(Number(v.authorityId))) {
    return messages.authority;
  }
  if (
    v.tradeLicenseFile == null ||
    v.tradeLicenseFile === "" ||
    (Array.isArray(v.tradeLicenseFile) && v.tradeLicenseFile.length === 0)
  ) {
    return messages.tradeLicenseFile;
  }
  return "";
}

type TradeLicenseDetailsFieldProps = {
  className?: string;
  disabled?: boolean;
  readOnlyDetails?: boolean;
};

export const TradeLicenseDetailsField: React.FC<TradeLicenseDetailsFieldProps> =
  observer((props) => {
    const { t, i18n } = useTranslation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- align with other designable composite fields
    const field = useField<any>();
    const disabled = !!props.disabled;
    const detailsDisabled = disabled || !!props.readOnlyDetails;
    const isAr = Boolean(i18n.language?.startsWith("ar"));

    const raw = (field.value || {}) as TradeLicenseDetailsValue;
    const current: TradeLicenseDetailsValue = {
      tradeLicenseNumber: raw.tradeLicenseNumber ?? "",
      hasValidTaxRegistration:
        typeof raw.hasValidTaxRegistration === "boolean"
          ? raw.hasValidTaxRegistration
          : true,
      taxRegistrationNumber: raw.taxRegistrationNumber ?? "",
      emirateId: raw.emirateId,
      authorityId: raw.authorityId,
      tradeLicenseFile: raw.tradeLicenseFile,
    };

    const [emirateOptions, setEmirateOptions] = useState<EmirateItem[]>([]);
    const [emirateLoading, setEmirateLoading] = useState(true);
    const [authorityOptions, setAuthorityOptions] = useState<
      TradeLicenseAuthorityItem[]
    >([]);
    const [authorityLoading, setAuthorityLoading] = useState(false);

    useEffect(() => {
      const v = field.value as TradeLicenseDetailsValue | undefined;
      if (v != null && typeof v.hasValidTaxRegistration === "boolean") return;
      field.setValue({
        tradeLicenseNumber: v?.tradeLicenseNumber ?? "",
        hasValidTaxRegistration: v?.hasValidTaxRegistration ?? true,
        taxRegistrationNumber: v?.taxRegistrationNumber ?? "",
        emirateId: v?.emirateId,
        authorityId: v?.authorityId,
        tradeLicenseFile: v?.tradeLicenseFile,
      });
    }, [field]);

    useEffect(() => {
      let cancelled = false;
      setEmirateLoading(true);
      getEmirateList()
        .then((res) => {
          if (cancelled) return;
          const data =
            res && typeof res === "object" && "data" in res
              ? (res as { data?: EmirateItem[] }).data
              : undefined;
          setEmirateOptions(Array.isArray(data) ? data : []);
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

    const emirateId = current.emirateId;

    useEffect(() => {
      const id = emirateId != null ? Number(emirateId) : NaN;
      if (emirateId == null || Number.isNaN(id)) {
        setAuthorityOptions([]);
        return;
      }
      let cancelled = false;
      setAuthorityLoading(true);
      getAuthoritiesByEmirateId(id)
        .then((res) => {
          if (cancelled) return;
          setAuthorityOptions(
            normalizeTradeLicenseAuthorityList(
              unwrapTradeLicenseListResponse(res),
              { visibleOnly: true }
            )
          );
        })
        .catch(() => {
          if (!cancelled) setAuthorityOptions([]);
        })
        .finally(() => {
          if (!cancelled) setAuthorityLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [emirateId]);

    const validationMessages = React.useMemo(
      () => ({
        tradeLicenseNumber: t("TradeLicenseDetails.validation.tradeLicenseNumber"),
        taxQuestion: t("TradeLicenseDetails.validation.taxQuestion"),
        taxRegistrationNumber: t(
          "TradeLicenseDetails.validation.taxRegistrationNumber",
        ),
        emirate: t("TradeLicenseDetails.validation.emirate"),
        authority: t("TradeLicenseDetails.validation.authority"),
        tradeLicenseFile: t("TradeLicenseDetails.validation.tradeLicenseFile"),
      }),
      [t],
    );

    useEffect(() => {
      field.setValidator((value: TradeLicenseDetailsValue | undefined) =>
        validateTradeLicenseDetailsValue(value, validationMessages),
      );
    }, [field, validationMessages]);

    const patch = (partial: Partial<TradeLicenseDetailsValue>) => {
      field.setValue({
        ...current,
        ...partial,
      });
    };

    const handleTradeLicenseNumber = (s: string) => {
      patch({ tradeLicenseNumber: slice50(s) });
    };

    const handleTaxRadio = (e: RadioChangeEvent) => {
      const yes = e.target.value === true;
      patch({
        hasValidTaxRegistration: yes,
        taxRegistrationNumber: yes ? current.taxRegistrationNumber : "",
      });
    };

    const handleTaxNumber = (s: string) => {
      patch({ taxRegistrationNumber: slice50(s) });
    };

    const handleEmirate = (id: number | undefined) => {
      patch({ emirateId: id, authorityId: undefined });
    };

    const handleAuthority = (id: number | undefined) => {
      patch({ authorityId: id });
    };

    const beforeUploadFile = (file: RcFile) => {
      const ok = /\.(jpe?g|png|pdf)$/i.test(file.name);
      if (!ok) {
        CustomMessage.error(t("TradeLicenseDetails.validation.invalidFileType"));
        return false;
      }
      if (file.size / 1024 / 1024 > 4) {
        CustomMessage.error(t("TradeLicenseDetails.validation.maxSize"));
        return false;
      }
      return true;
    };

    const showTax = current.hasValidTaxRegistration === true;

    const renderLabel = (label: string, required = true) => (
      <div className="trade-license-details-label">
        <span>
          {label}
          {required && (
            <span className="trade-license-details-required">*</span>
          )}
        </span>
      </div>
    );

    return (
      <div
        className={`trade-license-details-container ${props.className || ""}`}
      >
        <AntdCard
          className="trade-license-details-card"
          title={t("TradeLicenseDetails.title")}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="trade-license-details-field">
                {renderLabel(t("TradeLicenseDetails.label.tradeLicenseNumber"))}
                <Input
                  disabled={detailsDisabled}
                  placeholder={t("TradeLicenseDetails.placeholder.tradeLicenseNumber")}
                  value={current.tradeLicenseNumber}
                  onChange={(e) => handleTradeLicenseNumber(e.target.value)}
                  maxLength={MAX_LEN}
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="trade-license-details-field">
                {renderLabel(
                  t("TradeLicenseDetails.label.hasValidTaxRegistration"),
                  true
                )}
                <Radio.Group
                  disabled={detailsDisabled}
                  value={current.hasValidTaxRegistration}
                  onChange={handleTaxRadio}
                  className="trade-license-details-radio-group"
                >
                  <Radio value={true}>{t("TradeLicenseDetails.common.yes")}</Radio>
                  <Radio value={false}>{t("TradeLicenseDetails.common.no")}</Radio>
                </Radio.Group>
              </div>
            </Col>
          </Row>

          <div
            className={`trade-license-details-tax-wrap ${
              showTax
                ? "trade-license-details-tax-wrap--visible"
                : "trade-license-details-tax-wrap--hidden"
            }`}
            aria-hidden={!showTax}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <div className="trade-license-details-field">
                  {renderLabel(t("TradeLicenseDetails.label.taxRegistrationNumber"))}
                  <Input
                    disabled={detailsDisabled}
                    placeholder={t("TradeLicenseDetails.placeholder.taxRegistrationNumber")}
                    value={current.taxRegistrationNumber}
                    onChange={(e) => handleTaxNumber(e.target.value)}
                    maxLength={MAX_LEN}
                  />
                </div>
              </Col>
            </Row>
          </div>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="trade-license-details-field">
                {renderLabel(t("TradeLicenseDetails.label.emirate"))}
                <Select
                  disabled={detailsDisabled}
                  loading={emirateLoading}
                  placeholder={t("TradeLicenseDetails.placeholder.emirate")}
                  value={current.emirateId}
                  onChange={handleEmirate}
                  showSearch
                  optionFilterProp="children"
                  allowClear
                >
                  {emirateOptions.map((e) => (
                    <Option key={e.id} value={e.id}>
                      {preferLocalizedEnAr(isAr, e.nameEn, e.nameAr)}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="trade-license-details-field">
                {renderLabel(t("TradeLicenseDetails.label.authority"))}
                <Select
                  disabled={detailsDisabled || emirateId == null}
                  loading={authorityLoading}
                  placeholder={t("TradeLicenseDetails.placeholder.authority")}
                  value={current.authorityId}
                  onChange={handleAuthority}
                  showSearch
                  optionFilterProp="children"
                  allowClear
                >
                  {authorityOptions.map((a) => (
                    <Option key={a.id} value={a.id}>
                      {preferLocalizedEnAr(isAr, a.nameEn, a.nameAr)}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="trade-license-details-field trade-license-details-upload">
                {renderLabel(t("TradeLicenseDetails.label.tradeLicense"))}
                <DocumentViewer
                  hasDelete={!disabled}
                  disabled={disabled}
                  value={current.tradeLicenseFile}
                  onChange={(v) =>
                    patch({
                      tradeLicenseFile: Array.isArray(v) ? v[0] : (v as string),
                    })
                  }
                  uploadConfig={{
                    maxCount: 1,
                    maxSize: 4,
                    accept: ".jpg,.jpeg,.png,.pdf",
                    uploadTip: t("TradeLicenseDetails.uploadTip.tradeLicense"),
                    beforeUpload: beforeUploadFile,
                  }}
                />
              </div>
            </Col>
          </Row>
        </AntdCard>
      </div>
    );
  });

TradeLicenseDetailsField.displayName = "TradeLicenseDetailsField";

export default TradeLicenseDetailsField;
