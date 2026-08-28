import React from "react";
import { Input, Select } from "antd";
import { StandaloneMobileNumberInput } from "@/components/common/MobileNumberInput";
import type {
  AreaItem,
  EmirateItem,
  RegionItem,
} from "@/services/address";
import { useTranslation } from "react-i18next";
import {
  buildDeliveryInformationDisplay,
  isAbuDhabiEmirate,
  type DeliveryInformationErrors,
  type DeliveryInformationReadOnlyLabels,
  type DeliveryInformationValues,
} from "./formValues";
import "./index.less";

export type {
  DeliveryInformationErrors,
  DeliveryInformationReadOnlyLabels,
  DeliveryInformationValues,
} from "./formValues";

interface DeliveryInformationProps {
  values: DeliveryInformationValues;
  errors: DeliveryInformationErrors;
  emirates: EmirateItem[];
  regions: RegionItem[];
  areas: AreaItem[];
  courierOptions: Array<{ label: string; value: string | number }>;
  loadingAddress: boolean;
  loadingCourierOptions?: boolean;
  readOnly?: boolean;
  readOnlyLabels?: DeliveryInformationReadOnlyLabels;
  onFieldChange: <K extends keyof DeliveryInformationValues>(
    key: K,
    value: DeliveryInformationValues[K],
  ) => void;
}

