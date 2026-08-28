interface PartnerSectionValidityParams {
  partnerSectionVisible: boolean;
  partnersLength: number;
  licenseOwnerRulesApply: boolean;
  ownerCount: number;
  licenseOwnerMaxCount: number;
}

export const isPartnerSectionValid = ({
  partnerSectionVisible,
  partnersLength,
  licenseOwnerRulesApply,
  ownerCount,
  licenseOwnerMaxCount,
}: PartnerSectionValidityParams): boolean => {
  if (!partnerSectionVisible) return true;
  if (partnersLength < 1) return false;
  if (!licenseOwnerRulesApply) return true;
  return ownerCount >= 1 && ownerCount <= licenseOwnerMaxCount;
};
