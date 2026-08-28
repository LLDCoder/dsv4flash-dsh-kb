import React, { type CSSProperties, type ReactNode } from "react";
import { Button } from "antd";
import "./index.less";

export interface CustomButtonProps extends Omit<any, "icon"> {
  text?: string;
  icon?: ReactNode | string;
  iconPosition?: "left" | "right";
  customStyle?: CSSProperties;
  customClassName?: string;
  iconStyle?: CSSProperties;
  iconClassName?: string;
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "text"
    | "gold"
    | "danger"
    | "danger-outline";
  size?: "large" | "medium" | "small";
  children?: ReactNode;
  loading?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  text,
  icon,
  iconPosition = "left",
  customStyle,
  customClassName = "",
  iconStyle,
  iconClassName = "",
  variant = "primary",
  size = "large",
  loading,
  children,
  onClick,
  ...restProps
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!loading) {
      onClick?.(e);
    }
  };
  const renderIcon = () => {
    if (!icon) return null;

    if (typeof icon === "string") {
      return (
        <img
          src={icon}
          alt="icon"
          className={`custom-button-icon ${iconClassName}`}
          style={iconStyle}
        />
      );
    }

    return (
      <span className={`custom-button-icon ${iconClassName}`} style={iconStyle}>
        {icon}
      </span>
    );
  };

  const getVariantClassName = () => {
    switch (variant) {
      case "primary":
        return "custom-button-primary";
      case "secondary":
        return "custom-button-secondary";
      case "outline":
        return "custom-button-outline";
      case "text":
        return "custom-button-text";
      case "gold":
        return "custom-button-gold";
      case "danger":
        return "custom-button-danger";
      case "danger-outline":
        return "custom-button-danger-outline";
      default:
        return "";
    }
  };

  const getSizeClassName = () => {
    switch (size) {
      case "large":
        return "custom-button-large";
      case "medium":
        return "custom-button-medium";
      case "small":
        return "custom-button-small";
      default:
        return "custom-button-large";
    }
  };

  const buttonContent = iconPosition ? (
    <div className="custom-button-contentWithIcon">
      {iconPosition === "left" && renderIcon()}
      {text || children}
      {iconPosition === "right" && renderIcon()}
    </div>
  ) : (
    <div className="custom-button-content">{text || children}</div>
  );

  return (
    <Button
      {...restProps}
      loading={loading}
      onClick={handleClick}
      className={`custom-button ${getVariantClassName()} ${getSizeClassName()} ${customClassName}`}
      style={customStyle}
    >
      {buttonContent}
    </Button>
  );
};

export default CustomButton;
