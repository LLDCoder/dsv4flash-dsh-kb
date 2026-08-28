import type { ReactNode } from "react";
import dangerIcon from "@/assets/images/service-entry-gate-danger.svg";
import infoIcon from "@/assets/images/service-entry-gate-info.svg";
import type { ServiceEntryGateDialogTone } from "./types";

export const renderGateDialogIcon = (
  tone: ServiceEntryGateDialogTone = "warning",
): ReactNode => {
  switch (tone) {
    case "danger":
      return <img src={dangerIcon} alt="" aria-hidden="true" />;
    case "success":
      return <img src={infoIcon} alt="" aria-hidden="true" />;
    case "info":
      return <img src={infoIcon} alt="" aria-hidden="true" />;
    case "warning":
      return <img src={infoIcon} alt="" aria-hidden="true" />;
    default:
      return <img src={infoIcon} alt="" aria-hidden="true" />;
  }
};
