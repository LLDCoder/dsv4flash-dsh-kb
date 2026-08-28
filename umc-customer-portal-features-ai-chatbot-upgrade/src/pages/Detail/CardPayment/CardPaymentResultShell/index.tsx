import React from "react";
import "./index.less";

interface CardPaymentResultShellProps {
  children: React.ReactNode;
  className?: string;
}

const CardPaymentResultShell: React.FC<CardPaymentResultShellProps> = ({
  children,
  className = "",
}) => {
  return <div className={`card-payment-result-shell ${className}`}>{children}</div>;
};

export default CardPaymentResultShell;
