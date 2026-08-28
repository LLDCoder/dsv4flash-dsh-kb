import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ReviewProfileInfoCommon from "@/pages/MediaLicense/components/ReviewProfileInfoCommon";
import FormliyView from "@/components/common/FormliyView";
import type { PartnerItem } from "@/components/designable/src/components/PartnerList/PartnerListField";
import { resolveStepNameLabel } from "@/utils/bilingualDisplay";
import type { IdSelectorType } from "@/components/designable/src/components/IDSelector/idSelectorUtils";

interface FormilyReviewListProps {
  formilyList: FormilyListItem[];
  formilyData: FormilyDataItem[];
  onSelectTableOptionsChange?: (fee: number) => void;
  disabled?: boolean;
  isSelectable?: boolean;
  serviceCode?: number | string;
  defaultExpandFirst?: boolean;
  hideBookListStatusColumn?: boolean;
  bookStatusLookupHandledExternally?: boolean;
  service905OwnerPartners?: PartnerItem[];
  idSelectorRuntimeType?: IdSelectorType | null;
}

interface FormilyListItem {
  stepNameEn?: string;
  stepNameAr?: string;
}

type FormilyDataItem = Record<string, unknown>;

const FormilyReviewList = ({
  formilyList,
  formilyData,
  onSelectTableOptionsChange,
  disabled = true,
  isSelectable = true,
  serviceCode,
  defaultExpandFirst = false,
  hideBookListStatusColumn,
  bookStatusLookupHandledExternally,
  service905OwnerPartners,
  idSelectorRuntimeType,
}: FormilyReviewListProps) => {
  const { i18n, t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number[]>(
    defaultExpandFirst ? [0] : [99999],
  );
  const isAr = Boolean(i18n.language?.startsWith("ar"));

  useEffect(() => {
    if (!formilyList?.length) {
      return;
    }

    setExpandedIndex(defaultExpandFirst ? [0] : [99999]);
  }, [defaultExpandFirst, formilyList?.length]);

  const handleToggle = (index: number) => {
    setExpandedIndex((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  return (
    <>
      {formilyList &&
        formilyList.length > 0 &&
        formilyList.map((formData, index) => {
          const expanded = expandedIndex.includes(index);

          return (
            <ReviewProfileInfoCommon
              key={`review-section-${index}`}
              sectionTitle={resolveStepNameLabel(isAr, formData, t)}
              expanded={expanded}
              onToggle={() => handleToggle(index)}
              className={`FormilyReviewList${
                isSelectable ? "" : " FormilyReviewList--not-selectable"
              }`}
            >
              {expanded ? (
                <FormliyView
                  key={`form-step-${index}`}
                  formData={formilyData[index] || {}}
                  disabled={disabled}
                  onTotalFeeFloat={onSelectTableOptionsChange}
                  serviceCode={serviceCode}
                  hideBookListStatusColumn={hideBookListStatusColumn}
                  bookStatusLookupHandledExternally={
                    bookStatusLookupHandledExternally
                  }
                  service905OwnerPartners={service905OwnerPartners}
                  idSelectorRuntimeType={idSelectorRuntimeType}
                />
              ) : null}
            </ReviewProfileInfoCommon>
          );
        })}
    </>
  );
};

export default FormilyReviewList;
