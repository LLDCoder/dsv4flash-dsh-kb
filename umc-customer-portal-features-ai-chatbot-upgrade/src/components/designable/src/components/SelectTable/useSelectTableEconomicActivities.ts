import { useEffect, useRef, useState } from "react";
import type { OptionItem } from "@/components/common";
import {
  getEconomicActivitys,
  getEconomicActivityByMoe,
} from "@/services/services";
import { normalizeFeeAmount } from "@/utils/activityFee";

const MOE_PRESELECT_SERVICE_CODE = "901";

type ActivityFieldLike = {
  value?: Record<string, unknown> | null;
  setValue: (value: Record<string, unknown>) => void;
  setComponentProps?: (props: Record<string, unknown>) => void;
  componentProps?: Record<string, unknown>;
};

/** Map GetEconomicActivitys / GetEconomicActivityByMoe tree payload to flat dropdown options. */
export function flattenEconomicActivityParents(
  serviceOptions: unknown[],
): OptionItem[] {
  const flat: OptionItem[] = [];
  for (const raw of serviceOptions || []) {
    const parent = raw as Record<string, unknown>;
    const childData = parent.childData as unknown[] | undefined;
    if (!childData?.length) {
      flat.push({
        id: String(parent.id ?? parent.key ?? parent.value),
        label: String(parent.nameEn ?? parent.value ?? ""),
        value: String(parent.id ?? parent.key ?? parent.value),
        nameAr: parent.nameAr as string | undefined,
        nameEn: parent.nameEn as string | undefined,
        price: normalizeFeeAmount(parent.fee),
        category: String(parent.nameEn ?? parent.value ?? ""),
        hasHierarchy: false,
      });
    } else {
      for (const childRaw of childData) {
        const child = childRaw as Record<string, unknown>;
        flat.push({
          id: String(child.id ?? child.key ?? child.value ?? ""),
          label: String(child.nameEn ?? child.value ?? ""),
          value: String(child.id ?? child.value ?? ""),
          price: normalizeFeeAmount(child.fee),
          category: String(parent.nameEn ?? parent.value ?? ""),
          nameAr: child.nameAr as string | undefined,
          nameEn: child.nameEn as string | undefined,
          hasHierarchy: true,
        });
      }
    }
  }
  return flat;
}

export type UseSelectTableEconomicActivitiesParams = {
  serviceCode: string | number | null | undefined;
  establishmentId?: string | number;
  field: ActivityFieldLike;
  buildTableData: (values: string[], optionList: OptionItem[]) => unknown[];
  onOptionsLoaded?: (serviceOptions: unknown) => void;
};

/**
 * Loads economic activity trees for SelectTable: full list from GetEconomicActivitys;
 * for service 901 with EstablishmentId, also loads MOE selection and pre-fills the field when appropriate.
 */
export function useSelectTableEconomicActivities(
  params: UseSelectTableEconomicActivitiesParams,
): OptionItem[] {
  const { serviceCode, establishmentId, field, buildTableData, onOptionsLoaded } =
    params;

  const [optionsArr, setOptionsArr] = useState<OptionItem[]>([]);
  const onOptionsLoadedRef = useRef(onOptionsLoaded);
  const fieldRef = useRef(field);
  const buildTableDataRef = useRef(buildTableData);
  const prevEstablishmentIdRef = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    onOptionsLoadedRef.current = onOptionsLoaded;
  }, [onOptionsLoaded]);

  fieldRef.current = field;
  buildTableDataRef.current = buildTableData;

  useEffect(() => {
    if (serviceCode === null || serviceCode === undefined) {
      return;
    }
    const code = String(serviceCode);

    const applyLoadedActivities = (
      serviceOptions: unknown[],
      moePayload: unknown[] | null | undefined,
    ) => {
      const fieldModel = fieldRef.current;
      if (typeof onOptionsLoadedRef.current === "function") {
        onOptionsLoadedRef.current(serviceOptions);
      }

      try {
        if (fieldModel.componentProps?.options !== serviceOptions) {
          fieldModel.setComponentProps?.({
            ...(fieldModel.componentProps || {}),
            options: serviceOptions,
          });
        }
      } catch (e) {
        console.error("update SelectTable schema options failed:", e);
      }

      const flat = flattenEconomicActivityParents(serviceOptions || []);
      setOptionsArr(flat);

      if (code !== MOE_PRESELECT_SERVICE_CODE || !moePayload?.length) {
        return;
      }

      const moeFlat = flattenEconomicActivityParents(moePayload);
      const moeKeys = moeFlat.map((o) => String(o.value)).filter(Boolean);
      if (!moeKeys.length) return;

      const establishmentChanged =
        prevEstablishmentIdRef.current !== undefined &&
        prevEstablishmentIdRef.current !== establishmentId;
      prevEstablishmentIdRef.current = establishmentId;

      const current = (fieldModel.value || {}) as Record<string, unknown>;
      const sk = current.selectedKey;
      const selectedEmpty = !Array.isArray(sk) || sk.length === 0;

      if (!selectedEmpty && !establishmentChanged) {
        return;
      }

      const nextTable = buildTableDataRef.current(moeKeys, flat);
      fieldModel.setValue({
        ...current,
        selectedKey: moeKeys,
        tableData: nextTable,
      });
    };

    const onFetchError = (err: unknown) => {
      console.error("[SelectTable] economic activities fetch failed:", err);
    };

    if (code === MOE_PRESELECT_SERVICE_CODE && establishmentId) {
      Promise.all([
        getEconomicActivitys(code),
        getEconomicActivityByMoe(establishmentId),
      ])
        .then(([activitiesRes, moeRes]) => {
          const activitiesPayload = activitiesRes.data;
          const moePayload = moeRes.data;
          applyLoadedActivities(
            Array.isArray(activitiesPayload) ? activitiesPayload : [],
            Array.isArray(moePayload) ? moePayload : [],
          );
        })
        .catch(onFetchError);
    } else {
      getEconomicActivitys(code)
        .then((res) => {
          const activitiesPayload = res.data;
          applyLoadedActivities(
            Array.isArray(activitiesPayload) ? activitiesPayload : [],
            null,
          );
        })
        .catch(onFetchError);
    }
  }, [serviceCode, establishmentId]);

  return optionsArr;
}
