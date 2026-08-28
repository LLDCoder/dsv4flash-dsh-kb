import React, { useMemo } from "react";
import { Table } from "antd";
import type { TableProps } from "antd/es/table";
import { useTranslation } from "react-i18next";
import { withTablePaginationOptionText } from "@/utils/pagination";
import "./index.less";

export type TablePanelStatus = "default" | "success" | "warning" | "error" | "suspend";

export interface TableSummaryItem {
  label?: React.ReactNode;
  value?: React.ReactNode;
  description?: React.ReactNode;
  status?: TablePanelStatus;
  onClick?: () => void;
}

export interface TablePanelProps<RecordType extends object = any> {
  summaryItems?: TableSummaryItem[];
  tableProps: TableProps<RecordType>;
  className?: string;
  style?: React.CSSProperties;
}

const TablePanel = <RecordType extends object = any>(
  props: TablePanelProps<RecordType>
) => {
  const { summaryItems, tableProps, className = "", style } = props;
  const { i18n } = useTranslation();
  const mergedTableProps = useMemo(
    () => ({
      ...tableProps,
      pagination: withTablePaginationOptionText(
        tableProps.pagination,
        i18n.language,
      ),
    }),
    [tableProps, i18n.language],
  );

  return (
    <div className={`table-panel admin-table ${className}`} style={style}>
      {summaryItems && summaryItems.length > 0 && (
        <div className="stats-row">
          {summaryItems.map((item, index) => {
            return (
              <div key={index} className={`stat-item stat-${item.status}`}>
                <span className="stat-label">{item.label}</span>
                <span className="stat-count">{item.value}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="table-panel-body">
        <Table {...mergedTableProps} />
      </div>
    </div>
  );
};

export default TablePanel;