const DeliveryInformation: React.FC<DeliveryInformationProps> = ({
  values,
  errors,
  emirates,
  regions,
  areas,
  courierOptions,
  loadingAddress,
  loadingCourierOptions = false,
  readOnly = false,
  readOnlyLabels,
  onFieldChange,
}) => {
  const { t } = useTranslation();
  const resolvedReadOnlyLabels = readOnlyLabels || {};

  if (readOnly) {
    const display = buildDeliveryInformationDisplay(resolvedReadOnlyLabels);
    const detailItems = [
      {
        key: "courierService",
        label: t("deliveryInformation.courierService"),
        value: display.courierService,
      },
      {
        key: "recipientName",
        label: t("deliveryInformation.recipientName"),
        value: display.recipientName,
      },
      {
        key: "mobileNumber",
        label: t("deliveryInformation.mobileNumber"),
        value: display.mobileNumber,
      },
      {
        key: "address",
        label: t("deliveryInformation.address"),
        value: display.address,
      },
    ];

    return (
      <section className="delivery-information-card">
        <h3 className="delivery-information-card__title">
          {t("deliveryInformation.title")}
        </h3>
        <div className="delivery-information-card__details">
          {detailItems.map((item) => (
            <div
              className="delivery-information-card__detail-item"
              key={item.key}
            >
              <div className="delivery-information-card__detail-label">
                {item.label}
              </div>
              <div
                className="delivery-information-card__detail-value"
                dir={item.key === "mobileNumber" ? "ltr" : undefined}
              >
                {item.value || "-"}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const showRegion = isAbuDhabiEmirate(values.emirateId, emirates);

  const filteredRegions = values.emirateId
    ? regions.filter((region) => region.emirateId === values.emirateId)
    : [];

  const filteredAreas = (() => {
    if (!values.emirateId) {
      return [];
    }

    if (showRegion) {
      if (!values.regionId) {
        return [];
      }

      return areas.filter((area) => area.regionId === values.regionId);
    }

    const regionIds = new Set(
      regions
        .filter((region) => region.emirateId === values.emirateId)
        .map((region) => region.id),
    );

    return areas.filter((area) => regionIds.has(area.regionId));
  })();

  const areaDisabled =
    !values.emirateId || (showRegion && !values.regionId) || loadingAddress;

  const renderError = (message?: string) =>
    message ? <div className="delivery-information__error">{message}</div> : null;

  const renderLabel = (text: string) => (
    <label className="delivery-information__label">
      {text}
      <span>*</span>
    </label>
  );

  return (
    <div className="delivery-information-card">
      <h3 className="delivery-information-card__title">
        {t("deliveryInformation.title")}
      </h3>

      <div className="delivery-information__form">
        <div
          className="delivery-information__field"
          data-form-validation-error={Boolean(errors.courierService)}
        >
          {renderLabel(t("deliveryInformation.courierService"))}
          <Select
            placeholder={t("formPlaceholders.common.select")}
            value={values.courierService || undefined}
            onChange={(value) => onFieldChange("courierService", value)}
            options={courierOptions}
            loading={loadingCourierOptions}
            disabled={!loadingCourierOptions && courierOptions.length === 0}
            className={
              errors.courierService
                ? "delivery-information__select delivery-information__select--error"
                : "delivery-information__select"
            }
          />
          {renderError(errors.courierService)}
        </div>

        <div
          className="delivery-information__field"
          data-form-validation-error={Boolean(errors.recipientName)}
        >
          {renderLabel(t("deliveryInformation.recipientName"))}
          <Input
            placeholder={t("formPlaceholders.common.enterName")}
            value={values.recipientName}
            onChange={(event) =>
              onFieldChange("recipientName", event.target.value)
            }
            className={
              errors.recipientName
                ? "delivery-information__input delivery-information__input--error"
                : "delivery-information__input"
            }
          />
          {renderError(errors.recipientName)}
        </div>

        <div
          className="delivery-information__field"
          data-form-validation-error={Boolean(errors.emirateId)}
        >
          {renderLabel(t("deliveryInformation.emirate"))}
          <Select
            placeholder={t("formPlaceholders.common.selectEmirate")}
            value={values.emirateId}
            onChange={(value) => onFieldChange("emirateId", value)}
            options={emirates.map((item) => ({
              label: item.nameEn,
              value: item.id,
            }))}
            loading={loadingAddress}
            showSearch
            optionFilterProp="label"
            className={
              errors.emirateId
                ? "delivery-information__select delivery-information__select--error"
                : "delivery-information__select"
            }
          />
          {renderError(errors.emirateId)}
        </div>

        {showRegion ? (
          <div
            className="delivery-information__field"
            data-form-validation-error={Boolean(errors.regionId)}
          >
            {renderLabel(t("deliveryInformation.region"))}
            <Select
              placeholder={t("formPlaceholders.common.selectRegion")}
              value={values.regionId}
              onChange={(value) => onFieldChange("regionId", value)}
              options={filteredRegions.map((item) => ({
                label: item.nameEn,
                value: item.id,
              }))}
              loading={loadingAddress}
              showSearch
              optionFilterProp="label"
              className={
                errors.regionId
                  ? "delivery-information__select delivery-information__select--error"
                  : "delivery-information__select"
              }
            />
            {renderError(errors.regionId)}
          </div>
        ) : null}

        <div
          className="delivery-information__field"
          data-form-validation-error={Boolean(errors.areaId)}
        >
          {renderLabel(t("deliveryInformation.area"))}
          <Select
            placeholder={t("formPlaceholders.common.selectArea")}
            value={values.areaId}
            onChange={(value) => onFieldChange("areaId", value)}
            options={filteredAreas.map((item) => ({
              label: item.nameEn,
              value: item.id,
            }))}
            disabled={areaDisabled}
            loading={loadingAddress}
            showSearch
            optionFilterProp="label"
            className={
              errors.areaId
                ? "delivery-information__select delivery-information__select--error"
                : "delivery-information__select"
            }
          />
          {renderError(errors.areaId)}
        </div>

        <div
          className="delivery-information__field"
          data-form-validation-error={Boolean(errors.street)}
        >
          {renderLabel(t("deliveryInformation.street"))}
          <Input
            placeholder={t("formPlaceholders.common.enterStreet")}
            value={values.street}
            onChange={(event) => onFieldChange("street", event.target.value)}
            maxLength={500}
            className={
              errors.street
                ? "delivery-information__input delivery-information__input--error"
                : "delivery-information__input"
            }
          />
          {renderError(errors.street)}
        </div>

        <div
          className="delivery-information__field delivery-information__field--phone"
          data-form-validation-error={Boolean(errors.mobile)}
        >
          {renderLabel(t("deliveryInformation.mobileNumber"))}
          <StandaloneMobileNumberInput
            countryCode={values.mobile.mobileCountryCode}
            phoneNumber={values.mobile.mobileLocalNumber}
            placeholder={t("formPlaceholders.common.enterMobileNumber")}
            searchPlaceholder={t("formPlaceholders.common.search")}
            emptyText={t("multiSelectDropdown.noResults")}
            hasError={Boolean(errors.mobile)}
            onCountryCodeChange={(value) =>
              onFieldChange("mobile", {
                ...values.mobile,
                mobileCountryCode: value,
              })
            }
            onPhoneNumberChange={(value) =>
              onFieldChange("mobile", {
                ...values.mobile,
                mobileLocalNumber: value,
              })
            }
          />
          {renderError(errors.mobile)}
        </div>
      </div>
    </div>
  );
};

export default DeliveryInformation;
