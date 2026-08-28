import { useEffect, useMemo, useState } from "react";
import { Tag } from "antd";
import { useTranslation } from "react-i18next";
import CustomButton from "@/components/common/CustomButton";
import DocumentViewer from "@/components/common/DocumentViewer";
import OverflowTooltip from "@/components/common/OverflowTooltip";
import { AddSocialMediaModal } from "@/components/designable/src/components/SocialMediaAccount/AddSocialMediaModal";
import {
  filterModifyChangeSummaryForDisplay,
  formatModifyChangeValue,
  type ModifyChangeItem,
  type ModifyChangeSection,
  type ModifyChangeType,
  type ModifyChangeValueSource,
  type ModifyLanguageSnapshot,
} from "../modifyChangeSummary";
import { SocialMediaAccountIcon } from "@/components/designable/src/components/SocialMediaAccount/SocialMediaAccountIcon";
import type { SocialMediaAccountItem } from "@/components/designable/src/components/SocialMediaAccount/socialMediaAccountModify";
import { getLookupData } from "@/services/services";
import { useServicesStore } from "@/store/services";
import { normalizeLookupOptions } from "@/utils/lookupOptions";
import { resolveExternalWebUrl } from "@/utils/url";
import { getAreaList, getEmirateList, getRegionList } from "@/services/address";
import { getNationalityList } from "@/services/userProfile";
import ReviewProfileInfoCommon from "./ReviewProfileInfoCommon";
import "./ModifyChangeSummary.less";

interface ModifyChangeSummaryProps {
  sections: ModifyChangeSection[];
  languageSnapshots?: ModifyLanguageSnapshot[];
  serviceCode?: string | number | null;
}

type SummarySide = "before" | "after";
const CHANGE_TYPE_TRANSLATION_SUFFIX: Record<
  ModifyChangeType,
  "added" | "modified" | "deleted"
> = {
  ADDED: "added",
  MODIFIED: "modified",
  DELETED: "deleted",
};

const SummaryCardTitle = ({ title }: { title: string }) => (
  <OverflowTooltip
    as="h3"
    className="modify-change-summary__card-title"
    title={title}
  >
    {title}
  </OverflowTooltip>
);

const DATE_FIELD_KEYS = new Set([
  "dateofbirth",
  "emiratesidexpirydate",
  "licenseexpirydate",
  "passportexpirydate",
  "tenancycontractenddate",
  "visaexpirydate",
]);

const isDateField = (change: ModifyChangeItem) => {
  const fieldKey = change.fieldKey.split(".").at(-1) ?? change.fieldKey;
  return (
    change.component === "DatePicker" ||
    DATE_FIELD_KEYS.has(fieldKey.replace(/[^a-z0-9]/gi, "").toLowerCase())
  );
};

const PROFILE_FILE_FIELD_KEYS = new Set([
  "commercialLicense",
  "reserveTradeName",
  "tenancyContract",
  "memorandumOfAssociation",
  "powerOfAttorney",
]);

const isFileField = (change: ModifyChangeItem): boolean =>
  change.component === "Upload" || PROFILE_FILE_FIELD_KEYS.has(change.fieldKey);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getSideValue = (change: ModifyChangeItem, side: SummarySide) =>
  side === "before" ? change.beforeValue : change.afterValue;

type ModifyValueLabelMaps = Map<string, Map<string, string>>;

const getValueSourceKey = (source: ModifyChangeValueSource): string =>
  source.type === "lookup" ? `lookup:${source.source}` : source.type;

const getValueKey = (value: unknown): string => String(value ?? "").trim();

const toValueLabelMap = (input: unknown, isArabic: boolean) =>
  new Map(
    normalizeLookupOptions(input, isArabic).map((option) => [
      getValueKey(option.value),
      option.label,
    ]),
  );

