import React from "react";
import "./index.less";

export interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export interface CustomStepTabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export interface StepTabsHeaderProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export interface StepTabsContentProps {
  items: TabItem[];
  activeKey: string;
}

// 
export const StepTabsHeader: React.FC<StepTabsHeaderProps> = ({
  items,
  activeKey,
  onChange,
}) => {
  return (
    <div className="step-tabs-header">
      {items.map((item, index) => {
        const isActive = item.key === activeKey;
        const isCompleted = parseInt(item.key) < parseInt(activeKey);

        return (
          <div
            key={item.key}
            className={`step-tab-item ${isActive ? "active" : ""} ${
              isCompleted ? "completed" : ""
            }`}
            onClick={() => onChange(item.key)}
          >
            <div className="step-icon">{item.icon}</div>
            <div className="step-label">{item.label}</div>
            {isActive && <div className="step-indicator" />}
          </div>
        );
      })}
    </div>
  );
};

// 
export const StepTabsContent: React.FC<StepTabsContentProps> = ({
  items,
  activeKey,
}) => {
  return (
    <div className="step-tabs-content">
      {items.map((item) => (
        <div
          key={item.key}
          className={`step-content ${item.key === activeKey ? "active" : ""}`}
        >
          {item.children}
        </div>
      ))}
    </div>
  );
};

// （）
const CustomStepTabs: React.FC<CustomStepTabsProps> = ({
  items,
  activeKey,
  onChange,
}) => {
  return (
    <div className="custom-step-tabs">
      <StepTabsHeader items={items} activeKey={activeKey} onChange={onChange} />
      <StepTabsContent items={items} activeKey={activeKey} />
    </div>
  );
};

export default CustomStepTabs;
