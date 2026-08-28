import { useTranslation } from "react-i18next";
import type { DetailTabKey } from "../utils/types";

const DetailTabs = ({
  activeKey,
  onChange,
}: {
  activeKey: DetailTabKey;
  onChange: (key: DetailTabKey) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="violations-fines-detail-tabs">
      <button
        className={`violations-fines-detail-tabs__button${activeKey === "decision" ? " is-active" : ""}`}
        type="button"
        onClick={() => onChange("decision")}
      >
        {t("violationsFinesPage.tabs.decision")}
      </button>
      <button
        className={`violations-fines-detail-tabs__button${activeKey === "reported" ? " is-active" : ""}`}
        type="button"
        onClick={() => onChange("reported")}
      >
        {t("violationsFinesPage.tabs.reported")}
      </button>
    </div>
  );
};

export default DetailTabs;
