import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  observer,
  useField,
  useFieldSchema,
  RecursionField,
} from "@formily/react";
import "./styles.less";
import "@/components/common/FormliyView/index.less";
import { Card as AntdCard } from "antd";
import { MultiSelectDropdown, type OptionItem } from "@/components/common";
import AlertBanner from "@/components/common/AlertBanner";
import {
  getEconomicActivitys,
  getEconomicActivityByMoe,
} from "@/services/services";
import type { LifecycleActivityItem } from "@/services/myRequest";
import { useServicesStore } from "@/store/services";
import { useTranslation } from "react-i18next";
import {
  resolveApiEntityLabel,
  resolveTableActivityLabel,
} from "@/utils/bilingualDisplay";
import FieldDecoratorTooltip from "@/components/designable/src/components/FormItemWithHtmlTooltip/FieldDecoratorTooltip";
import { resolveI18nPlaceholder } from "@/utils/i18nPlaceholder";
import { normalizeFeeAmount } from "@/utils/activityFee";
import { shouldShowService903ExternalApprovalWarning } from "./service903ExternalApprovalWarning";

const EMPTY_TABLE_ROWS: unknown[] = [];
const EMPTY_SELECTED_KEYS: string[] = [];

type SelectTableFieldValue = {
  selectedKey?: unknown;
  prefilledSelectedKey?: unknown;
  tableData?: unknown[];
  [key: string]: unknown;
};

type ActivitySelectionPolicy = {
  allowRemovePrefilled: boolean;
  allowAddOtherOptions: boolean;
};

type LifecycleActivityConfig = {
  selectionMode?: "renew-final" | "modify-final" | "retained" | string;
  selectedActivityIds?: string[];
  existingActivities?: LifecycleActivityItem[];
  replaceServiceOptions?: boolean;
};

const SERVICE_CODE_MEDIA_ACTIVITY_UPDATE_SCOPE = "903";
const SERVICE_CODE_MEDIA_ACTIVITY_LICENSE = "901";
const SERVICE_CODE_BROADCAST_ACTIVITY_CANCELLATION = "806";
const SERVICE_CODE_MEDIA_ACTIVITY_CANCELLATION = "904";
const SERVICE_CODE_NEWSPAPER_MAGAZINE_CANCELLATION = "1202";
const SERVICE_CODE_ESTABLISHMENT_PERMIT_CANCELLATION = "80042";
const SERVICE_CODE_CINEMATIC_FILM_SCREENING = "1002";
const SERVICE_903_INITIALIZED_FLAG = "__service903Initialized";
const SERVICE_903_EXCLUDED_SELECTED_KEY = "__service903ExcludedSelectedKey";
const SERVICE_904_INITIALIZED_FLAG = "__service904Initialized";

function normalizeSelectedKeys(rawValue: unknown): string[] {
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => String(item))
      .filter((item) => item.trim().length > 0);
  }

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return [];
  }

  const normalized = String(rawValue).trim();
  return normalized ? [normalized] : [];
}

