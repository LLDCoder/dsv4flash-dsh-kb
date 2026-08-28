import React from "react";
import { Form, Input, Select } from "antd";
import type { FormInstance } from "antd/lib/form";
import { useTranslation } from "react-i18next";
import { AddressMapPicker, CustomButton } from "@/components/common";
import { selectDownIcon } from "@/utils/date";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import type { AddressData } from "../hooks/useAddressData";
import type { PersonalProfilePageMode } from "../utils/expiryUtils";
import { isPersonalProfileFormReadOnly } from "../utils/expiryUtils";

const { Option } = Select;

const MAP_FIELD_NAMES = {
  emirate: "addressEmirate",
  region: "addressRegion",
  area: "addressArea",
  street: "addressStreet",
  latitude: "addressLatitude",
  longitude: "addressLongitude",
};

interface AddressSectionProps {
  form: FormInstance;
  addressData: AddressData;
  pageMode: PersonalProfilePageMode;
  isAddMode: boolean;
  isEditingAddress: boolean;
  setIsEditingAddress: (v: boolean) => void;
  onSaveAddress: (setIsEditingAddress: (v: boolean) => void) => Promise<void>;
  isAr: boolean;
  addressInlineEditEnabled: boolean;
  addressEditableWithFooter: boolean;
}

const AddressSection: React.FC<AddressSectionProps> = ({
  form,
  addressData,
  pageMode,
  isAddMode,
  isEditingAddress,
  setIsEditingAddress,
  onSaveAddress,
  isAr,
  addressInlineEditEnabled,
  addressEditableWithFooter,
}) => {
  const { t } = useTranslation();
  const addressEmirate = Form.useWatch("addressEmirate", form);
  const addressRegion = Form.useWatch("addressRegion", form);
  const {
    emirateList,
    filteredRegionList,
    filteredAreaList,
    handleEmirateChange,
    handleRegionChange,
  } = addressData;

  const formReadOnly = isPersonalProfileFormReadOnly(pageMode);

  const addressFieldsInteractive =
    !formReadOnly &&
    (addressEditableWithFooter || (addressInlineEditEnabled && isEditingAddress));

  const fieldsDisabled = formReadOnly || !addressFieldsInteractive;

  const hasSelectedEmirate =
    addressEmirate !== undefined &&
    addressEmirate !== null &&
    addressEmirate !== "";
  const hasSelectedRegion =
    addressRegion !== undefined &&
    addressRegion !== null &&
    addressRegion !== "";
  const regionDisabled = fieldsDisabled || !hasSelectedEmirate;
  const areaDisabled =
    fieldsDisabled || !hasSelectedEmirate || !hasSelectedRegion;

  return (
    <div className="profile-section" style={{ marginBottom: "24px" }}>
      <div className="section-header">
        <h2 className="section-title">
          {t("personalProfilePage.sections.addressInformation")}
        </h2>

        {!isAddMode && !isEditingAddress && addressInlineEditEnabled && (
          <CustomButton
            text={t("personalProfilePage.actions.edit")}
            variant="outline"
            customClassName="saveBtn"
            size="medium"
            onClick={() => setIsEditingAddress(true)}
          />
        )}

        {!isAddMode && isEditingAddress && addressInlineEditEnabled && (
          <div className="form-actions">
            <CustomButton
              text={t("personalProfilePage.actions.cancel")}
              variant="outline"
              customClassName="saveBtn"
              size="medium"
              onClick={() => setIsEditingAddress(false)}
            />
            <CustomButton
              text={t("personalProfilePage.actions.save")}
              size="medium"
              customClassName="saveBtn"
              variant="primary"
              onClick={() => onSaveAddress(setIsEditingAddress)}
            />
          </div>
        )}
      </div>

      <div className="form-grid">
        <Form.Item
          name="addressEmirate"
          label={t("personalProfilePage.fields.emirate")}
          rules={[{ required: true, message: t("personalProfilePage.validation.emirateRequired") }]}
          className="form-item"
        >
          <Select
            suffixIcon={selectDownIcon}
            disabled={fieldsDisabled}
            onChange={handleEmirateChange}
            placeholder={t("formPlaceholders.common.selectEmirate")}
          >
            {emirateList.map((emirate) => (
              <Option key={emirate.id} value={emirate.id}>
                {preferLocalizedEnAr(isAr, emirate.nameEn, emirate.nameAr)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="addressRegion"
          label={t("personalProfilePage.fields.region")}
          rules={[{ required: true, message: t("personalProfilePage.validation.regionRequired") }]}
          className="form-item"
        >
          <Select
            suffixIcon={selectDownIcon}
            disabled={regionDisabled}
            onChange={handleRegionChange}
            placeholder={t("formPlaceholders.common.selectRegion")}
          >
            {filteredRegionList.map((region) => (
              <Option key={region.id} value={region.id}>
                {preferLocalizedEnAr(isAr, region.nameEn, region.nameAr)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="addressArea"
          label={t("personalProfilePage.fields.area")}
          rules={[{ required: true, message: t("personalProfilePage.validation.areaRequired") }]}
          className="form-item"
        >
          <Select
            suffixIcon={selectDownIcon}
            disabled={areaDisabled}
            placeholder={t("formPlaceholders.common.selectArea")}
          >
            {filteredAreaList.map((area) => (
              <Option key={area.id} value={area.id}>
                {preferLocalizedEnAr(isAr, area.nameEn, area.nameAr)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="addressStreet"
          label={t("personalProfilePage.fields.street")}
          rules={[{ required: true, message: t("personalProfilePage.validation.streetRequired") }]}
          className="form-item"
        >
          <Input.TextArea
            className="address-street-textarea"
            placeholder={t("formPlaceholders.common.enterStreet")}
            maxLength={200}
            disabled={fieldsDisabled}
          />
        </Form.Item>
      </div>

      <AddressMapPicker
        form={form}
        emirateList={emirateList}
        fieldNames={MAP_FIELD_NAMES}
        interactive={addressFieldsInteractive}
        onEmirateMatched={handleEmirateChange}
        hint={t("personalProfilePage.fields.mapHint")}
      />
    </div>
  );
};

export default AddressSection;
