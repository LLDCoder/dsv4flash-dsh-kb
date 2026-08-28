interface MergePartnerManagementContextFormValuesOptions {
  currentFormValues: Record<string, unknown>;
  hasDraft: boolean;
  editablePartners: unknown[];
  initialPartnerIds: string[];
}

export const mergePartnerManagementContextFormValues = ({
  currentFormValues,
  hasDraft,
  editablePartners,
  initialPartnerIds,
}: MergePartnerManagementContextFormValuesOptions): Record<string, unknown> => {
  const nextFormValues = { ...currentFormValues };

  if (!hasDraft) {
    delete nextFormValues.pendingDeletePartnerList;
    delete nextFormValues.removedPartnerList;
  }

  return {
    ...nextFormValues,
    PartnerList: editablePartners,
    partnerManagementInitialPartnerIds: initialPartnerIds,
  };
};