function mergeSelectedKeys(
  baseValues: string[],
  selectedValues: string[],
): string[] {
  const merged = [...baseValues];

  for (const value of selectedValues) {
    if (!merged.includes(value)) {
      merged.push(value);
    }
  }

  return merged;
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function normalizeBooleanValue(
  value: unknown,
  fallbackValue: boolean,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return fallbackValue;
}

function resolveActivitySelectionPolicy(rawProps: Record<string, unknown>) {
  const rawPolicy =
    rawProps.activitySelectionPolicy &&
    typeof rawProps.activitySelectionPolicy === "object" &&
    !Array.isArray(rawProps.activitySelectionPolicy)
      ? (rawProps.activitySelectionPolicy as Record<string, unknown>)
      : {};

  return {
    allowRemovePrefilled: normalizeBooleanValue(
      rawPolicy.allowRemovePrefilled ?? rawProps.allowRemovePrefilled,
      true,
    ),
    allowAddOtherOptions: normalizeBooleanValue(
      rawPolicy.allowAddOtherOptions ?? rawProps.allowAddOtherOptions,
      true,
    ),
  } satisfies ActivitySelectionPolicy;
}

function applyActivitySelectionPolicy(
  selectedValues: string[],
  prefilledValues: string[],
  policy: ActivitySelectionPolicy,
): string[] {
  let nextValues = selectedValues;

  if (!policy.allowAddOtherOptions) {
    const prefilledValueSet = new Set(prefilledValues);
    nextValues = nextValues.filter((value) => prefilledValueSet.has(value));
  }

  if (!policy.allowRemovePrefilled) {
    nextValues = mergeSelectedKeys(prefilledValues, nextValues);
  }

  return nextValues;
}

function tableDataRowsToOptions(
  rows: unknown[],
  defaultCategoryLabel: string,
  isAr: boolean,
): OptionItem[] {
  if (!Array.isArray(rows)) return [];

  const out: OptionItem[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const rawId = record.Id ?? record.id;
    if (rawId === undefined || rawId === null) continue;

    const idStr = String(rawId);
    const activityLabel = resolveTableActivityLabel(isAr, record);
    const label =
      activityLabel ||
      String(record.Activity ?? record.ActivityEn ?? record.activity ?? idStr);

    out.push({
      id: idStr,
      value: idStr,
      label,
      category: String(record.category ?? defaultCategoryLabel),
      price:
        record.money !== undefined && record.money !== null
          ? Number(record.money)
          : undefined,
    });
  }

  return out;
}

function serviceOptionsToDropdownOptions(
  serviceOptions: any[],
  isAr: boolean,
): OptionItem[] {
  const flat: OptionItem[] = [];

  (serviceOptions || []).forEach((parent: any) => {
    if (!parent?.childData?.length) {
      flat.push({
        id: String(parent.id ?? parent.key ?? parent.value),
        label: resolveApiEntityLabel(isAr, parent),
        value: String(parent.id ?? parent.key ?? parent.value),
        nameAr: parent.nameAr,
        nameEn: parent.nameEn,
        price: normalizeFeeAmount(parent.fee),
        category: resolveApiEntityLabel(isAr, parent),
        hasHierarchy: false,
      });
      return;
    }

    parent.childData.forEach((child: any) => {
      flat.push({
        id: String(child.id ?? child.key ?? child.value),
        label: resolveApiEntityLabel(isAr, child),
        value: String(child.id ?? child.value),
        price: normalizeFeeAmount(child.fee),
        category: resolveApiEntityLabel(isAr, parent),
        nameAr: child.nameAr,
        nameEn: child.nameEn,
        hasHierarchy: true,
      });
    });
  });

  return flat;
}

function lifecycleActivitiesToDropdownOptions(
  activities: LifecycleActivityItem[],
): OptionItem[] {
  return (activities || []).map((activity) => ({
    id: String(activity.id),
    value: String(activity.id),
    label: activity.nameEn || String(activity.id),
    category: "Activities",
    price: 0,
    hasHierarchy: false,
    nameAr: activity.nameAr,
    nameEn: activity.nameEn,
  }));
}

export const SelectTableField: React.FC<any> = observer((props) => {
  const field = useField<any>();
  const servicesStore = useServicesStore();
  const schema = useFieldSchema();
  const onOptionsLoadedRef = useRef<any>();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");

  const {
    requiredMessage: requiredMessageProp,
    onOptionsLoaded,
    onTotalFee,
    serviceCode,
    activityLabelName,
    establishmentId,
    activityLabelNameEn,
    activityLabelNameAr,
    placeholderEn,
    placeholderAr,
    placeholderKey,
    placeholderParams,
    activityTitleEn,
    activityTitleAr,
    activityTitle: activityTitleProp,
    cardTitle: legacyCardTitleProp,
    title: legacyTitleProp,
    activitySelectionPolicy,
    allowRemovePrefilled,
    allowAddOtherOptions,
    ...restSelectProps
  } = props;
  const [optionsArr, setOptionsArr] = useState<OptionItem[]>([]);
  const normalizedServiceCode = String(serviceCode ?? "");
  const isService901 =
    normalizedServiceCode === SERVICE_CODE_MEDIA_ACTIVITY_LICENSE;
  const isService903 =
    normalizedServiceCode === SERVICE_CODE_MEDIA_ACTIVITY_UPDATE_SCOPE;
  const isActivitySelectionRequired = !isService903;
  const isService806 =
    normalizedServiceCode === SERVICE_CODE_BROADCAST_ACTIVITY_CANCELLATION;
  const isService80042 =
    normalizedServiceCode === SERVICE_CODE_ESTABLISHMENT_PERMIT_CANCELLATION;
  const isService904 =
    normalizedServiceCode === SERVICE_CODE_MEDIA_ACTIVITY_CANCELLATION;
  const isService1202 =
    normalizedServiceCode === SERVICE_CODE_NEWSPAPER_MAGAZINE_CANCELLATION;
  const isService1002 =
    normalizedServiceCode === SERVICE_CODE_CINEMATIC_FILM_SCREENING;
  const isCancellationSelectionService =
    isService806 || isService904 || isService1202 || isService80042;
  const lifecycleActivityConfig =
    props?.lifecycleActivityConfig &&
    typeof props.lifecycleActivityConfig === "object" &&
    !Array.isArray(props.lifecycleActivityConfig)
      ? (props.lifecycleActivityConfig as LifecycleActivityConfig)
      : null;
  const lifecycleSelectionMode = String(
    lifecycleActivityConfig?.selectionMode || "",
  );
  const lifecycleExistingOptions = useMemo(
    () =>
      lifecycleActivitiesToDropdownOptions(
        Array.isArray(lifecycleActivityConfig?.existingActivities)
          ? lifecycleActivityConfig.existingActivities
          : [],
      ),
    [lifecycleActivityConfig?.existingActivities],
  );
  const shouldReplaceServiceOptionsWithLifecycle =
    lifecycleActivityConfig?.replaceServiceOptions === true;
  const resolvedOptionsArr = shouldReplaceServiceOptionsWithLifecycle
    ? lifecycleExistingOptions
    : optionsArr;

  useEffect(() => {
    onOptionsLoadedRef.current = onOptionsLoaded;
  }, [onOptionsLoaded]);

  const fieldRef = useRef(field);
  fieldRef.current = field;

  const resolvedRequiredMessage =
    requiredMessageProp ?? t("SelectTable.requiredMessage");

  const resolvedActivityTitle = useMemo(() => {
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    if (isAr && typeof activityTitleAr === "string" && activityTitleAr.trim()) {
      return activityTitleAr;
    }
    if (
      !isAr &&
      typeof activityTitleEn === "string" &&
      activityTitleEn.trim()
    ) {
      return activityTitleEn;
    }

    const fromProps =
      (typeof activityTitleProp === "string" && activityTitleProp
        ? activityTitleProp
        : typeof legacyCardTitleProp === "string" && legacyCardTitleProp
        ? legacyCardTitleProp
        : typeof legacyTitleProp === "string" && legacyTitleProp
        ? legacyTitleProp
        : "") || "";

    if (isAr) {
      return t("SelectTable.defaultActivityTitle");
    }

    return fromProps || t("SelectTable.defaultActivityTitle");
  }, [
    activityTitleAr,
    activityTitleEn,
    activityTitleProp,
    i18n.language,
    legacyCardTitleProp,
    legacyTitleProp,
    t,
  ]);

  const resolvedActivityLabelName = useMemo(() => {
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    if (
      isAr &&
      typeof activityLabelNameAr === "string" &&
      activityLabelNameAr.trim()
    ) {
      return activityLabelNameAr;
    }
    if (
      !isAr &&
      typeof activityLabelNameEn === "string" &&
      activityLabelNameEn.trim()
    ) {
      return activityLabelNameEn;
    }
    if (isAr) {
      return t("SelectTable.defaultActivityLabelName");
    }
    return activityLabelName ?? t("SelectTable.defaultActivityLabelName");
  }, [
    activityLabelName,
    activityLabelNameAr,
    activityLabelNameEn,
    i18n.language,
    t,
  ]);

  const resolvedPlaceholder = useMemo(() => {
    return resolveI18nPlaceholder({
      isAr,
      i18n,
      t,
      placeholder: restSelectProps.placeholder,
      placeholderEn,
      placeholderAr,
      placeholderKey,
      placeholderParams,
      defaultPlaceholder: t("SelectTable.defaultPlaceholder"),
    });
  }, [
    i18n,
    isAr,
    placeholderAr,
    placeholderEn,
    placeholderKey,
    placeholderParams,
    restSelectProps.placeholder,
    t,
  ]);

  const buildTableData = (
    values: string[],
    optionList: OptionItem[],
  ): unknown[] => {
    const optionMap = new Map<string, OptionItem>();
    optionList.forEach((option) => {
      optionMap.set(String(option.value), option);
    });

    return values
      .map((value) => optionMap.get(String(value)))
      .filter(Boolean)
      .map((option, idx) => ({
        Number: idx + 1,
        Activity: option!.label,
        money: option!.price,
        Id: option!.id,
        ActivityAr: option!.nameAr,
        ActivityEn: option!.nameEn,
      }));
  };

  useEffect(() => {
    if (shouldReplaceServiceOptionsWithLifecycle) {
      return;
    }

    const servicesCode = servicesStore.userInfo?.servicesCode;
    if (servicesCode === null || servicesCode === undefined) {
      return;
    }

    const code = String(servicesCode);
    let cancelled = false;
    const isAr = Boolean(i18n.language?.startsWith("ar"));

    const applyServiceOptions = (serviceOptions: any[]) => {
      if (typeof onOptionsLoadedRef.current === "function") {
        onOptionsLoadedRef.current(serviceOptions);
      }

      try {
        const currentField = fieldRef.current as any;
        if (currentField?.componentProps?.options !== serviceOptions) {
          currentField?.setComponentProps?.({
            ...(currentField.componentProps || {}),
            options: serviceOptions,
          });
        }
      } catch (error) {
        console.error("update SelectTable schema options failed:", error);
      }

      setOptionsArr(serviceOptionsToDropdownOptions(serviceOptions, isAr));
    };

    const applyDefaultSelections = (
      serviceOptions: any[],
      defaultSelectedOptions: any[],
    ) => {
      const currentValue = (field.value || {}) as SelectTableFieldValue;
      const currentSelectedKey = normalizeSelectedKeys(
        currentValue.selectedKey,
      );
      if (currentSelectedKey.length > 0) {
        return;
      }

      const availableOptions = serviceOptionsToDropdownOptions(
        serviceOptions,
        isAr,
      );
      const defaultOptions = serviceOptionsToDropdownOptions(
        defaultSelectedOptions,
        isAr,
      );

      const mergedMap = new Map<string, OptionItem>();
      availableOptions.forEach((option) => {
        mergedMap.set(String(option.value), option);
      });
      defaultOptions.forEach((option) => {
        const key = String(option.value);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, option);
        }
      });

      const defaultValues = defaultOptions.map((option) =>
        String(option.value),
      );
      if (defaultValues.length === 0) {
        return;
      }

      field.setValue({
        ...currentValue,
        prefilledSelectedKey: defaultValues,
        selectedKey: defaultValues,
        tableData: buildTableData(
          defaultValues,
          Array.from(mergedMap.values()),
        ),
      });
    };

    const loadActivities = async () => {
      try {
        if (code === "901" && establishmentId) {
          const [allActivitiesRes, selectedActivitiesRes] = await Promise.all([
            getEconomicActivitys(code),
            getEconomicActivityByMoe(establishmentId),
          ]);

          if (cancelled) {
            return;
          }

          const serviceOptions = Array.isArray(allActivitiesRes?.data)
            ? allActivitiesRes.data
            : [];
          const defaultSelectedOptions = Array.isArray(
            selectedActivitiesRes?.data,
          )
            ? selectedActivitiesRes.data
            : [];

          applyServiceOptions(serviceOptions);
          applyDefaultSelections(serviceOptions, defaultSelectedOptions);
          return;
        }

        const res = await getEconomicActivitys(code);
        if (cancelled) {
          return;
        }

        const serviceOptions = Array.isArray(res?.data) ? res.data : [];
        applyServiceOptions(serviceOptions);

        if (code === SERVICE_CODE_CINEMATIC_FILM_SCREENING) {
          applyDefaultSelections(serviceOptions, serviceOptions);
        }
      } catch (error) {
        console.error("[SelectTable] getServiceSelectTable failed:", error);
      }
    };

    loadActivities();

    return () => {
      cancelled = true;
    };
  }, [
    establishmentId,
    i18n.language,
    servicesStore.userInfo?.servicesCode,
    shouldReplaceServiceOptionsWithLifecycle,
  ]);

  const fieldValue = useMemo(
    () => (field.value || {}) as SelectTableFieldValue,
    [field.value],
  );

  const prefilledSelectedKey = useMemo(
    () => normalizeSelectedKeys(fieldValue.prefilledSelectedKey),
    [fieldValue.prefilledSelectedKey],
  );

  const isDisabled =
    isService1202 ||
    isService1002 ||
    (isService901 && prefilledSelectedKey.length > 0) ||
    !!restSelectProps?.disabled ||
    props?.disabled ||
    field.pattern === "disabled";

  const selectionPolicy = useMemo(() => {
    if (lifecycleSelectionMode === "modify-final") {
      return {
        allowRemovePrefilled: false,
        allowAddOtherOptions: true,
      } satisfies ActivitySelectionPolicy;
    }

    if (
      lifecycleSelectionMode === "renew-final" ||
      lifecycleSelectionMode === "retained"
    ) {
      return {
        allowRemovePrefilled: true,
        allowAddOtherOptions: false,
      } satisfies ActivitySelectionPolicy;
    }

    if (isService903) {
      return {
        allowRemovePrefilled: false,
        allowAddOtherOptions: true,
      } satisfies ActivitySelectionPolicy;
    }

    if (isCancellationSelectionService) {
      return {
        allowRemovePrefilled: true,
        allowAddOtherOptions: false,
      } satisfies ActivitySelectionPolicy;
    }

    return resolveActivitySelectionPolicy({
      activitySelectionPolicy,
      allowRemovePrefilled,
      allowAddOtherOptions,
    });
  }, [
    activitySelectionPolicy,
    allowAddOtherOptions,
    allowRemovePrefilled,
    isService903,
    isCancellationSelectionService,
    lifecycleSelectionMode,
  ]);

  const rawSelectedKey = useMemo(
    () => normalizeSelectedKeys(fieldValue.selectedKey),
    [fieldValue.selectedKey],
  );
  const service903LegacyPrefilledSelectedKey = useMemo(
    () => normalizeSelectedKeys(fieldValue[SERVICE_903_EXCLUDED_SELECTED_KEY]),
    [fieldValue],
  );

  const fallbackPrefilledSelectedKey = useMemo(() => {
    if (!isCancellationSelectionService) {
      return EMPTY_SELECTED_KEYS;
    }

    const fromTableData = tableDataRowsToOptions(
      Array.isArray(fieldValue.tableData)
        ? fieldValue.tableData
        : EMPTY_TABLE_ROWS,
      t("SelectTable.defaultOptionCategory"),
      Boolean(i18n.language?.startsWith("ar")),
    ).map((option) => String(option.value));

    return rawSelectedKey.length > 0 ? rawSelectedKey : fromTableData;
  }, [
    fieldValue.tableData,
    i18n.language,
    isCancellationSelectionService,
    rawSelectedKey,
    t,
  ]);

  const resolvedPrefilledSelectedKey = useMemo(() => {
    if (isCancellationSelectionService) {
      return mergeSelectedKeys(
        prefilledSelectedKey,
        fallbackPrefilledSelectedKey,
      );
    }

    if (prefilledSelectedKey.length > 0) {
      return prefilledSelectedKey;
    }

    if (isService903 && service903LegacyPrefilledSelectedKey.length > 0) {
      return service903LegacyPrefilledSelectedKey;
    }

    if (
      !isService903 &&
      (!selectionPolicy.allowRemovePrefilled ||
        !selectionPolicy.allowAddOtherOptions)
    ) {
      return rawSelectedKey;
    }

    return EMPTY_SELECTED_KEYS;
  }, [
    prefilledSelectedKey,
    isService903,
    service903LegacyPrefilledSelectedKey,
    rawSelectedKey,
    isCancellationSelectionService,
    fallbackPrefilledSelectedKey,
    selectionPolicy.allowAddOtherOptions,
    selectionPolicy.allowRemovePrefilled,
  ]);

  const selectedKey = useMemo(
    () =>
      applyActivitySelectionPolicy(
        rawSelectedKey,
        resolvedPrefilledSelectedKey,
        selectionPolicy,
      ),
    [rawSelectedKey, resolvedPrefilledSelectedKey, selectionPolicy],
  );

  const lockedSelectedKey = useMemo(
    () =>
      selectionPolicy.allowRemovePrefilled
        ? EMPTY_SELECTED_KEYS
        : resolvedPrefilledSelectedKey,
    [resolvedPrefilledSelectedKey, selectionPolicy.allowRemovePrefilled],
  );

  const tableData = Array.isArray(fieldValue.tableData)
    ? fieldValue.tableData
    : EMPTY_TABLE_ROWS;

  useEffect(() => {
    if (!isService903) {
      return;
    }

    const isInitialized = Boolean(
      (fieldValue as Record<string, unknown>)[SERVICE_903_INITIALIZED_FLAG],
    );
    const initialPrefilledSelectedKey = isInitialized
      ? prefilledSelectedKey.length > 0
        ? prefilledSelectedKey
        : service903LegacyPrefilledSelectedKey.length > 0
        ? service903LegacyPrefilledSelectedKey
        : rawSelectedKey.length > 0
        ? rawSelectedKey
        : tableDataRowsToOptions(
            tableData,
            t("SelectTable.defaultOptionCategory"),
            Boolean(i18n.language?.startsWith("ar")),
          ).map((option) => String(option.value))
      : prefilledSelectedKey.length > 0
      ? prefilledSelectedKey
      : rawSelectedKey.length > 0
      ? rawSelectedKey
      : service903LegacyPrefilledSelectedKey.length > 0
      ? service903LegacyPrefilledSelectedKey
      : tableDataRowsToOptions(
          tableData,
          t("SelectTable.defaultOptionCategory"),
          Boolean(i18n.language?.startsWith("ar")),
        ).map((option) => String(option.value));

    if (
      isInitialized &&
      areStringArraysEqual(prefilledSelectedKey, initialPrefilledSelectedKey)
    ) {
      return;
    }

    field.setValue({
      ...fieldValue,
      [SERVICE_903_INITIALIZED_FLAG]: true,
      ...(initialPrefilledSelectedKey.length > 0
        ? {
            prefilledSelectedKey: initialPrefilledSelectedKey,
          }
        : {}),
    });
  }, [
    field,
    fieldValue,
    i18n.language,
    isService903,
    prefilledSelectedKey,
    rawSelectedKey,
    service903LegacyPrefilledSelectedKey,
    t,
    tableData,
  ]);

  useEffect(() => {
    if (!isCancellationSelectionService) {
      return;
    }

    if (isDisabled) {
      return;
    }

    if ((fieldValue as Record<string, unknown>)[SERVICE_904_INITIALIZED_FLAG]) {
      return;
    }

    if (resolvedPrefilledSelectedKey.length === 0) {
      return;
    }

    field.setValue({
      ...fieldValue,
      [SERVICE_904_INITIALIZED_FLAG]: true,
      prefilledSelectedKey: resolvedPrefilledSelectedKey,
      selectedKey: EMPTY_SELECTED_KEYS,
      tableData: EMPTY_TABLE_ROWS,
    });
  }, [
    field,
    fieldValue,
    isDisabled,
    isCancellationSelectionService,
    resolvedPrefilledSelectedKey,
  ]);

  const dropdownOptions = useMemo(() => {
    const isAr = Boolean(i18n.language?.startsWith("ar"));
    const fromTable = tableDataRowsToOptions(
      tableData,
      t("SelectTable.defaultOptionCategory"),
      isAr,
    );
    const optionMap = new Map<string, OptionItem>();

    resolvedOptionsArr.forEach((option) =>
      optionMap.set(String(option.value), option),
    );
    fromTable.forEach((option) => {
      const key = String(option.value);
      if (!optionMap.has(key)) {
        optionMap.set(key, option);
      }
    });

    return Array.from(optionMap.values());
  }, [i18n.language, resolvedOptionsArr, tableData, t]);

  const visibleDropdownOptions = useMemo(() => {
    if (selectionPolicy.allowAddOtherOptions) {
      return dropdownOptions;
    }

    const prefilledValueSet = new Set(resolvedPrefilledSelectedKey);
    return dropdownOptions.filter((option) =>
      prefilledValueSet.has(String(option.value)),
    );
  }, [
    dropdownOptions,
    resolvedPrefilledSelectedKey,
    selectionPolicy.allowAddOtherOptions,
  ]);

  const totalFee = useMemo(() => {
    if (!Array.isArray(tableData)) return 0;
    return tableData.reduce((sum, row) => {
      const price = Number(row?.money ?? 0);
      return sum + (Number.isNaN(price) ? 0 : price);
    }, 0);
  }, [tableData]);

  useEffect(() => {
    if (typeof onTotalFee === "function") {
      onTotalFee(totalFee);
    }
  }, [onTotalFee, totalFee]);

  const buildFieldValue = useMemo(
    () =>
      (
        currentValue: SelectTableFieldValue,
        nextSelectedKey: string[],
        nextPrefilledSelectedKey = normalizeSelectedKeys(
          currentValue.prefilledSelectedKey,
        ),
        optionList = dropdownOptions,
      ) => {
        const normalizedPrefilledSelectedKey = normalizeSelectedKeys(
          nextPrefilledSelectedKey,
        );
        const normalizedSelectedKey = applyActivitySelectionPolicy(
          nextSelectedKey,
          normalizedPrefilledSelectedKey,
          selectionPolicy,
        );

        return {
          ...currentValue,
          prefilledSelectedKey: normalizedPrefilledSelectedKey,
          selectedKey: normalizedSelectedKey,
          tableData: buildTableData(normalizedSelectedKey, optionList),
        };
      },
    [dropdownOptions, selectionPolicy],
  );

  useEffect(() => {
    if (areStringArraysEqual(selectedKey, rawSelectedKey)) {
      return;
    }

    field.setValue(
      buildFieldValue(fieldValue, rawSelectedKey, resolvedPrefilledSelectedKey),
    );
  }, [
    buildFieldValue,
    field,
    fieldValue,
    rawSelectedKey,
    resolvedPrefilledSelectedKey,
    selectedKey,
  ]);

  useEffect(() => {
    if (isService903) {
      return;
    }

    if (
      selectionPolicy.allowRemovePrefilled &&
      selectionPolicy.allowAddOtherOptions
    ) {
      return;
    }

    if (prefilledSelectedKey.length > 0 || rawSelectedKey.length === 0) {
      return;
    }

    field.setValue(buildFieldValue(fieldValue, rawSelectedKey, rawSelectedKey));
  }, [
    buildFieldValue,
    field,
    fieldValue,
    isService903,
    prefilledSelectedKey,
    rawSelectedKey,
    selectionPolicy.allowAddOtherOptions,
    selectionPolicy.allowRemovePrefilled,
  ]);

  const requiredValidator = useMemo(() => {
    return (value: any) => {
      const normalizedSelected = applyActivitySelectionPolicy(
        normalizeSelectedKeys(value?.selectedKey),
        resolvedPrefilledSelectedKey,
        selectionPolicy,
      );
      const tableRows = Array.isArray(value?.tableData) ? value.tableData : [];
      return normalizedSelected.length > 0 || tableRows.length > 0
        ? ""
        : resolvedRequiredMessage;
    };
  }, [resolvedPrefilledSelectedKey, resolvedRequiredMessage, selectionPolicy]);

  useEffect(() => {
    field.required = isActivitySelectionRequired;
    field.setValidator(
      isActivitySelectionRequired ? requiredValidator : undefined,
    );
    if (!isActivitySelectionRequired) {
      field.setFeedback({ type: "error", code: "ValidateError", messages: [] });
    }
    (field as any).decoratorProps = {
      ...(field as any).decoratorProps,
      feedbackLayout: "none",
    };
  }, [field, isActivitySelectionRequired, requiredValidator]);

  const handleSelectChange = (values: string[]) => {
    if (isDisabled) return;
    const currentValue = (field.value || {}) as SelectTableFieldValue;
    field.setValue(buildFieldValue(currentValue, values || []));
  };

  const showFullCancellationAlert =
    isCancellationSelectionService &&
    selectedKey.length > 0 &&
    resolvedPrefilledSelectedKey.length > 0 &&
    selectedKey.length === resolvedPrefilledSelectedKey.length;
  const showService903ExternalApprovalAlert =
    isService903 &&
    shouldShowService903ExternalApprovalWarning(
      selectedKey,
      resolvedPrefilledSelectedKey,
    );

  const selectTableContent = (
    <>
      <div className="formtitle">
        {resolvedActivityLabelName}
        {isActivitySelectionRequired ? (
          <span style={{ color: "#EA4F49", marginLeft: 4 }}>*</span>
        ) : null}
        <FieldDecoratorTooltip
          fallbackContent={
            typeof props.description === "string" ? props.description : null
          }
          placement="top"
        />
      </div>

      <MultiSelectDropdown
        required={isActivitySelectionRequired}
        placeholder={resolvedPlaceholder}
        value={selectedKey}
        onChange={handleSelectChange}
        options={visibleDropdownOptions}
        lockedValues={lockedSelectedKey}
        hiddenSelectedValues={
          isService903 ? resolvedPrefilledSelectedKey : EMPTY_SELECTED_KEYS
        }
        disabled={isDisabled}
        showSelectAll={isCancellationSelectionService}
      />

      {showFullCancellationAlert ? (
        <div style={{ marginTop: 12 }}>
          <AlertBanner
            type="warning"
            content={t(
              "SelectTable.activityConfigurationSetter.fullCancellationWarning",
            )}
          />
        </div>
      ) : null}

      {showService903ExternalApprovalAlert ? (
        <div style={{ marginTop: 12 }}>
          <AlertBanner
            type="warning"
            content={t(
              "SelectTable.activityConfigurationSetter.externalApprovalWarning",
            )}
          />
        </div>
      ) : null}

      {!!(field as any)?.selfErrors?.length && (
        <div style={{ marginTop: 6, color: "#EA4F49", fontSize: 12 }}>
          {(field as any).selfErrors?.[0]}
        </div>
      )}
    </>
  );

  return (
    <div className="dn-select-table">
      <AntdCard
        className="Media_Activity_Card Formliy-AntCard"
        title={
          <span data-content-editable="x-component-props.activityTitle">
            {resolvedActivityTitle}
          </span>
        }
      >
        {selectTableContent}
      </AntdCard>

      {schema?.properties && Object.keys(schema.properties).length > 0 && (
        <div className="select-table-custom-container">
          {Object.keys(schema.properties).map((key) => (
            <RecursionField
              key={key}
              name={key}
              schema={schema.properties[key]}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default SelectTableField;
