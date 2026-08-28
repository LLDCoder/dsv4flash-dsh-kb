import React from "react";
import { CloseOutlined } from "@ant-design/icons";
import "./index.less";
import WarningIcon from "@/assets/images/warning-fill.svg";
import ErrorIcon from "@/assets/images/error.svg";

export type AlertType = "warning" | "info" | "error" | "success";

export interface AlertBannerProps {
  content: React.ReactNode;
  type?: AlertType;
  closable?: boolean;
  onClose?: () => void;
  icon?: React.ReactNode;
  className?: string;
  visible?: boolean;
  style?: React.CSSProperties;
}

const AlertBanner: React.FC<AlertBannerProps> = ({
  content,
  type = "warning",
  closable = false,
  onClose,
  icon,
  className = "",
  visible = true,
  style,
}) => {
  const [show, setShow] = React.useState(visible);

  React.useEffect(() => {
    setShow(visible);
  }, [visible]);

  const handleClose = () => {
    setShow(false);
    onClose?.();
  };

  if (!show) {
    return null;
  }

  const defaultIcon =
    type === "error" ? (
      <img src={ErrorIcon} className="icon" />
    ) : (
      <img src={WarningIcon} className="icon" />
    );

  return (
    <div className={`alert-banner alert-banner-${type} ${className}`} style={style}>
      <div className="alert-banner-content">
        {icon !== undefined
          ? icon && <span className="alert-banner-icon">{icon}</span>
          : defaultIcon && (
              <span className="alert-banner-icon">{defaultIcon}</span>
            )}
        <span className="alert-banner-text">{content}</span>
      </div>
      {closable && (
        <CloseOutlined className="alert-banner-close" onClick={handleClose} />
      )}
    </div>
  );
};

export default AlertBanner;
