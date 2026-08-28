import React, { useCallback } from "react";
import { Switch } from "antd";
import type { RestrictionSetterValue } from "../../utils/dateRestriction";
import "./index.less";

export type { RestrictionSetterValue } from "../../utils/dateRestriction";

export interface RestrictionSetterProps {
  value?: RestrictionSetterValue;
  onChange?: (value: RestrictionSetterValue) => void;
}

const RestrictionSetter: React.FC<RestrictionSetterProps> = ({
  value,
  onChange,
}) => {
  const beforeToday = value?.beforeToday ?? false;
  const afterToday = value?.afterToday ?? false;

  const handleBeforeChange = useCallback(
    (checked: boolean) => {
      onChange?.({
        beforeToday: checked,
        afterToday: checked ? false : value?.afterToday ?? false,
        includeToday: value?.includeToday ?? false,
        tenDaysFromToday: checked
          ? false
          : value?.tenDaysFromToday ?? false,
      });
    },
    [onChange, value],
  );

  const handleAfterChange = useCallback(
    (checked: boolean) => {
      onChange?.({
        beforeToday: checked ? false : value?.beforeToday ?? false,
        afterToday: checked,
        includeToday: value?.includeToday ?? false,
        tenDaysFromToday: checked
          ? false
          : value?.tenDaysFromToday ?? false,
      });
    },
    [onChange, value],
  );

  return (
    <div className="restriction-setter">
      <div className="restriction-setter__row">
        <span className="restriction-setter__label">Before Today</span>
        <Switch checked={beforeToday} onChange={handleBeforeChange} size="small" />
      </div>
      <div className="restriction-setter__row">
        <span className="restriction-setter__label">After Today</span>
        <Switch checked={afterToday} onChange={handleAfterChange} size="small" />
      </div>
    </div>
  );
};

export default RestrictionSetter;