const formatResolvedChangeValue = (
  change: ModifyChangeItem,
  side: SummarySide,
  isArabic: boolean,
  valueLabelMaps: ModifyValueLabelMaps,
): string => {
  const value = getSideValue(change, side);
  const valueKey = getValueKey(value);
  if (valueKey && change.valueSource) {
    const remoteLabel = valueLabelMaps
      .get(getValueSourceKey(change.valueSource))
      ?.get(valueKey);
    if (remoteLabel) return remoteLabel;
  }

  const localOption = change.valueOptions?.find(
    (option) => getValueKey(option.value) === valueKey,
  );
  if (localOption) {
    return isArabic ? localOption.labelAr : localOption.labelEn;
  }

  return formatModifyChangeValue(value, {
    fileLike: isFileField(change),
    dateOnly: isDateField(change),
    booleanLabels: {
      true: isArabic ? "نعم" : "Yes",
      false: isArabic ? "لا" : "No",
    },
  });
};

const SummaryCard = ({
  section,
  side,
  valueLabelMaps,
}: {
  section: ModifyChangeSection;
  side: SummarySide;
  valueLabelMaps: ModifyValueLabelMaps;
}) => {
  const { i18n, t } = useTranslation();
  const isArabic = Boolean(i18n.language?.startsWith("ar"));
  const sectionName = isArabic
    ? section.sectionNameAr
    : section.sectionNameEn;
  const fieldChanges = section.changes.filter(
    (change) =>
      change.kind === "field" && change.component !== "SocialMediaAccount",
  );
  return (
    <article className="modify-change-summary__card">
      <header className="modify-change-summary__card-header">
        <SummaryCardTitle
          title={
            side === "after"
              ? t("mediaLicensePage.sectionChanges", { section: sectionName })
              : sectionName
          }
        />
        <span
          className={`modify-change-summary__badge modify-change-summary__badge--${side}`}
        >
          {t(
            side === "before"
              ? "mediaLicensePage.beforeChange"
              : "mediaLicensePage.afterChange",
          )}
        </span>
      </header>

      {fieldChanges.length > 0 ? (
        <dl className="modify-change-summary__field-list">
          {fieldChanges.map((change, index) => (
            <div
              className="modify-change-summary__field-item"
              key={`${change.fieldKey}-${change.changeType}-${index}`}
            >
              <dt>{isArabic ? change.labelAr : change.labelEn}</dt>
              <dd>
                {isFileField(change) &&
                typeof getSideValue(change, side) === "string" &&
                String(getSideValue(change, side)).trim() ? (
                  <DocumentViewer
                    fileName={String(getSideValue(change, side))}
                    fileUrl={String(getSideValue(change, side))}
                    hasView
                  />
                ) : (
                  formatResolvedChangeValue(
                    change,
                    side,
                    isArabic,
                    valueLabelMaps,
                  )
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

    </article>
  );
};

const getLanguageValue = (
  value: unknown,
  key: "language" | "suggested_name",
): string => {
  if (!isRecord(value)) return "-";
  return formatModifyChangeValue(value[key]);
};

const LanguageTableValue = ({ value }: { value: unknown }) => {
  const displayValue = formatModifyChangeValue(value);

  return (
    <OverflowTooltip
      align={{ offset: [0, 8] }}
      className="modify-change-summary__table-cell"
      title={displayValue}
    >
      {displayValue}
    </OverflowTooltip>
  );
};

const getLanguageAfterValue = (change: ModifyChangeItem): unknown =>
  change.changeType === "DELETED"
    ? change.beforeValue
    : change.afterValue;

const LegacyLanguageChangeCards = ({
  section,
}: {
  section: ModifyChangeSection;
}) => {
  const { i18n, t } = useTranslation();
  const isArabic = Boolean(i18n.language?.startsWith("ar"));
  const sectionName = isArabic
    ? section.sectionNameAr
    : section.sectionNameEn;
  const languageChanges = section.changes.filter(
    (change) =>
      change.kind === "list" && change.component === "DataList",
  );
  const languageBeforeChanges = languageChanges.filter((change) =>
    isRecord(change.beforeValue),
  );

  if (languageChanges.length === 0) return null;

  return (
    <div className="modify-change-summary__section modify-change-summary__language-section">
      <article className="modify-change-summary__card">
        <header className="modify-change-summary__card-header">
          <SummaryCardTitle title={sectionName} />
          <span className="modify-change-summary__badge modify-change-summary__badge--before">
            {t("mediaLicensePage.beforeChange")}
          </span>
        </header>
        <div className="modify-change-summary__table-wrap">
          <table className="modify-change-summary__table">
            <thead>
              <tr>
                <th>{t("mediaLicensePage.language")}</th>
                <th>{t("mediaLicensePage.name")}</th>
              </tr>
            </thead>
            <tbody>
              {languageBeforeChanges.length > 0 ? (
                languageBeforeChanges.map((change, index) => (
                  <tr key={`${change.fieldKey}-${change.changeType}-${index}`}>
                    <td>
                      <LanguageTableValue
                        value={getLanguageValue(change.beforeValue, "language")}
                      />
                    </td>
                    <td>
                      <LanguageTableValue
                        value={getLanguageValue(
                          change.beforeValue,
                          "suggested_name",
                        )}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2}>
                    {t("mediaLicensePage.noPreviousLanguageRecord")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="modify-change-summary__card">
        <header className="modify-change-summary__card-header">
          <SummaryCardTitle
            title={t("mediaLicensePage.sectionChanges", {
              section: sectionName,
            })}
          />
          <span className="modify-change-summary__badge modify-change-summary__badge--after">
            {t("mediaLicensePage.afterChange")}
          </span>
        </header>
        <div className="modify-change-summary__table-wrap">
          <table className="modify-change-summary__table">
            <thead>
              <tr>
                <th>{t("mediaLicensePage.changeTypeLabel")}</th>
                <th>{t("mediaLicensePage.language")}</th>
                <th>{t("mediaLicensePage.name")}</th>
              </tr>
            </thead>
            <tbody>
              {languageChanges.map((change, index) => (
                <tr key={`${change.fieldKey}-${change.changeType}-${index}`}>
                  <td>
                    {t(
                      `mediaLicensePage.changeType.${CHANGE_TYPE_TRANSLATION_SUFFIX[change.changeType]}`,
                    )}
                  </td>
                  <td>
                    <LanguageTableValue
                      value={getLanguageValue(
                        getLanguageAfterValue(change),
                        "language",
                      )}
                    />
                  </td>
                  <td>
                    <LanguageTableValue
                      value={getLanguageValue(
                        getLanguageAfterValue(change),
                        "suggested_name",
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
};

const LanguageSnapshotTable = ({
  snapshot,
  side,
}: {
  snapshot: ModifyLanguageSnapshot;
  side: SummarySide;
}) => {
  const { t } = useTranslation();
  const rows = side === "before"
    ? snapshot.beforeRows
    : [...snapshot.afterRows, ...snapshot.deletedRows];

  return (
    <div className="modify-change-summary__table-wrap">
      <table className="modify-change-summary__table">
        <thead>
          <tr>
            {side === "after" ? (
              <th>{t("mediaLicensePage.changeTypeLabel")}</th>
            ) : null}
            <th>{t("mediaLicensePage.language")}</th>
            <th>{t("mediaLicensePage.name")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={`${side}-${row.key}`}>
                {side === "after" ? (
                  <td>
                    {row.changeType
                      ? t(
                          `mediaLicensePage.changeType.${CHANGE_TYPE_TRANSLATION_SUFFIX[row.changeType]}`,
                        )
                      : "-"}
                  </td>
                ) : null}
                <td>
                  <LanguageTableValue value={row.language} />
                </td>
                <td>
                  <LanguageTableValue value={row.name} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={side === "after" ? 3 : 2}>
                {t(
                  side === "before"
                    ? "mediaLicensePage.noPreviousLanguageRecord"
                    : "mediaLicensePage.noLanguageRecord",
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const LanguageSnapshotCards = ({
  snapshot,
}: {
  snapshot: ModifyLanguageSnapshot;
}) => {
  const { i18n, t } = useTranslation();
  const isArabic = Boolean(i18n.language?.startsWith("ar"));
  const sectionName = isArabic
    ? snapshot.sectionNameAr
    : snapshot.sectionNameEn;

  return (
    <div className="modify-change-summary__section modify-change-summary__language-section">
      <article className="modify-change-summary__card">
        <header className="modify-change-summary__card-header">
          <SummaryCardTitle title={sectionName} />
          <span className="modify-change-summary__badge modify-change-summary__badge--before">
            {t("mediaLicensePage.beforeChange")}
          </span>
        </header>
        <LanguageSnapshotTable snapshot={snapshot} side="before" />
      </article>

      <article className="modify-change-summary__card">
        <header className="modify-change-summary__card-header">
          <SummaryCardTitle
            title={t("mediaLicensePage.sectionChanges", {
              section: sectionName,
            })}
          />
          <span className="modify-change-summary__badge modify-change-summary__badge--after">
            {t("mediaLicensePage.afterChange")}
          </span>
        </header>
        <LanguageSnapshotTable snapshot={snapshot} side="after" />
      </article>
    </div>
  );
};

const LanguageChangeCards = ({
  section,
  snapshots,
}: {
  section: ModifyChangeSection;
  snapshots: ModifyLanguageSnapshot[];
}) =>
  snapshots.length > 0 ? (
    <>
      {snapshots.map((snapshot) => (
        <LanguageSnapshotCards
          key={`${snapshot.sectionNameEn}-${snapshot.sectionNameAr}-${snapshot.fieldKey}`}
          snapshot={snapshot}
        />
      ))}
    </>
  ) : (
    <LegacyLanguageChangeCards section={section} />
  );

const ActivityChangeTable = ({ section }: { section: ModifyChangeSection }) => {
  const { i18n, t } = useTranslation();
  const isArabic = Boolean(i18n.language?.startsWith("ar"));
  const sectionName = isArabic
    ? section.sectionNameAr
    : section.sectionNameEn;
  const activityChanges = section.changes.filter(
    (change) => change.kind === "list" && change.component === "SelectTable",
  );

  if (activityChanges.length === 0) return null;

  return (
    <article className="modify-change-summary__card">
      <header className="modify-change-summary__card-header">
        <SummaryCardTitle title={sectionName} />
      </header>
      <div className="modify-change-summary__table-wrap">
        <table className="modify-change-summary__table">
          <thead>
            <tr>
              <th>{t("mediaLicensePage.changeTypeLabel")}</th>
              <th>{t("mediaLicensePage.activity")}</th>
            </tr>
          </thead>
          <tbody>
            {activityChanges.map((change, index) => (
              <tr key={`${change.fieldKey}-${change.changeType}-${index}`}>
                <td>
                  {t(
                    `mediaLicensePage.changeType.${CHANGE_TYPE_TRANSLATION_SUFFIX[change.changeType]}`,
                  )}
                </td>
                <td>
                  {formatModifyChangeValue(
                    change.afterValue ?? change.beforeValue,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
};

const SocialChangeCards = ({
  section,
  serviceCode,
}: {
  section: ModifyChangeSection;
  serviceCode?: string | number | null;
}) => {
  const { i18n, t } = useTranslation();
  const isArabic = Boolean(i18n.language?.startsWith("ar"));
  const [subCategoryLookup, setSubCategoryLookup] = useState<unknown[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<SocialMediaAccountItem | null>(null);
  const sectionName = isArabic
    ? section.sectionNameAr
    : section.sectionNameEn;
  const socialChanges = section.changes.filter(
    (change) => change.component === "SocialMediaAccount",
  );
  useEffect(() => {
    let cancelled = false;
    getLookupData("SocialMediaSubCategories", serviceCode)
      .then((response: { data?: unknown }) => {
        if (!cancelled) {
          setSubCategoryLookup(
            Array.isArray(response?.data) ? response.data : [],
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSubCategoryLookup([]);
      });

    return () => {
      cancelled = true;
    };
  }, [serviceCode]);
  const subCategoryLabels = useMemo(
    () =>
      new Map(
        normalizeLookupOptions(subCategoryLookup, isArabic).map((item) => [
          String(item.value),
          item.label,
        ]),
      ),
    [isArabic, subCategoryLookup],
  );

  if (socialChanges.length === 0) return null;

  const renderAccountCard = (
    record: Record<string, unknown>,
    changeType?: ModifyChangeItem["changeType"],
    key?: React.Key,
  ) => {
    const accountName = String(
      record.accountName ?? record.accountTitle ?? "",
    ).trim();
    const displayAccountName =
      accountName || t("mediaLicensePage.socialMediaAccount.untitled");
    const accountUrl = String(record.accountUrl ?? "").trim();
    const safeAccountUrl = resolveExternalWebUrl(accountUrl);
    const mediaSubCategories = Array.isArray(record.mediaSubCategories)
      ? record.mediaSubCategories
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
      : [];
    const statusKey = changeType
      ? changeType === "ADDED"
        ? "SocialMediaAccount.statusNew"
        : `mediaLicensePage.changeType.${CHANGE_TYPE_TRANSLATION_SUFFIX[changeType]}`
      : null;

    return (
      <article
        key={key}
        className={`modify-change-summary__social-card${
          changeType
            ? ` modify-change-summary__social-card--${changeType.toLowerCase()}`
            : ""
        }`}
      >
        <div className="modify-change-summary__social-card-header">
          <SocialMediaAccountIcon
            typeId={String(record.accountType ?? "")}
            className="modify-change-summary__social-icon"
          />
          <div className="modify-change-summary__social-info">
            <div className="modify-change-summary__social-title-row">
              <OverflowTooltip
                className="modify-change-summary__social-name"
                title={displayAccountName}
              >
                {displayAccountName}
              </OverflowTooltip>
              {statusKey ? (
                <span
                  className={`modify-change-summary__social-status modify-change-summary__social-status--${changeType?.toLowerCase()}`}
                >
                  {t(statusKey)}
                </span>
              ) : null}
            </div>
            {safeAccountUrl ? (
              <a
                className="modify-change-summary__social-url modify-change-summary__social-url--link"
                href={safeAccountUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={accountUrl}
                onClick={(event) => event.stopPropagation()}
              >
                {accountUrl}
              </a>
            ) : (
              <div className="modify-change-summary__social-url">
                {accountUrl || t("mediaLicensePage.socialMediaAccount.noUrl")}
              </div>
            )}
          </div>
        </div>
        {mediaSubCategories.length > 0 ? (
          <div className="modify-change-summary__social-categories">
            <span>{t("mediaLicensePage.socialMediaAccount.subCategory")}</span>
            <div className="modify-change-summary__social-category-list">
              {mediaSubCategories.slice(0, 3).map((item) => (
                <Tag
                  className="modify-change-summary__social-category"
                  key={item}
                >
                  {subCategoryLabels.get(item) ?? item}
                </Tag>
              ))}
              {mediaSubCategories.length > 3 ? (
                <Tag className="modify-change-summary__social-category">
                  +{mediaSubCategories.length - 3}
                </Tag>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="modify-change-summary__social-actions">
          <CustomButton
            size="small"
            customClassName="modify-change-summary__social-details"
            onClick={() =>
              setSelectedAccount(record as SocialMediaAccountItem)
            }
          >
            {t("mediaLicensePage.socialMediaAccount.details")}
          </CustomButton>
        </div>
      </article>
    );
  };

  const beforeAccounts = socialChanges.map((change, index) => ({
    change,
    key: `${change.fieldKey}-${change.changeType}-before-${index}`,
  }));
  const afterAccounts = socialChanges.map((change, index) => ({
    change,
    key: `${change.fieldKey}-${change.changeType}-after-${index}`,
  }));

  return (
    <div className="modify-change-summary__social-section">
      <div className="modify-change-summary__social-comparisons">
        <div className="modify-change-summary__section modify-change-summary__social-comparison">
          <article className="modify-change-summary__card modify-change-summary__social-comparison-card">
            <header className="modify-change-summary__card-header">
              <SummaryCardTitle title={sectionName} />
              <span className="modify-change-summary__badge modify-change-summary__badge--before">
                {t("mediaLicensePage.beforeChange")}
              </span>
            </header>
            {beforeAccounts.length > 0 ? (
              <div className="modify-change-summary__social-card-list">
                {beforeAccounts.map(({ change, key }) =>
                  isRecord(change.beforeValue) ? (
                    renderAccountCard(
                      change.beforeValue,
                      change.changeType === "DELETED" ? "DELETED" : undefined,
                      key,
                    )
                  ) : (
                    <span
                      className="modify-change-summary__social-placeholder"
                      key={key}
                    >
                      -
                    </span>
                  ),
                )}
              </div>
            ) : (
              <span className="modify-change-summary__social-placeholder">-</span>
            )}
          </article>

          <article className="modify-change-summary__card modify-change-summary__social-comparison-card">
            <header className="modify-change-summary__card-header">
              <SummaryCardTitle
                title={t("mediaLicensePage.sectionChanges", {
                  section: sectionName,
                })}
              />
              <span className="modify-change-summary__badge modify-change-summary__badge--after">
                {t("mediaLicensePage.afterChange")}
              </span>
            </header>
            {afterAccounts.length > 0 ? (
              <div className="modify-change-summary__social-card-list">
                {afterAccounts.map(({ change, key }) =>
                  isRecord(change.afterValue) ? (
                    renderAccountCard(
                      change.afterValue,
                      change.changeType === "ADDED" ||
                        change.changeType === "MODIFIED"
                        ? change.changeType
                        : undefined,
                      key,
                    )
                  ) : (
                    <span
                      className="modify-change-summary__social-placeholder"
                      key={key}
                    >
                      -
                    </span>
                  ),
                )}
              </div>
            ) : (
              <span className="modify-change-summary__social-placeholder">-</span>
            )}
          </article>
        </div>
      </div>
      <AddSocialMediaModal
        visible={selectedAccount !== null}
        mode="view"
        editingItem={selectedAccount}
        onSave={() => undefined}
        onCancel={() => setSelectedAccount(null)}
      />
    </div>
  );
};

const ModifyChangeSummary = ({
  sections,
  languageSnapshots = [],
  serviceCode: serviceCodeProp,
}: ModifyChangeSummaryProps) => {
  const { i18n, t } = useTranslation();
  const isArabic = Boolean(i18n.language?.startsWith("ar"));
  const storedServiceCode = useServicesStore(
    (state) => state.userInfo.servicesCode,
  );
  const serviceCode = serviceCodeProp ?? storedServiceCode;
  const displaySections = useMemo(
    () => filterModifyChangeSummaryForDisplay(sections, serviceCode),
    [sections, serviceCode],
  );
  const findLanguageSnapshots = (section: ModifyChangeSection) =>
    languageSnapshots.filter(
      (snapshot) =>
        snapshot.sectionNameEn === section.sectionNameEn &&
        snapshot.sectionNameAr === section.sectionNameAr,
    );
  const orphanLanguageSnapshots = languageSnapshots.filter(
    (snapshot) =>
      !displaySections.some(
        (section) =>
          section.sectionNameEn === snapshot.sectionNameEn &&
          section.sectionNameAr === snapshot.sectionNameAr,
      ),
  );
  const valueSources = useMemo(() => {
    const sources = new Map<string, ModifyChangeValueSource>();
    displaySections.forEach((section) => {
      section.changes.forEach((change) => {
        if (!change.valueSource) return;
        sources.set(getValueSourceKey(change.valueSource), change.valueSource);
      });
    });
    return sources;
  }, [displaySections]);
  const [valueLabelMaps, setValueLabelMaps] = useState<ModifyValueLabelMaps>(
    new Map(),
  );
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (valueSources.size === 0) {
      setValueLabelMaps(new Map());
      return () => {
        cancelled = true;
      };
    }

    const loadSource = async (
      source: ModifyChangeValueSource,
    ): Promise<[string, Map<string, string>]> => {
      const sourceKey = getValueSourceKey(source);
      try {
        if (source.type === "lookup") {
          const response = await getLookupData(source.source, serviceCode);
          return [sourceKey, toValueLabelMap(response?.data, isArabic)];
        }
        if (source.type === "nationality") {
          const response = await getNationalityList();
          return [sourceKey, toValueLabelMap(response?.data, isArabic)];
        }
        if (source.type === "emirate") {
          const response = await getEmirateList(serviceCode);
          return [sourceKey, toValueLabelMap(response?.data, isArabic)];
        }
        if (source.type === "region") {
          const response = await getRegionList();
          return [sourceKey, toValueLabelMap(response?.data, isArabic)];
        }
        const response = await getAreaList();
        return [sourceKey, toValueLabelMap(response?.data, isArabic)];
      } catch {
        return [sourceKey, new Map()];
      }
    };

    Promise.all(Array.from(valueSources.values()).map(loadSource)).then(
      (entries) => {
        if (!cancelled) setValueLabelMaps(new Map(entries));
      },
    );

    return () => {
      cancelled = true;
    };
  }, [isArabic, serviceCode, valueSources]);

  if (displaySections.length === 0 && languageSnapshots.length === 0) {
    return null;
  }

  return (
    <ReviewProfileInfoCommon
      expanded={expanded}
      onToggle={() => setExpanded((current) => !current)}
      sectionTitle={t("mediaLicensePage.changesSummary")}
      className="modify-change-summary__sections"
    >
      {displaySections.map((section) => {
        const sectionLanguageSnapshots = findLanguageSnapshots(section);
        const hasFieldChanges = section.changes.some(
          (change) =>
            change.kind === "field" &&
            change.component !== "SocialMediaAccount",
        );
        const hasSocialChanges = section.changes.some(
          (change) => change.component === "SocialMediaAccount",
        );
        return (
          <div
            className="modify-change-summary__section-group"
            key={`${section.sectionNameEn}-${section.sectionNameAr}`}
          >
            {hasFieldChanges ? (
              <div className="modify-change-summary__section">
                <SummaryCard
                  section={section}
                  side="before"
                  valueLabelMaps={valueLabelMaps}
                />
                <SummaryCard
                  section={section}
                  side="after"
                  valueLabelMaps={valueLabelMaps}
                />
              </div>
            ) : null}
            <LanguageChangeCards
              section={section}
              snapshots={sectionLanguageSnapshots}
            />
            <ActivityChangeTable section={section} />
            {hasSocialChanges ? (
              <SocialChangeCards
                section={section}
                serviceCode={serviceCode}
              />
            ) : null}
          </div>
        );
      })}
      {orphanLanguageSnapshots.map((snapshot) => (
        <LanguageSnapshotCards
          key={`${snapshot.sectionNameEn}-${snapshot.sectionNameAr}-${snapshot.fieldKey}`}
          snapshot={snapshot}
        />
      ))}
    </ReviewProfileInfoCommon>
  );
};

export default ModifyChangeSummary;
