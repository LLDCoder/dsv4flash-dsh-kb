import type { FC } from "react";
import Safety from "@/assets/images/Safety.svg";
import Vector from "@/assets/images/Vector.svg";
import { useTranslation } from "react-i18next";


const PayGateway:FC = () => {
  const { t } = useTranslation();

  return <div className="pay-gateway">
    <div className="_introduce">
      <div className="_img">
        <img src={Safety} alt="" />
      </div>
      <div>
        <div className="_label">{t("payments.paymentMethodSelection.secureTitle")}</div>
        <div className="_conent">{t("payments.paymentMethodSelection.secureDesc")}</div>
      </div>
    </div>
    <div className="lock">
      <img src={Vector} alt="" />
      {t("payments.paymentMethodSelection.ssl")}
    </div>
  </div>
}

export default PayGateway;
