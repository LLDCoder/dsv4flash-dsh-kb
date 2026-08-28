import * as React from "react";
import "./index.less";

export interface FieldWidthSetterProps {
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
}

const FieldWidthSetter: React.FC<FieldWidthSetterProps> = (props) => {
  const { value, onChange, defaultValue = "100%" } = props;

  const current = value ?? defaultValue;

  const handleSelect = (val: string) => {
    if (onChange) {
      onChange(val);
    }
  };

  return (
    <div className="field-width-setter">
      <div
        className={`width-option ${current === "100%" ? "active" : ""}`}
        onClick={() => handleSelect("100%")}
      >
        <span className="width-text">Full Line</span>
      </div>

      <div
        className={`width-option ${current === "50%" ? "active" : ""}`}
        onClick={() => handleSelect("50%")}
      >
        <span className="width-text">1/2</span>
      </div>
    </div>
  );
};

export default FieldWidthSetter;

