// SelectTableField.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
  observer,
  useField,
  useForm,
  useFieldSchema,
  RecursionField,
} from "@formily/react";
import "./styles.less";
import "@/components/common/FormliyView/index.less";
import { Card as AntdCard } from "antd";
import { MultiSelectDropdown, type OptionItem } from "@/components/common";
import { getEconomicActivitys } from "@/services/services";

import { useServicesStore } from "@/store/services";
import { useTranslation } from "react-i18next";
import {
  resolveApiEntityLabel,
  resolveTableActivityLabel,
} from "@/utils/bilingualDisplay";
import FieldDecoratorTooltip from "@/components/designable/src/components/FormItemWithHtmlTooltip/FieldDecoratorTooltip";
import { resolveI18nPlaceholder } from "@/utils/i18nPlaceholder";
import { normalizeFeeAmount } from "@/utils/activityFee";

function normalizeOptionValue(...values: unknown[]): string | null {
  const rawValue = values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
  const normalized = rawValue === undefined ? "" : String(rawValue).trim();
  return normalized || null;
}

function mapServiceOptionsToFlatOptions(
  serviceOptions: any[] | undefined,
  isAr: boolean,
): OptionItem[] {
  const flat: OptionItem[] = [];
  (serviceOptions || []).forEach((parent: any) => {
    if (!parent?.childData?.length) {
      const value = normalizeOptionValue(parent.id, parent.key, parent.value);
      if (!value) return;

      flat.push({
        id: value,
        label: resolveApiEntityLabel(isAr, parent),
        value,
        nameAr: parent.nameAr,
        nameEn: parent.nameEn,
        price: normalizeFeeAmount(parent.fee),
        category: resolveApiEntityLabel(isAr, parent),
        hasHierarchy: false,
      });
    } else {
      parent.childData.forEach((child: any) => {
        const value = normalizeOptionValue(child.id, child.key, child.value);
        if (!value) return;

        flat.push({
          id: value,
          label: resolveApiEntityLabel(isAr, child),
          value,
          price: normalizeFeeAmount(child.fee),
          category: resolveApiEntityLabel(isAr, parent),
          nameAr: child.nameAr,
          nameEn: child.nameEn,
          hasHierarchy: true,
        });
      });
    }
  });
  return flat;
}

function normalizeSelectedKeys(rawValue: unknown): string[] {
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => normalizeOptionValue(item))
      .filter((item): item is string => Boolean(item));
  }

  const normalized = normalizeOptionValue(rawValue);
  return normalized ? [normalized] : [];
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

const SERVICE_CODE_BROADCAST_ACTIVITY_CANCELLATION = 806;
const SERVICE_CODE_NEWSPAPER_MAGAZINE_CANCELLATION = 1202;
const SERVICE_CODE_SOCIAL_MEDIA_COMMERCIAL_RENEWAL = 80022;
const SERVICE_CODE_SOCIAL_MEDIA_COMMERCIAL_CANCELLATION = 80042;
const SERVICE_CODE_CINEMATIC_FILM_SCREENING = 1002;

