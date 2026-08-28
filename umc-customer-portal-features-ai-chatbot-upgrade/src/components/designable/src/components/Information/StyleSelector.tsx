import React from "react";
import { useForm } from "@formily/react";
import "./StyleSelector.less";

export interface StyleSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
}

const StyleSelector: React.FC<StyleSelectorProps> = (props) => {
  const { value, onChange, defaultValue = "warning" } = props;
  const form = useForm();

  const current = value ?? defaultValue ?? "warning";

  const handleSelect = (val: "warning" | "reminder") => {
    if (onChange) {
      onChange(val);
    }

    const nextTextMap = {
      warning: "<p>This is a warning.</p>",
      reminder: "<p>This is a reminder.</p>",
    };

    form?.setValuesIn?.("x-component-props.text", nextTextMap[val]);
  };

  return (
    <div className="style-selector">
      <div
        className={`style-option style-warning ${
          current === "warning" ? "active" : ""
        }`}
        onClick={() => handleSelect("warning")}
      >
        <span className="style-icon">!</span>
        <span className="style-text">This is a warning.</span>
      </div>

      <div
        className={`style-option style-reminder ${
          current === "reminder" ? "active" : ""
        }`}
        onClick={() => handleSelect("reminder")}
      >
        <span className="style-icon">!</span>
        <span className="style-text">This is a reminder.</span>
      </div>
    </div>
  );
};

export default StyleSelector;
