import type { TypeDictionary } from "@/services/userProfile";
import {
  commercialGroupSubTypeIds,
  commercialGroupSubTypeCodes,
  governmentEntitySubTypeIds,
  governmentEntitySubTypeCodes,
  governmentGroupSubTypeIds,
  governmentGroupSubTypeCodes,
  licenseOwnerApplicableSubTypeIds,
  licenseOwnerApplicableSubTypeCodes,
} from "./constants";

export const getSubTypeById = (
  subTypeId: number | string | undefined,
  subTypeList: TypeDictionary[],
) =>
  subTypeList.find(
    (item) => Number(item.id) === Number(subTypeId),
  );

export const isSubTypeInGroup = (
  subTypeId: number | string | undefined,
  subTypeList: TypeDictionary[],
  groupIds: Set<number>,
  groupCodes: Set<string>,
): boolean => {
  if (subTypeId === undefined || subTypeId === null || subTypeId === "") {
    return false;
  }
  if (groupIds.has(Number(subTypeId))) {
    return true;
  }
  const subType = getSubTypeById(subTypeId, subTypeList);
  return groupCodes.has(String(subType?.code ?? subTypeId));
};

export const isCommercialGroupSubType = (
  subTypeId: number | string | undefined,
  subTypeList: TypeDictionary[],
) =>
  isSubTypeInGroup(
    subTypeId,
    subTypeList,
    commercialGroupSubTypeIds,
    commercialGroupSubTypeCodes,
  );

/** Commercial, Free Zone, or Advertising/Talent Agency — license-owner UI and submit rules. */
export const isLicenseOwnerApplicableSubType = (
  subTypeId: number | string | undefined,
  subTypeList: TypeDictionary[],
) =>
  isSubTypeInGroup(
    subTypeId,
    subTypeList,
    licenseOwnerApplicableSubTypeIds,
    licenseOwnerApplicableSubTypeCodes,
  );

/** Only Government Entity requires a `.gov.ae` work email domain. */
export const isGovernmentEntitySubType = (
  subTypeId: number | string | undefined,
  subTypeList: TypeDictionary[],
): boolean => {
  if (
    isSubTypeInGroup(
      subTypeId,
      subTypeList,
      governmentEntitySubTypeIds,
      governmentEntitySubTypeCodes,
    )
  ) {
    return true;
  }
  const subType = getSubTypeById(subTypeId, subTypeList);
  const nameEn = subType?.nameEn ?? "";
  return /government entity/i.test(nameEn);
};

export const isGovernmentGroupSubType = (
  subTypeId: number | string | undefined,
  subTypeList: TypeDictionary[],
) =>
  isSubTypeInGroup(
    subTypeId,
    subTypeList,
    governmentGroupSubTypeIds,
    governmentGroupSubTypeCodes,
  );
