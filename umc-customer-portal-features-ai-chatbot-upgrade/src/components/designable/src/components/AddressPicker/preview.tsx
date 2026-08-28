import React from "react";
import { useTranslation } from "react-i18next";
import { Select, Input } from "antd";
import AddressPickerComponent from "./AddressPicker";
import { createBehavior, createResource } from "@designable/core";
import { useDesigner } from "@designable/react";
import type { DnFC } from "@designable/react";
import { AllLocales } from "../../locales";
import "./preview.less";

const Wrapper: DnFC<React.ComponentProps<any>> = (props) => {
  const { t } = useTranslation();
  const designer = useDesigner();
  if (designer) {
    return (
      <div className="address-picker-preview">
        <div className="grid-container">
          <div className="field-wrapper">
            <div className="field-label">
              <span className="label-text">{t("AddressPicker.label.emirate")} </span>
              <span className="required-mark">*</span>
            </div>
            <Select
              placeholder={t("AddressPicker.placeholder.emirate")}
              className="field-select"
            />
          </div>
          <div className="field-wrapper">
            <div className="field-label">
              <span className="label-text">{t("AddressPicker.label.region")} </span>
              <span className="required-mark">*</span>
            </div>
            <Select
              placeholder={t("AddressPicker.placeholder.region")}
              className="field-select"
            />
          </div>
          <div className="field-wrapper">
            <div className="field-label">
              <span className="label-text">{t("AddressPicker.label.area")} </span>
              <span className="required-mark">*</span>
            </div>
            <Select
              placeholder={t("AddressPicker.placeholder.area")}
              className="field-select"
            />
          </div>
          <div className="field-wrapper">
            <div className="field-label">
              <span className="label-text">{t("AddressPicker.label.street")} </span>
              <span className="required-mark">*</span>
            </div>
            <Input.TextArea
              placeholder={t("AddressPicker.placeholder.street")}
              className="field-textarea"
              rows={4}
            />
          </div>
        </div>
      </div>
    );
  }
  return <AddressPickerComponent {...props} />;
};

export const AddressPicker: DnFC<React.ComponentProps<any>> =
  Wrapper as unknown as DnFC<React.ComponentProps<any>>;

AddressPicker.Behavior = createBehavior({
  name: "AddressPicker",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "AddressPicker",
  designerProps: {
    propsSchema: {
      type: "object",
      properties: {
        "field-group": {
          type: "void",
          "x-component": "CollapseItem",
          properties: {
            "x-display": {
              type: "string",
              "x-decorator": "FormItem",
              "x-component": "StringSwitchSetter",
              default: "visible",
              "x-component-props": {
                checkedValue: "visible",
                unCheckedValue: "none",
              },
            },
            "x-pattern": {
              type: "string",
              "x-decorator": "FormItem",
              "x-component": "StringSwitchSetter",
              default: "editable",
              "x-component-props": {
                checkedValue: "editable",
                unCheckedValue: "disabled",
              },
            },
          },
        },
      },
    },
  },
  designerLocales: (AllLocales as any).AddressPicker,
});

AddressPicker.Resource = createResource({
  title: { "en-US": "AddressPicker" },
  icon: "FontColorsOutlined",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "addressPicker",
        "x-decorator": "FormItem",
        "x-component": "AddressPicker",
      },
    },
  ],
});
