import { useTranslation } from "react-i18next";
import type { ModuleTabKey } from "../utils/types";

const ModuleTabs = ({
  activeKey,
  onChange,
}: {
  activeKey: ModuleTabKey;
  onChange: (key: ModuleTabKey) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="violations-fines-module-tabs">
      <button
        className={`violations-fines-module-tabs__button${activeKey === "violations" ? " is-active" : ""}`}
        onClick={() => onChange("violations")}
        type="button"
      >
        {t("violationsFinesPage.tabs.violations")}
      </button>
      <button
        className={`violations-fines-module-tabs__button${activeKey === "appeals" ? " is-active" : ""}`}
        onClick={() => onChange("appeals")}
        type="button"
      >
        {t("violationsFinesPage.tabs.appeals")}
      </button>
    </div>
  );
};

export default ModuleTabs;
