import { useMemo } from "react";
import AED from "@/assets/images/AEDHeaderBracket.svg";
import AEDG from "@/assets/images/AEDG.svg";
import { Table } from "antd";
import { useTranslation } from "react-i18next";
import "./ServicesFee.less";
import "@/components/common/FormliyView/index.less";

interface ServiceFeeRow {
  money?: number | string | null;
  [key: string]: unknown;
}

export default function ReviewDeclaration({
  tableData,
}: {
  tableData: ServiceFeeRow[];
}) {
  const { t } = useTranslation();
  const totalFee = useMemo(() => {
    if (!Array.isArray(tableData)) return 0;
    return tableData.reduce((sum, row) => {
      const price = Number(row?.money ?? 0);
      return sum + (Number.isNaN(price) ? 0 : price);
    }, 0);
  }, [tableData]);
  const tableProps = {};
  const columns = [
    {
      title: t("mediaLicensePage.feeTable.number"),
      dataIndex: "Number",
      key: "Number",
    },
    {
      title: t("mediaLicensePage.feeTable.activity"),
      dataIndex: "Activity",
      key: "Activity",
    },
    {
      title: (
        <div className="moneybox">
          <span>{t("mediaLicensePage.feeTable.feesInAed")}</span>
          <img className="aedicon" src={AED} alt="AED" />
        </div>
      ),
      dataIndex: "money",
      key: "money",
      render: (money: number) => (
        <div className="select-table-node-right">
          <div className="select-table-node-fee">
            {money.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      ),
    },
  ];
  return (
    <div className="ServicesFeesCard">
      <Table
        className="formtable"
        dataSource={tableData}
        columns={columns}
        pagination={false}
        size="small"
        bordered={true}
        {...tableProps}
      />
      <div className="table-footer">
        <div className="total-label">
          {t("mediaLicensePage.feeTable.totalFee")}
        </div>
        <div className="total-amount">
          <img src={AEDG} />
          {totalFee.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>
  );
}
