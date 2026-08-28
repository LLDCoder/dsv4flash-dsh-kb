import { useState } from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import DocumentViewer from "@/components/common/DocumentViewer";
import AedSymbolIcon from "@/assets/icons/AED.svg";
import ReportedChevronDownIcon from "@/assets/images/reported-violations-chevron-down.svg";
import ReportedChevronUpIcon from "@/assets/images/reported-violations-chevron-up.svg";
import AedFineIcon from "@/assets/images/AEDG.svg";
import AedHeaderIcon from "@/assets/images/AEDH.svg";
import useIsMobile from "@/hooks/useIsMobile";
import type {
  AppealRecord,
  FineDetailItem,
  ReportedViolationItem,
  ViolationRecord,
} from "../utils/fixtures";
import {
  EMPTY_VALUE,
  formatAmount,
  getDecisionStatusClassName,
  getReportedTagClassName,
} from "../utils/utils";
// Card styles live with the logged-in violation detail page; both pages reuse them.
import "@/pages/ViolationsFinesViolationDetail/index.less";

const ReportedViolationTag = ({ item }: { item: ReportedViolationItem }) => {
  const { t } = useTranslation();
  if (!item?.tag?.trim()) return null;

  const amountMatch = item.tag.match(/^(.*?:)\s*AED\s*(.+)$/i);
  const degreeMatch = amountMatch?.[1].match(/^Degree\s+(.+):$/i);
  const amountLabel = degreeMatch
    ? `${t("violationsFinesPage.violationDetail.fineDetails.degree")} ${degreeMatch[1]}:`
    : amountMatch?.[1];
  const tagText =
    item.tag.trim().toLowerCase() === "reported"
      ? t("violationsFinesPage.common.reported")
      : item.tag;

  return (
    <span
      className={`violations-fines-reported-item__tag ${getReportedTagClassName(
        item,
      )}`}
    >
      {amountMatch ? (
        <>
          <span>{amountLabel}</span>
          <img
            alt=""
            aria-hidden="true"
            className="violations-fines-reported-item__tag-icon"
            src={AedSymbolIcon}
          />
          <span>{amountMatch[2]}</span>
        </>
      ) : (
        tagText
      )}
    </span>
  );
};

