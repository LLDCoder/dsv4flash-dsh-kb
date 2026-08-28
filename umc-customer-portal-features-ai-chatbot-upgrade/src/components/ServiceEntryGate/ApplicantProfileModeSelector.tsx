import { Radio } from "antd";
import type { ApplicantProfileModeOption } from "./types";
import "./service-entry-gate.less";
interface ApplicantProfileModeSelectorProps {
  title: string;
  description?: string;
  required?: boolean;
  value: "Individual" | "Establishment";
  options: ApplicantProfileModeOption[];
  onChange: (value: "Individual" | "Establishment") => void;
}

export default function ApplicantProfileModeSelector({
  title,
  description,
  required = false,
  value,
  options,
  onChange,
}: ApplicantProfileModeSelectorProps) {
  return (
    <div className="service-entry-gate-page-selector service-entry-gate-page-selector--field">
      <div className="service-entry-gate-page-selector__label-row">
        <span className="service-entry-gate-page-selector__title">{title}</span>
        {required ? (
          <span className="service-entry-gate-page-selector__required">*</span>
        ) : null}
      </div>
      {description ? (
        <span className="service-entry-gate-page-selector__description">
          {description}
        </span>
      ) : null}
      <Radio.Group
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="service-entry-gate-page-selector__radio-group"
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            className="service-entry-gate-page-selector__radio"
          >
            <span className="service-entry-gate-page-selector__radio-title">
              {option.label}
            </span>
          </Radio>
        ))}
      </Radio.Group>
    </div>
  );
}
