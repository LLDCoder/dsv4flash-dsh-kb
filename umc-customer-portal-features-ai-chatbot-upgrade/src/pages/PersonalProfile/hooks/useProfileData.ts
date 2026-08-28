import { useState } from "react";
import type { FormInstance } from "antd/lib/form";
import {
  getUserIndividual,
  updateUserProfileIndividual,
} from "@/services/userProfile";
import {
  normalizeVerificationMethod,
  personalProfileApiToFormValues,
} from "@/utils/individualIdentity";
import type { VerificationMethod } from "@/utils/individualIdentity";
import { buildAddressUpdateParams } from "../utils/profileFormUtils";

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const normalized = Number(value);
  return Number.isNaN(normalized) ? undefined : normalized;
}

export interface ProfileData {
  profileData: any;
  setProfileData: (data: any) => void;
  loadingProfile: boolean;
  profileLoadFinished: boolean;
  profileLoadSucceeded: boolean;
  loadUserProfile: (
    userId: string,
    opts: {
      setVerificationMethod: (v: VerificationMethod) => void;
      setSelectedEmirateId: (id: number | undefined) => void;
      setSelectedRegionId: (id: number | undefined) => void;
    }
  ) => Promise<void>;
  handleSaveAddress: (
    setIsEditingAddress: (v: boolean) => void
  ) => Promise<void>;
}

export function useProfileData(form: FormInstance): ProfileData {
  const [profileData, setProfileData] = useState<any>({});
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileLoadFinished, setProfileLoadFinished] = useState(false);
  const [profileLoadSucceeded, setProfileLoadSucceeded] = useState(false);

  const loadUserProfile = async (
    userId: string,
    opts: {
      setVerificationMethod: (v: VerificationMethod) => void;
      setSelectedEmirateId: (id: number | undefined) => void;
      setSelectedRegionId: (id: number | undefined) => void;
    }
  ) => {
    if (!userId) {
      setProfileLoadSucceeded(false);
      setProfileLoadFinished(true);
      return;
    }
    setProfileLoadSucceeded(false);
    setProfileLoadFinished(false);
    try {
      setLoadingProfile(true);
      const response = await getUserIndividual(userId);

      if (response.data) {
        const data = response.data;
        const mobileCountryCode = String(
          data.mobileCountryCode ?? "",
        ).trim();
        const legacyMobileNumber = String(data.mobileNumber ?? "");
        setProfileData(data);
        opts.setVerificationMethod(normalizeVerificationMethod(data.type));

        form.setFieldsValue({
          ...personalProfileApiToFormValues(data),
          mobileNumber: {
            mobileCountryCode,
            mobileLocalNumber: data.mobileLocalNumber
              ? String(data.mobileLocalNumber).trim()
              : legacyMobileNumber,
            mobileFullNumber: legacyMobileNumber,
          },
        });

        const emirateId = normalizeOptionalNumber(data?.emirateId);
        const regionId = normalizeOptionalNumber(data?.regionId);

        if (emirateId !== undefined) opts.setSelectedEmirateId(emirateId);
        if (regionId !== undefined) opts.setSelectedRegionId(regionId);
        setProfileLoadSucceeded(true);
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
    } finally {
      setLoadingProfile(false);
      setProfileLoadFinished(true);
    }
  };

  const handleSaveAddress = async (setIsEditingAddress: (v: boolean) => void) => {
    try {
      // The coordinate fields must be listed explicitly: validateFields returns only
      // the names it is given, so leaving them out would hand the builder undefined
      // coordinates and clear the saved pin on every address edit.
      const values = await form.validateFields([
        "addressEmirate",
        "addressRegion",
        "addressArea",
        "addressStreet",
        "addressLatitude",
        "addressLongitude",
      ]);
      await updateUserProfileIndividual(
        buildAddressUpdateParams(profileData, values),
      );
      setIsEditingAddress(false);
    } catch (error) {
      console.error("Address save failed:", error);
    }
  };

  return {
    profileData,
    setProfileData,
    loadingProfile,
    profileLoadFinished,
    profileLoadSucceeded,
    loadUserProfile,
    handleSaveAddress,
  };
}
