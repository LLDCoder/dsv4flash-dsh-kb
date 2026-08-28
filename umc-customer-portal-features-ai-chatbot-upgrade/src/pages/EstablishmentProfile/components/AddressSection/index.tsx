import React, { useCallback } from "react";
import { Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import type { FormInstance } from "antd";
import { AddressMapPicker } from "@/components/common";
import type { EmirateItem, RegionItem, AreaItem } from "@/services/userProfile";
import type { LocalizedNameSource } from "../../utils/formHelpers";

const { Option } = Select;

// Street is named `street` here, where the personal profile calls it `addressStreet`.
const MAP_FIELD_NAMES = {
  emirate: "addressEmirate",
  region: "addressRegion",
  area: "addressArea",
  street: "street",
  latitude: "addressLatitude",
  longitude: "addressLongitude",
};

interface AddressSectionProps {
  form: FormInstance;
  emirateList: EmirateItem[];
  filteredRegionList: RegionItem[];
  filteredAreaList: AreaItem[];
  canEditField: (fieldName: string) => boolean;
  handleEmirateChange: (value: number, form: FormInstance) => void;
  handleRegionChange: (value: number, form: FormInstance) => void;
  displayName: (item: LocalizedNameSource | undefined) => string;
}

const AddressSection: React.FC<AddressSectionProps> = ({
  form,
  emirateList,
  filteredRegionList,
  filteredAreaList,
  canEditField,
  handleEmirateChange,
  handleRegionChange,
  displayName,
}) => {
  const { t } = useTranslation();
  const addressEmirate = Form.useWatch("addressEmirate", form);
  const addressRegion = Form.useWatch("addressRegion", form);
  const hasSelectedEmirate =
    addressEmirate !== undefined &&
    addressEmirate !== null &&
    addressEmirate !== "";
  const hasSelectedRegion =
    addressRegion !== undefined &&
    addressRegion !== null &&
    addressRegion !== "";
  const regionDisabled = !canEditField("addressRegion") || !hasSelectedEmirate;
  const areaDisabled =
    !canEditField("addressArea") || !hasSelectedEmirate || !hasSelectedRegion;

  // This form's handler also wants the form instance; the shared picker only passes the
  // matched id, so bind it here.
  const handleEmirateMatched = useCallback(
    (emirateId: number) => handleEmirateChange(emirateId, form),
    [handleEmirateChange, form],
  );

  return (
    <div className="profile-section">
      <h2 className="section-title">
        {t("establishmentProfile.sections.addressInformation")}
      </h2>
      <div className="form-grid">
        <Form.Item
          name="addressEmirate"
          label={t("establishmentProfile.fields.emirate")}
          rules={[
            {
              required: true,
              message: t("establishmentProfile.validation.selectEmirate"),
            },
          ]}
          className="form-item"
        >
          <Select
            placeholder={t("formPlaceholders.common.selectEmirate")}
            disabled={!canEditField("addressEmirate")}
            onChange={(value: number) => handleEmirateChange(value, form)}
            showSearch
            optionFilterProp="children"
          >
            {emirateList.map((emirate) => (
              <Option key={emirate.id} value={emirate.id}>
                {displayName(emirate)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="addressRegion"
          label={t("establishmentProfile.fields.region")}
          rules={[
            {
              required: true,
              message: t("establishmentProfile.validation.selectRegion"),
            },
          ]}
          className="form-item"
        >
          <Select
            placeholder={t("formPlaceholders.common.selectRegion")}
            disabled={regionDisabled}
            onChange={(value: number) => handleRegionChange(value, form)}
            showSearch
            optionFilterProp="children"
          >
            {filteredRegionList.map((region) => (
              <Option key={region.id} value={region.id}>
                {displayName(region)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="addressArea"
          label={t("establishmentProfile.fields.area")}
          rules={[
            {
              required: true,
              message: t("establishmentProfile.validation.selectArea"),
            },
          ]}
          className="form-item"
        >
          <Select
            placeholder={t("formPlaceholders.common.selectArea")}
            disabled={areaDisabled}
            showSearch
            optionFilterProp="children"
          >
            {filteredAreaList.map((area) => (
              <Option key={area.id} value={area.id}>
                {displayName(area)}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="street"
          label={t("establishmentProfile.fields.street")}
          rules={[
            {
              required: true,
              message: t("establishmentProfile.validation.enterStreetAddress"),
            },
          ]}
          className="form-item"
        >
          <Input.TextArea
            placeholder={t("formPlaceholders.common.enterStreet")}
            maxLength={200}
            disabled={!canEditField("street")}
          />
        </Form.Item>
      </div>

      <AddressMapPicker
        form={form}
        emirateList={emirateList}
        fieldNames={MAP_FIELD_NAMES}
        interactive={canEditField("street")}
        onEmirateMatched={handleEmirateMatched}
        hint={t("establishmentProfile.fields.mapHint")}
      />
    </div>
  );
};

export default AddressSection;
