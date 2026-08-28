import SummaryDocumentIcon from "@/assets/images/wenjian.svg";
import SummaryTimeIcon from "@/assets/images/shijian.svg";
import SummaryDateIcon from "@/assets/images/riqi.svg";
import FigmaAppealSummaryDateIcon from "../assets/icons/figma-appeal-summary-date.svg";
import FigmaAppealSummaryFileIcon from "../assets/icons/figma-appeal-summary-file.svg";

const renderSummaryIcon = (src: string) => (
  <img
    alt=""
    aria-hidden="true"
    className="violations-fines-summary-card__icon-image"
    src={src}
  />
);

export const SUMMARY_ICON_MAP = {
  violationNumber: renderSummaryIcon(SummaryDocumentIcon),
  violationType: renderSummaryIcon(SummaryDocumentIcon),
  status: renderSummaryIcon(SummaryTimeIcon),
  issuedTime: renderSummaryIcon(SummaryDateIcon),
  appealNumber: renderSummaryIcon(FigmaAppealSummaryFileIcon),
  appealStatus: renderSummaryIcon(FigmaAppealSummaryFileIcon),
  submissionDate: renderSummaryIcon(FigmaAppealSummaryDateIcon),
};
