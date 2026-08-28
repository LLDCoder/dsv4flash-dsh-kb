import { MultiSelectDropdown, type OptionItem } from "@/components/common";
import { useTranslation } from "react-i18next";
import "./MediaActivity.less";
interface MediaActivityProps {
  selectedActivities: string[];
  onActivitiesChange: (activities: string[]) => void;
  availableActivities: OptionItem[];
}

// const availableActivities: OptionItem[] = [
//   {
//     id: "1",
//     label: "Licensing of import and distribution of books",
//     value: "licensing-import-distribution-books",
//     price: 3500.0,
//     category: "Publishing, Books & Printing",
//   },
//   {
//     id: "2",
//     label: "Issuing License for selling books and publications",
//     value: "issuing-license-selling-books",
//     price: 1000.0,
//     category: "Publishing, Books & Printing",
//   },
//   {
//     id: "3",
//     label: "Issuing License for a publishing house",
//     value: "issuing-license-publishing-house",
//     price: 3500.0,
//     category: "Publishing, Books & Printing",
//   },
//   {
//     id: "4",
//     label: "Issuing License to establish a printing press",
//     value: "issuing-license-printing-press",
//     price: 25000.0,
//     category: "Publishing, Books & Printing",
//   },
//   {
//     id: "5",
//     label: "Issuing License to practice activities related to printing",
//     value: "issuing-license-printing-activities",
//     price: 10000.0,
//     category: "Publishing, Books & Printing",
//   },
//   {
//     id: "6",
//     label:
//       "Issuing License for distribution and publication of newspapers, magazines, and periodicals",
//     value: "issuing-license-newspapers-magazines",
//     price: 3500.0,
//     category: "Periodicals & Journalism",
//   },
//   {
//     id: "7",
//     label: "Issuing License for providing journalistic services",
//     value: "issuing-license-journalistic-services",
//     price: 1500.0,
//     category: "Periodicals & Journalism",
//   },
//   {
//     id: "8",
//     label: "Issuing License for producing video games",
//     value: "issuing-license-video-games",
//     price: 4000.0,
//     category: "Video Games",
//   },
// ];

export default function MediaActivity({
  selectedActivities,
  onActivitiesChange,
  availableActivities
}: MediaActivityProps) {
  const { t } = useTranslation();
  const handleChange = (values: string[]) => {
    onActivitiesChange(values);
  };
  return (
    <div className="media-activity-card">
      <div className="card-header">
        <h3 className="card-title">
          {t("mediaLicensePage.mediaActivitySection.title")}
        </h3>
      </div>

      <div className="card-content">
        <MultiSelectDropdown
          label={t("mediaLicensePage.mediaActivitySection.activities")}
          required
          placeholder={t("formPlaceholders.pages.mediaLicense.selectActivities")}
          value={selectedActivities}
          onChange={handleChange}
          options={availableActivities}
        />
      </div>
    </div>
  );
}
