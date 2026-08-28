export interface ServiceUserTypeMapping {
  id?: string | number | null;
  code?: string | number | null;
}

interface ResolveDefaultServiceUserTypeCodesOptions {
  currentUserTypeId?: string | number | null;
  isGlobalProfile: boolean;
  userTypes: ServiceUserTypeMapping[];
}

export const resolveDefaultServiceUserTypeCodes = (
  options: ResolveDefaultServiceUserTypeCodesOptions,
): string[] => {
  if (options.isGlobalProfile) {
    return [];
  }

  const currentUserTypeId = String(options.currentUserTypeId ?? "").trim();
  if (!currentUserTypeId) {
    return [];
  }

  const currentUserType = options.userTypes.find(
    (userType) => String(userType.id ?? "").trim() === currentUserTypeId,
  );
  const currentUserTypeCode = String(currentUserType?.code ?? "").trim();

  return currentUserTypeCode ? [currentUserTypeCode] : [];
};
