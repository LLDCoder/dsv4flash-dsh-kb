interface ServiceDeliveryTimeInput {
  isArabic: boolean;
  serviceDeliveryTimeEn: unknown;
  serviceDeliveryTimeAr: unknown;
}

export const resolveServiceDeliveryTime = ({
  isArabic,
  serviceDeliveryTimeEn,
  serviceDeliveryTimeAr,
}: ServiceDeliveryTimeInput) => {
  const value = isArabic ? serviceDeliveryTimeAr : serviceDeliveryTimeEn;
  return String(value ?? "").trim() || "-";
};
