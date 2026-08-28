import { Table } from "antd";
import { useTranslation } from "react-i18next";
import "./ServiceFees.less";
import AEDH from "@/assets/images/AEDH.svg";
import AEDG from "@/assets/images/AEDG.svg";
interface ServiceFeesProps {
  selectedActivities: string[];
  SelectTable: Record<string, { label?: string; price?: number }>;
  onSetTotalAmount: (activities: number) => void;
}

interface FeeItem {
  number: number;
  activity: string;
  fees: number;
}

export default function ServiceFees({
  selectedActivities,
  SelectTable,
  onSetTotalAmount,
}: ServiceFeesProps) {
  const { t } = useTranslation();
  const dataSource: FeeItem[] = selectedActivities.map(
    (activityValue, index) => {
      const activityInfo = SelectTable[activityValue];
      return {
        number: index + 1,
        activity: activityInfo?.label || activityValue,
        fees: activityInfo?.price || 0,
      };
    }
  );

  const totalFees = dataSource.reduce((sum, item) => sum + item.fees * 1, 0);
  onSetTotalAmount(totalFees);
  const columns = [
    {
      title: t("mediaLicensePage.feeTable.number"),
      dataIndex: "number",
      key: "number",
    },
    {
      title: t("mediaLicensePage.feeTable.activity"),
      dataIndex: "activity",
      key: "activity",
    },
    {
      title: (
        <div className="tablebox">
          <span>{t("mediaLicensePage.feeTable.feesInAed")}</span>
          <span style={{ display: "flex", alignItems: "center" }}>
            ( <img src={AEDH} className="aedh-icon" />)
          </span>
        </div>
      ),
      dataIndex: "fees",
      key: "fees",
      render: (fees: number) => fees.toLocaleString(),
    },
  ];

  return (
    <div className="service-fees-card">
      <div className="card-header">
        <h3 className="card-title">
          {t("mediaLicensePage.feeTable.serviceFees")}
        </h3>
      </div>

      <div className="card-content">
        <Table
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          rowKey="number"
          className="fees-table"
          scroll={{ x: true }}
        />

        <div className="total-fees">
          <span className="total-label">
            {t("mediaLicensePage.feeTable.totalFees")}
          </span>
          <span className="total-amount">
            <img src={AEDG} />
            {totalFees.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
