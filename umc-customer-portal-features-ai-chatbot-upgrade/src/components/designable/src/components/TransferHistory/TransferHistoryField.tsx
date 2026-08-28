import * as React from "react";
import { observer, useField } from "@formily/react";
import type { Field } from "@formily/core";
import { Table, Card as AntdCard, Pagination } from "antd";
import { useTranslation } from "react-i18next";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import "./styles.less";

type TransferRecord = {
  id: string;
  no: number;
  previousHolder: string;
  newHolder: string;
  effectiveDate: string;
  applicationNo: string;
};

const PAGE_SIZE = 6;

export const TransferHistoryField: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = observer((props) => {
  const { t } = useTranslation();
  const field = useField<Field>();
  const [currentPage, setCurrentPage] = React.useState(1);
  const columns = React.useMemo(
    () => [
      {
        title: t("TransferHistory.columns.number"),
        dataIndex: "no",
        key: "no",
        width: 80,
      },
      {
        title: t("TransferHistory.columns.previousHolder"),
        dataIndex: "previousHolder",
        key: "previousHolder",
      },
      {
        title: t("TransferHistory.columns.newHolder"),
        dataIndex: "newHolder",
        key: "newHolder",
      },
      {
        title: t("TransferHistory.columns.effectiveDate"),
        dataIndex: "effectiveDate",
        key: "effectiveDate",
        width: 150,
      },
      {
        title: t("TransferHistory.columns.applicationNumber"),
        dataIndex: "applicationNo",
        key: "applicationNo",
        width: 180,
      },
    ],
    [t],
  );

  const records = React.useMemo(
    () =>
      (Array.isArray(field.value) ? field.value : []) as TransferRecord[],
    [field.value],
  );

  const sorted = React.useMemo(
    () => [...records].sort((a, b) => b.no - a.no),
    [records]
  );

  const paged = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, currentPage]);

  return (
    <div className="transfer-history-container" {...props}>
      <AntdCard
        className="transfer-history-card"
        title={t("TransferHistory.title")}
      >
        <Table
          className="transfer-history-table"
          dataSource={paged}
          columns={columns}
          rowKey="id"
          pagination={false}
          scroll={{ x: true }}
          locale={{
            emptyText: (
              <EmptyBox
                title={t("TransferHistory.empty")}
                customClassName="transfer-history-empty"
              />
            ),
          }}
        />
        {sorted.length > PAGE_SIZE && (
          <div className="transfer-history-pagination">
            <Pagination
              current={currentPage}
              total={sorted.length}
              pageSize={PAGE_SIZE}
              onChange={setCurrentPage}
              showSizeChanger={false}
            />
          </div>
        )}
      </AntdCard>
    </div>
  );
});

TransferHistoryField.displayName = "TransferHistoryField";

export default TransferHistoryField;
