import { useCallback, useEffect, useState } from "react";
import type { FormInstance } from "antd/lib/form";
import {
  getNationalityList,
  type NationalityInfo,
} from "@/services/userProfile";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import { OCR_STEP } from "../../../constants";
import type {
  OcrDocumentType,
  OcrResolvedResult,
  OcrStep,
} from "../../../type";
import type { OcrNationalityOption, OcrResultFormValues } from "../type";

interface PassportNationalityLoadState {
  result: OcrResolvedResult;
  status: "loading" | "success" | "failed";
  data: NationalityInfo[] | null;
}

interface UsePassportOcrNationalityOptions {
  visible: boolean;
  documentType: OcrDocumentType;
  step: OcrStep;
  result: OcrResolvedResult | null;
  fallbackNationalityList: NationalityInfo[];
  isAr: boolean;
  form: FormInstance<OcrResultFormValues>;
}

const findNationalityById = (
  nationalities: NationalityInfo[],
  nationalityId: unknown,
) => {
  const normalizedNationalityId = String(nationalityId ?? "").trim();

  if (!normalizedNationalityId) {
    return undefined;
  }

  return nationalities.find(
    (nationality) => String(nationality.id) === normalizedNationalityId,
  );
};

export function usePassportOcrNationality({
  visible,
  documentType,
  step,
  result,
  fallbackNationalityList,
  isAr,
  form,
}: UsePassportOcrNationalityOptions) {
  const [passportNationalityLoad, setPassportNationalityLoad] =
    useState<PassportNationalityLoadState | null>(null);
  const shouldLoadPassportNationalities =
    visible &&
    documentType === "passport" &&
    step === OCR_STEP.RESULT &&
    !!result;
  const currentPassportNationalityLoad =
    passportNationalityLoad?.result === result
      ? passportNationalityLoad
      : null;
  const resultNationalityList =
    currentPassportNationalityLoad?.status === "success"
      ? currentPassportNationalityLoad.data
      : null;
  const nationalityLoading =
    shouldLoadPassportNationalities &&
    currentPassportNationalityLoad?.status !== "success" &&
    currentPassportNationalityLoad?.status !== "failed";

  useEffect(() => {
    if (!shouldLoadPassportNationalities || !result) {
      setPassportNationalityLoad(null);
      return undefined;
    }

    let cancelled = false;
    setPassportNationalityLoad({
      result,
      status: "loading",
      data: null,
    });

    const loadNationalityList = async () => {
      try {
        const response = await getNationalityList();

        if (cancelled) {
          return;
        }

        setPassportNationalityLoad({
          result,
          status: "success",
          data: Array.isArray(response?.data) ? response.data : [],
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load OCR nationality list:", error);
          setPassportNationalityLoad({
            result,
            status: "failed",
            data: null,
          });
        }
      }
    };

    void loadNationalityList();

    return () => {
      cancelled = true;
    };
  }, [result, shouldLoadPassportNationalities]);

  useEffect(() => {
    if (documentType !== "passport" || !result || !resultNationalityList) {
      return;
    }

    const matchedNationality = findNationalityById(
      resultNationalityList,
      result.payload.nationalityId,
    );

    if (matchedNationality) {
      form.setFieldsValue({ nationalityId: matchedNationality.id });
    }
  }, [documentType, form, result, resultNationalityList]);

  const displayedNationalityList =
    documentType === "passport" && resultNationalityList !== null
      ? resultNationalityList
      : fallbackNationalityList;
  const nationalityOptions: OcrNationalityOption[] = displayedNationalityList.map(
    (item) => ({
      value: item.id,
      label: preferLocalizedEnAr(isAr, item.nameEn, item.nameAr) || String(item.id),
    }),
  );
  const getVerifiedNationalityId = useCallback(
    (nationalityId: unknown) =>
      findNationalityById(
        resultNationalityList ?? fallbackNationalityList,
        nationalityId,
      )?.id,
    [fallbackNationalityList, resultNationalityList],
  );

  return {
    nationalityOptions,
    nationalityLoading,
    getVerifiedNationalityId,
  };
}
