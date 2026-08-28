import { useMemo, useState } from "react";
import { Result, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { AlertBanner } from "@/components/common";
import type { PenaltyEvaluateResponse } from "@/services/services";
import ReviewProfileInfoCommon from "./ReviewProfileInfoCommon";
import "./PenaltyPreviewDisplay.less";

type PenaltyPreviewDisplayProps = {
  penaltyData: PenaltyEvaluateResponse | null;
  penaltyLoading: boolean;
  penaltyError: string | null;
  missingPenaltyContext?: boolean;
};

type DisplayPenaltyItem = {
  code: string;
  title: string;
  amount: number | null;
};

const formatAmount = (amount?: number | null) =>
  Number(amount ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const normalizeMessage = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const messageKeys = [
    "message",
    "detail",
    "description",
    "title",
    "name",
    "label",
    "code",
  ] as const;

  for (const key of messageKeys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return JSON.stringify(record);
};

const normalizePenaltyItems = (
  data: PenaltyEvaluateResponse | null,
  fallbackTitle: (number: number) => string,
) => {
  const items = Array.isArray(data?.items) ? data.items : [];

  return items.map<DisplayPenaltyItem>((item, index) => {
    const codeCandidate = [
      item.code,
      item.penaltyCode,
      item["itemCode"],
      item["legacyG3Code"],
    ].find((value) => typeof value === "string" && value.trim());
    const titleCandidate = [
      item.name,
      item.penaltyName,
      item.title,
      item.description,
      item["chargeName"],
      item["reason"],
      item["label"],
    ].find((value) => typeof value === "string" && value.trim());
    const rawAmount = [
      item.amount,
      item.currentAmount,
      item.fineAmount,
      item["total"],
    ].find((value) => typeof value === "number" && Number.isFinite(value));

    return {
      code: String(codeCandidate ?? index + 1),
      title: String(titleCandidate ?? fallbackTitle(index + 1)),
      amount: typeof rawAmount === "number" ? rawAmount : null,
    };
  });
};

export default function PenaltyPreviewDisplay({
  penaltyData,
  penaltyLoading,
  penaltyError,
  missingPenaltyContext = false,
}: PenaltyPreviewDisplayProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const penaltyItems = useMemo(
    () =>
      normalizePenaltyItems(penaltyData, (number) =>
        t("mediaLicensePage.penaltyPreview.itemWithNumber", { number }),
      ),
    [penaltyData, t],
  );
  const warnings = Array.isArray(penaltyData?.warnings)
    ? penaltyData.warnings
    : [];
  const suggestedActions = Array.isArray(penaltyData?.suggestedActions)
    ? penaltyData.suggestedActions
    : [];

  if (
    !penaltyLoading &&
    !penaltyError &&
    !missingPenaltyContext &&
    !penaltyData
  ) {
    return null;
  }

  return (
    <ReviewProfileInfoCommon
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
      sectionTitle={t("mediaLicensePage.penaltyPreview.title")}
      className="penalty-preview-display"
    >
      {penaltyLoading ? (
        <div className="penalty-preview-loading">
          <Spin tip={t("mediaLicensePage.penaltyPreview.calculating")} />
        </div>
      ) : penaltyError ? (
        <div className="penalty-preview-error">
          <Result
            status="error"
            title={t("mediaLicensePage.penaltyPreview.calculationFailed")}
            subTitle={penaltyError}
          />
        </div>
      ) : missingPenaltyContext ? (
        <div className="penalty-preview-error">
          <Result
            status="warning"
            title={t("mediaLicensePage.penaltyPreview.detailsUnavailable")}
            subTitle={t("mediaLicensePage.penaltyPreview.refreshAndRetry")}
          />
        </div>
      ) : (
        penaltyData && (
          <>
            {warnings.map((warning, index) => (
              <AlertBanner
                key={`penalty-warning-${index}`}
                type="warning"
                className="penalty-preview-banner"
                content={normalizeMessage(warning)}
              />
            ))}
            {suggestedActions.map((action, index) => (
              <AlertBanner
                key={`penalty-action-${index}`}
                type="info"
                className="penalty-preview-banner"
                content={normalizeMessage(action)}
              />
            ))}

            <div className="penalty-preview-summary">
              <div className="penalty-preview-summary__card">
                <div className="penalty-preview-summary__label">
                  {t("mediaLicensePage.penaltyPreview.applies")}
                </div>
                <div className="penalty-preview-summary__value">
                  {penaltyData.applies
                    ? t("mediaLicensePage.penaltyPreview.yes")
                    : t("mediaLicensePage.penaltyPreview.no")}
                </div>
              </div>
              <div className="penalty-preview-summary__card">
                <div className="penalty-preview-summary__label">
                  {t("mediaLicensePage.penaltyPreview.total", {
                    currency: penaltyData.currency || "AED",
                  })}
                </div>
                <div className="penalty-preview-summary__value penalty-preview-summary__value--amount">
                  {formatAmount(penaltyData.totalAmount)}
                </div>
              </div>
            </div>

            {penaltyItems.length > 0 && (
              <div className="penalty-preview-table">
                <div className="penalty-preview-table__header">
                  <div>{t("mediaLicensePage.penaltyPreview.code")}</div>
                  <div>{t("mediaLicensePage.penaltyPreview.item")}</div>
                  <div>
                    {t("mediaLicensePage.penaltyPreview.amount", {
                      currency: penaltyData.currency || "AED",
                    })}
                  </div>
                </div>
                {penaltyItems.map((item) => (
                  <div
                    key={`${item.code}-${item.title}`}
                    className="penalty-preview-table__row"
                  >
                    <div>{item.code}</div>
                    <div>{item.title}</div>
                    <div>{item.amount == null ? "-" : formatAmount(item.amount)}</div>
                  </div>
                ))}
              </div>
            )}

            {!penaltyItems.length && (
              <div className="penalty-preview-empty">
                {penaltyData.applies
                  ? t("mediaLicensePage.penaltyPreview.appliesWithoutItems")
                  : t("mediaLicensePage.penaltyPreview.noItems")}
              </div>
            )}
          </>
        )
      )}
    </ReviewProfileInfoCommon>
  );
}