export const ReportedViolationCard = ({
  items,
  showTitle = true,
}: {
  items: ReportedViolationItem[];
  showTitle?: boolean;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(
      items.map((item) => [item.id, item.attachments.length > 0]),
    ),
  );

  return (
    <div className="violations-fines-detail-card violations-fines-detail-card--reported">
      {showTitle ? (
        <div className="violations-fines-detail-card__header">
          <h2 className="violations-fines-detail-card__title">
            {t("violationsFinesPage.violationDetail.reported.title")}
          </h2>
        </div>
      ) : null}
      <div className="violations-fines-reported-list">
        {items.map((item, index) => {
          const isExpanded = Boolean(expanded[item.id]);

          return (
            <div
              className={`violations-fines-reported-item${
                isExpanded ? " is-expanded" : ""
              }`}
              key={item.id}
            >
              <button
                className="violations-fines-reported-item__header"
                type="button"
                aria-expanded={isExpanded}
                onClick={() =>
                  setExpanded((state) => ({
                    ...state,
                    [item.id]: !state[item.id],
                  }))
                }
              >
                <span className="violations-fines-reported-item__left">
                  <span className="violations-fines-reported-item__chevron">
                    <img
                      alt=""
                      aria-hidden="true"
                      className={`violations-fines-reported-item__chevron-icon${
                        isExpanded ? " is-expanded" : ""
                      }`}
                      src={
                        isExpanded
                          ? ReportedChevronUpIcon
                          : ReportedChevronDownIcon
                      }
                    />
                  </span>
                  <span className="violations-fines-reported-item__index">
                    {index + 1}.
                  </span>
                  <span className="violations-fines-reported-item__title">
                    {item.title}
                  </span>
                </span>
                <ReportedViolationTag item={item} />
              </button>
              {isExpanded ? (
                <div className="violations-fines-reported-item__body">
                  {item.attachments.length ? (
                    <div className="violations-fines-reported-item__attachments">
                      <div className="violations-fines-field__label">
                        {t("violationsFinesPage.common.attachments")}
                      </div>
                      <div className="violations-fines-reported-item__attachments-grid">
                        {item.attachments.map((file, attachmentIndex) => (
                          <div
                            className="violations-fines-reported-item__attachment-item"
                            key={`${item.id}-${
                              file.url || file.name
                            }-${attachmentIndex}`}
                          >
                            <DocumentViewer
                              fileName={file.name || file.url}
                              fileUrl={file.url || file.name}
                              hasDelete={false}
                              hasDownload={true}
                              hasView={true}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="violations-fines-reported-item__description">
                      {item.description}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CONTENT_VIOLATION_TYPE_ID = 2;

const isContentViolationType = (
  violationTypeId: ViolationRecord["violationTypeId"],
) => violationTypeId === CONTENT_VIOLATION_TYPE_ID;

export const FineDetailsTable = ({
  items,
  totalFee,
  violationTypeId,
}: {
  items: FineDetailItem[];
  totalFee: number | null;
  violationTypeId: ViolationRecord["violationTypeId"];
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const visibleItems = items.filter((item) => item.amount !== 0);
  const countColumnWidth = isMobile ? 64 : 96;
  const amountColumnWidth = isMobile ? 140 : 160;

  if (!visibleItems.length) return null;

  const countTitle =
    isContentViolationType(violationTypeId)
      ? t("violationsFinesPage.violationDetail.fineDetails.degree")
      : t("violationsFinesPage.violationDetail.fineDetails.count");
  const columns: ColumnsType<FineDetailItem> = [
    {
      title: t("violationsFinesPage.violationDetail.fineDetails.violation"),
      dataIndex: "violation",
    },
    { title: countTitle, dataIndex: "count", width: countColumnWidth },
    {
      title: (
        <span className="violations-fines-table__amount-title">
          <span>
            {t("violationsFinesPage.violationDetail.fineDetails.amount")}
          </span>
          <span className="violations-fines-table__amount-currency">
            (
            <img alt="" aria-hidden="true" src={AedHeaderIcon} />)
          </span>
        </span>
      ),
      dataIndex: "amount",
      width: amountColumnWidth,
      render: (value) => formatAmount(value),
    },
  ];

  return (
    <div className="violations-fines-detail-card violations-fines-detail-card--fine">
      <h2 className="violations-fines-detail-card__title">
        {t("violationsFinesPage.violationDetail.fineDetails.title")}
      </h2>
      <div className="violations-fines-fine-details-table-wrap">
        <Table<FineDetailItem>
          className="violations-fines-table violations-fines-table--fine"
          columns={columns}
          dataSource={visibleItems}
          pagination={false}
          rowKey="id"
          tableLayout="fixed"
          scroll={isMobile ? undefined : { x: 520 }}
        />
        <div className="violations-fines-total-fee">
          <span>
            {t("violationsFinesPage.violationDetail.fineDetails.totalFee")}
          </span>
          <strong>
            {totalFee === null ? (
              EMPTY_VALUE
            ) : (
              <>
                <img alt="" aria-hidden="true" src={AedFineIcon} />
                {formatAmount(totalFee)}
              </>
            )}
          </strong>
        </div>
      </div>
    </div>
  );
};

const hasDecisionValue = (value: string | number | null | undefined) => {
  const normalized = String(value ?? "").trim();
  return Boolean(normalized && normalized !== EMPTY_VALUE);
};

const formatAdjustmentDecision = (
  item: ReportedViolationItem,
  degreeLabel: string,
) => {
  const resultName = item.appealResultName?.trim();

  if (!resultName) {
    return undefined;
  }

  if (
    resultName.toLowerCase().includes("adjustments") &&
    hasDecisionValue(item.oldDegree) &&
    hasDecisionValue(item.newDegree)
  ) {
    return `${degreeLabel} ${String(item.oldDegree).trim()} -> ${degreeLabel} ${String(
      item.newDegree,
    ).trim()}`;
  }

  return resultName;
};

const renderDecisionStatusText = (status: string) => {
  const adjustmentParts = status.split(" -> ");

  if (adjustmentParts.length !== 2) {
    return status;
  }

  return (
    <>
      <span className="violations-fines-decision-list__status-old">
        {adjustmentParts[0]}
      </span>
      <span>{` -> ${adjustmentParts[1]}`}</span>
    </>
  );
};

export const DecisionOnAppealCard = ({
  violation,
  relatedAppeal,
}: {
  violation: ViolationRecord;
  relatedAppeal?: AppealRecord;
}) => {
  const { t } = useTranslation();
  const maintainedLabel = t("violationsFinesPage.common.maintained");
  const notes =
    relatedAppeal?.resultBanner?.note ||
    relatedAppeal?.notes ||
    t("violationsFinesPage.violationDetail.decision.defaultNotes");
  const degreeLabel = t(
    "violationsFinesPage.violationDetail.fineDetails.degree",
  );
  const hasReportedAppealResult = violation.reportedViolations.some((item) =>
    Boolean(item.appealResultName?.trim()),
  );
  const [expandedDecisionRows, setExpandedDecisionRows] = useState<
    Record<string, boolean>
  >({});

  const renderDecisionBody = (item: ReportedViolationItem) => (
    <div className="violations-fines-decision-list__body">
      {item.attachments.length ? (
        <div className="violations-fines-decision-list__attachments">
          <div className="violations-fines-field__label">
            {t("violationsFinesPage.common.attachments")}
          </div>
          <div className="violations-fines-decision-list__attachments-grid">
            {item.attachments.map((file, attachmentIndex) => (
              <div
                className="violations-fines-decision-list__attachment-item"
                key={`${item.id}-${file.url || file.name}-${attachmentIndex}`}
              >
                <DocumentViewer
                  fileName={file.name || file.url}
                  fileUrl={file.url || file.name}
                  hasDelete={false}
                  hasDownload={true}
                  hasView={true}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="violations-fines-decision-list__description">
          {item.description}
        </p>
      )}
    </div>
  );

  const renderDecisionRow = ({
    detailItem,
    index,
    isAdjustment,
    isMaintained,
    rowId,
    status,
    statusClassName,
    title,
  }: {
    detailItem?: ReportedViolationItem;
    index: number;
    isAdjustment: boolean;
    isMaintained: boolean;
    rowId: string;
    status: string;
    statusClassName: string;
    title: string;
  }) => {
    const canExpand = Boolean(detailItem);
    const isExpanded = canExpand && Boolean(expandedDecisionRows[rowId]);
    const isCancelled = statusClassName === "cancelled";
    const titleClassName = [
      "violations-fines-decision-list__title",
      isCancelled ? "violations-fines-decision-list__title--cancelled" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const content = (
      <>
        <span className="violations-fines-decision-list__content">
          {canExpand ? (
            <span
              className="violations-fines-decision-list__chevron"
              aria-hidden="true"
            >
              <img
                className={`violations-fines-decision-list__chevron-icon${
                  isExpanded ? " is-expanded" : ""
                }`}
                src={
                  isExpanded ? ReportedChevronUpIcon : ReportedChevronDownIcon
                }
                alt=""
              />
            </span>
          ) : null}
          <span className="violations-fines-decision-list__index">
            {index + 1}.
          </span>
          <span className={titleClassName}>{title}</span>
        </span>
        <span
          className={[
            "violations-fines-decision-list__status",
            `violations-fines-decision-list__status--${statusClassName}`,
            isMaintained
              ? "violations-fines-decision-list__status--maintained"
              : "",
            isAdjustment
              ? "violations-fines-decision-list__status--adjustment"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {renderDecisionStatusText(status)}
        </span>
      </>
    );

    return (
      <div
        className={`violations-fines-decision-list__item${
          isExpanded ? " is-expanded" : ""
        }`}
        key={rowId}
      >
        {canExpand ? (
          <button
            className="violations-fines-decision-list__header"
            type="button"
            aria-expanded={isExpanded}
            onClick={() =>
              setExpandedDecisionRows((state) => ({
                ...state,
                [rowId]: !state[rowId],
              }))
            }
          >
            {content}
          </button>
        ) : (
          <div className="violations-fines-decision-list__header violations-fines-decision-list__header--static">
            {content}
          </div>
        )}
        {isExpanded && detailItem ? renderDecisionBody(detailItem) : null}
      </div>
    );
  };

  const decisionRows = hasReportedAppealResult
    ? violation.reportedViolations.map((item, index) => {
        const formattedDecision = formatAdjustmentDecision(item, degreeLabel);
        const status = formattedDecision ?? maintainedLabel;
        const isMaintained = status === maintainedLabel;
        const isAdjustment = status.includes(" -> ");
        const statusClassName = item.appealResultName
          ? getDecisionStatusClassName(item.appealResultName)
          : "info";

        return renderDecisionRow({
          detailItem: item,
          index,
          isAdjustment,
          isMaintained,
          rowId: item.id,
          status,
          statusClassName,
          title: item.title,
        });
      })
    : violation.fineDetails.length
      ? violation.fineDetails.map((item, index) => {
          const status = item.afterAppealStatus ?? maintainedLabel;
          const isMaintained = status === maintainedLabel;
          const isAdjustment = status.includes(" -> ");
          const statusClassName = item.afterAppealStatus
            ? getDecisionStatusClassName(status)
            : "info";

          return renderDecisionRow({
            detailItem: violation.reportedViolations[index],
            index,
            isAdjustment,
            isMaintained,
            rowId: item.id,
            status,
            statusClassName,
            title: item.violation,
          });
        })
      : violation.reportedViolations.map((item, index) =>
          renderDecisionRow({
            detailItem: item,
            index,
            isAdjustment: false,
            isMaintained: true,
            rowId: item.id,
            status: maintainedLabel,
            statusClassName: "info",
            title: item.title,
          }),
        );

  return (
    <div className="violations-fines-detail-card">
      <div className="violations-fines-decision-list">{decisionRows}</div>
      <div className="violations-fines-decision-notes">
        <div className="violations-fines-field__label">
          {t("violationsFinesPage.common.notes")}
        </div>
        <p>{notes}</p>
      </div>
    </div>
  );
};
