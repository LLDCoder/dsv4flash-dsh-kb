import type { NationalityInfo } from "@/services/userProfile";
import {
  mapIcpPersonToIndividualFormFields,
  type IcpPersonProfileWithAddresses,
} from "@/pages/PersonalProfile/utils/icpPersonToForm";
import type { VerificationMethod } from "@/utils/individualIdentity";

export interface PartnerIcpFormMapping {
  values: Record<string, unknown>;
  readonlyFieldNames: string[];
}

/** Maps ICP person profile into Partner modal form values (unified field names). */
export function mapIcpPersonToPartnerModalForm(
  personProfile: IcpPersonProfileWithAddresses,
  verificationMethod: VerificationMethod,
  nationalityList: NationalityInfo[],
): PartnerIcpFormMapping {
  const { values, readonlyFieldNames } = mapIcpPersonToIndividualFormFields(
    personProfile,
    verificationMethod,
    nationalityList,
    { isAddMode: true },
  );

  return {
    values,
    readonlyFieldNames: [...new Set(readonlyFieldNames)],
  };
}