export const SelectTableField: React.FC<any> = observer((props) => {
  const field = useField<any>();
  const ServicesStore = useServicesStore();
  const schema = useFieldSchema();
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));

  useForm();
  const {
    options = [],
    tableTitle = "Service Fees",
    activityContainerName = "Activity Container Name",
    activityLabelName,
    activityLabelNameEn,
    activityLabelNameAr,
    activityTitleEn,
    activityTitleAr,
    placeholderEn,
    placeholderAr,
    placeholderKey,
    placeholderParams,

    tableSize = "small",
    tableBordered = true,
    tableProps = {},
    requiredMessage: requiredMessageProp,
    onOptionsLoaded,
    onTotalFee,
    multiple,
    maxSelectedCount,
    serviceCode,
    activityTitle: activityTitleProp,
    cardTitle: legacyCardTitleProp,
    title: legacyTitleProp,
    ...restSelectProps
  } = props;

  const resolvedRequiredMessage =
    requiredMessageProp ?? t("SelectTableSingle.requiredMessage");

  const resolvedActivityTitle = useMemo(() => {
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
      return t("SelectTableSingle.defaultActivityTitle");
    }

    return fromProps || t("SelectTableSingle.defaultActivityTitle");
  }, [
    activityTitleAr,
    activityTitleEn,
    activityTitleProp,
    isAr,
    legacyCardTitleProp,
    legacyTitleProp,
    t,
  ]);

  const resolvedActivityLabelName = useMemo(() => {
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
      return t("SelectTableSingle.defaultActivityLabelName");
    }
    return (
      activityLabelName ?? t("SelectTableSingle.defaultActivityLabelName")
    );
  }, [
    activityLabelName,
    activityLabelNameAr,
    activityLabelNameEn,
    isAr,
    t,
  ]);

  const resolvedPlaceholder = useMemo(() => {
    const placeholder = resolveI18nPlaceholder({
      isAr,
      i18n,
      t,
      placeholder: restSelectProps.placeholder,
      placeholderEn,
      placeholderAr,
      placeholderKey,
      placeholderParams,
      defaultPlaceholder: t("SelectTableSingle.defaultPlaceholder"),
    });

    return typeof placeholder === "string" ? placeholder : String(placeholder ?? "");
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
  // Flatten children into MultiSelectDropdown option list
  // const optionsArr: OptionItem[] = useMemo(() => {
  //   const flat: OptionItem[] = [];
  //   (options || []).forEach((parent: any) => {
  //     if (!parent?.children?.length) return;
  //     parent.children.forEach((child: any) => {
  //       flat.push({
  //         id: String(child.key ?? child.value),
  //         label: String(child.label ?? child.value),
  //         value: String(child.key ?? child.value),
  //         price:
  //           child.fee !== undefined && child.fee !== null
  //             ? Number(child.fee)
  //             : undefined,
  //         category: String(parent.label ?? parent.value ?? ""),
  //       });
  //     });
  //   });
  //   return flat;
  // }, [options]);
  const [rawServiceOptions, setRawServiceOptions] = React.useState<any[]>([]);

  const fieldRef = useRef(field);
  fieldRef.current = field;
  const onOptionsLoadedRef = useRef(onOptionsLoaded);
  onOptionsLoadedRef.current = onOptionsLoaded;

  useEffect(() => {
    const servicesCode = serviceCode ?? ServicesStore.userInfo?.servicesCode;
    if (servicesCode === null || servicesCode === undefined) {
      return;
    }
    // getEconomicActivityByMoe
    getEconomicActivitys(String(servicesCode))
      .then((res) => {
        const serviceOptions = Array.isArray(res.data) ? res.data : [];

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
        } catch (e) {
          console.error("update SelectTable schema options failed:", e);
        }

        setRawServiceOptions(serviceOptions);

      })
      .catch((err) => {
        console.error("[SelectTableSingle] getServiceSelectTable failed:", err);
      });
  }, [ServicesStore.userInfo?.servicesCode, serviceCode]);

  const optionsArr = useMemo(
    () => mapServiceOptionsToFlatOptions(rawServiceOptions, isAr),
    [rawServiceOptions, isAr],
  );

  const fieldValue = field.value || {};
  const isService806 =
    Number(serviceCode) === SERVICE_CODE_BROADCAST_ACTIVITY_CANCELLATION;
  const isService1202 =
    Number(serviceCode) === SERVICE_CODE_NEWSPAPER_MAGAZINE_CANCELLATION;
  const isService80022 =
    Number(serviceCode) === SERVICE_CODE_SOCIAL_MEDIA_COMMERCIAL_RENEWAL;
  const isService80042 =
    Number(serviceCode) === SERVICE_CODE_SOCIAL_MEDIA_COMMERCIAL_CANCELLATION;
  const isService1002 =
    Number(serviceCode) === SERVICE_CODE_CINEMATIC_FILM_SCREENING;
  const isDisabled =
    isService806 ||
    isService1202 ||
    isService80022 ||
    isService80042 ||
    isService1002 ||
    !!restSelectProps?.disabled ||
    props?.disabled ||
    field.pattern === "disabled" ||
    field.pattern === "readOnly" ||
    field.pattern === "readPretty";
  const isService302 = Number(serviceCode) === 302;
  const allowMultiple = Boolean(multiple ?? isService302);
  const resolvedMaxSelectedCount =
    typeof maxSelectedCount === "number"
      ? maxSelectedCount
      : allowMultiple
        ? 2
        : undefined;
  const tableData = Array.isArray(fieldValue.tableData)
    ? fieldValue.tableData
    : [];
  const tableDataOptions = useMemo(
    () =>
      tableDataRowsToOptions(
        tableData,
        t("SelectTable.defaultOptionCategory"),
        isAr,
      ),
    [isAr, tableData, t],
  );
  const dropdownOptions = useMemo(() => {
    const map = new Map<string, OptionItem>();

    optionsArr.forEach((option) => map.set(String(option.value), option));
    tableDataOptions.forEach((option) => {
      const key = String(option.value);
      if (!map.has(key)) {
        map.set(key, option);
      }
    });

    return Array.from(map.values());
  }, [optionsArr, tableDataOptions]);
  const isSingleActivityReadonly = dropdownOptions.length === 1;
  const selectedKey = useMemo(() => {
    const rawSelectedKey = normalizeSelectedKeys(fieldValue.selectedKey);
    const optionValues = new Set(
      dropdownOptions.map((option) => String(option.value)),
    );

    if (rawSelectedKey.length === 0) {
      return tableDataOptions.map((option) => String(option.value));
    }

    if (rawSelectedKey.every((key) => optionValues.has(key))) {
      return rawSelectedKey;
    }

    const tableLabelToValue = new Map<string, string>();
    tableDataOptions.forEach((option) => {
      tableLabelToValue.set(option.label, String(option.value));
    });

    const fromSavedRows = rawSelectedKey
      .map((key) =>
        optionValues.has(key) ? key : tableLabelToValue.get(key) ?? "",
      )
      .filter((key) => key && optionValues.has(key));

    if (fromSavedRows.length > 0) {
      return fromSavedRows;
    }

    return tableDataOptions.length > 0
      ? tableDataOptions.map((option) => String(option.value))
      : rawSelectedKey;
  }, [dropdownOptions, fieldValue.selectedKey, tableDataOptions]);
  const optionMap = useMemo(() => {
    const map = new Map<string, OptionItem>();
    dropdownOptions.forEach((o) => map.set(String(o.value), o));
    return map;
  }, [dropdownOptions]);
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

  // Required validation (no FormItem built-in feedback; we only render our own message)
  const requiredValidator = useMemo(() => {
    return (value: any) => {
      const selected = normalizeSelectedKeys(value?.selectedKey);
      const tableRows = Array.isArray(value?.tableData)
        ? value.tableData
        : [];
      if (selected.length > 0) {
        if (
          typeof resolvedMaxSelectedCount === "number" &&
          resolvedMaxSelectedCount > 0 &&
          selected.length > resolvedMaxSelectedCount
        ) {
          return `Please select up to ${resolvedMaxSelectedCount} activities.`;
        }
        return "";
      }
      return tableRows.length > 0 ? "" : resolvedRequiredMessage;
    };
  }, [resolvedMaxSelectedCount, resolvedRequiredMessage]);

  useEffect(() => {
    field.required = true;
    field.setValidator(requiredValidator);
    // Disable FormItem built-in error rendering if field is wrapped by FormItem
    (field as any).decoratorProps = {
      ...(field as any).decoratorProps,
      feedbackLayout: "none",
    };
  }, [field, requiredValidator]);

  const handleSelectChange = (values: string[]) => {
    if (isDisabled) return;
    const current = field.value || {};

    const nextTable = (values || [])
      .map((v) => optionMap.get(v))
      .filter(Boolean)
      .map((o, idx) => ({
        Number: idx + 1,
        Activity: o!.label,
        money: o!.price,
        Id: o!.id,
        ActivityAr: o!.nameAr,
        ActivityEn: o!.nameEn,
      }));

    const next = {
      ...current,
      selectedKey: values,
      tableData: nextTable,
    };
    field.setValue(next);
    // field.validate?.();
  };

  const selectTableSingleContent = (
    <>
      <div className="formtitle">
        {resolvedActivityLabelName}
        <span style={{ color: "#EA4F49", marginLeft: 4 }}>*</span>
        <FieldDecoratorTooltip
          fallbackContent={
            typeof props.description === "string" ? props.description : null
          }
          placement="top"
        />
      </div>
      <MultiSelectDropdown
        required
        placeholder={resolvedPlaceholder}
        value={selectedKey}
        onChange={handleSelectChange}
        options={dropdownOptions}
        disabled={isDisabled || isSingleActivityReadonly}
        multiple={allowMultiple}
        maxSelectedCount={resolvedMaxSelectedCount}
      />
      {!!(field as any)?.selfErrors?.length && (
        <div style={{ marginTop: 6, color: "#EA4F49", fontSize: 12 }}>
          {(field as any).selfErrors?.[0]}
        </div>
      )}
    </>
  );

  const schemaProperties = schema?.properties;

  return (
    <>
      <div className="dn-select-table">
         <AntdCard
            className="Media_Activity_Card Formliy-AntCard"
            title={
              <span data-content-editable="x-component-props.activityTitle">
                {resolvedActivityTitle}
              </span>
            }
          >
            {selectTableSingleContent}
          </AntdCard>
        {schemaProperties && Object.keys(schemaProperties).length > 0 && (
          <div className="select-table-custom-container">
            {Object.keys(schemaProperties).map((key) => (
              <RecursionField
                key={key}
                name={key}
                schema={schemaProperties[key]}
              />
            ))}
          </div>
        )}
        {/* {selectedKey && selectedKey.length > 0 && (
          <AntdCard
            className="ServiceFeesCard"
            title={
              <span data-content-editable="x-component-props.title">
                {tableTitle}
              </span>
            }
          >
            <ArrayBase disabled>
              <div className="tabletitle">
                <Table
                  className="formtable"
                  dataSource={tableData}
                  columns={columns}
                  pagination={false}
                  size={tableSize}
                  bordered={tableBordered}
                  {...tableProps}
                />
              </div>
            </ArrayBase>
            <div className="table-footer">
              <div className="total-label">Total Fee</div>
              <div className="total-amount">
                <img src={AEDG} />
                {totalFee.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </AntdCard>
        )} */}
      </div>
    </>
  );
});
export default SelectTableField;
