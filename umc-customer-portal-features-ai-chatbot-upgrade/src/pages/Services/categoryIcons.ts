import SelectIcon1 from "@/assets/images/service-category-icons/SelectIcon1.svg";
import SelectIcon2 from "@/assets/images/service-category-icons/SelectIcon2.svg";
import SelectIcon3 from "@/assets/images/service-category-icons/SelectIcon3.svg";
import SelectIcon4 from "@/assets/images/service-category-icons/SelectIcon4.svg";
import SelectIcon5 from "@/assets/images/service-category-icons/SelectIcon5.svg";
import SelectIcon6 from "@/assets/images/service-category-icons/SelectIcon6.svg";
import SelectIcon7 from "@/assets/images/service-category-icons/SelectIcon7.svg";
import SelectIcon8 from "@/assets/images/service-category-icons/SelectIcon8.svg";
import SelectIcon9 from "@/assets/images/service-category-icons/SelectIcon9.svg";
import SelectIcon10 from "@/assets/images/service-category-icons/SelectIcon10.svg";
import SelectIcon11 from "@/assets/images/service-category-icons/SelectIcon11.svg";
import SelectIcon12 from "@/assets/images/service-category-icons/SelectIcon12.svg";
import SelectIcon13 from "@/assets/images/service-category-icons/SelectIcon13.svg";
import SelectIcon14 from "@/assets/images/service-category-icons/SelectIcon14.svg";
import SelectIcon15 from "@/assets/images/service-category-icons/SelectIcon15.svg";
import SelectIcon16 from "@/assets/images/service-category-icons/SelectIcon16.svg";
import SelectIcon17 from "@/assets/images/service-category-icons/SelectIcon17.svg";
import SelectIcon18 from "@/assets/images/service-category-icons/SelectIcon18.svg";
import SelectIcon19 from "@/assets/images/service-category-icons/SelectIcon19.svg";
import SelectIcon20 from "@/assets/images/service-category-icons/SelectIcon20.svg";
import SelectIcon21 from "@/assets/images/service-category-icons/SelectIcon21.svg";
import SelectIcon22 from "@/assets/images/service-category-icons/SelectIcon22.svg";
import SelectIcon23 from "@/assets/images/service-category-icons/SelectIcon23.svg";
import SelectIcon24 from "@/assets/images/service-category-icons/SelectIcon24.svg";

export const serviceCategoryIconMap = {
  icon1: SelectIcon1,
  icon2: SelectIcon2,
  icon3: SelectIcon3,
  icon4: SelectIcon4,
  icon5: SelectIcon5,
  icon6: SelectIcon6,
  icon7: SelectIcon7,
  icon8: SelectIcon8,
  icon9: SelectIcon9,
  icon10: SelectIcon10,
  icon11: SelectIcon11,
  icon12: SelectIcon12,
  icon13: SelectIcon13,
  icon14: SelectIcon14,
  icon15: SelectIcon15,
  icon16: SelectIcon16,
  icon17: SelectIcon17,
  icon18: SelectIcon18,
  icon19: SelectIcon19,
  icon20: SelectIcon20,
  icon21: SelectIcon21,
  icon22: SelectIcon22,
  icon23: SelectIcon23,
  icon24: SelectIcon24,
} as const;

export type ServiceCategoryIconUri = keyof typeof serviceCategoryIconMap;

export const getServiceCategoryIconSrc = (iconUri?: string | null) =>
  iconUri && iconUri in serviceCategoryIconMap
    ? serviceCategoryIconMap[iconUri as ServiceCategoryIconUri]
    : undefined;
