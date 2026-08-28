import { RightOutlined } from '@ant-design/icons';
import { MultiSelectDropdown, type OptionItem } from '@/components/common';
import { useTranslation } from "react-i18next";
import './ReviewMediaActivity.less';

import AEDH from "@/assets/images/AEDH.svg";
import AEDG from "@/assets/images/AEDG.svg";
interface ReviewMediaActivityProps {
  expanded: boolean;
  onToggle: () => void;
  selectedActivities?: string[];
  availableActivities: OptionItem[];
  activityData: Record<string, { label: string; price: number }>;
}



export default function ReviewMediaActivity({ expanded, onToggle, selectedActivities = [] ,availableActivities=[],activityData={} }: ReviewMediaActivityProps) {
  const { t } = useTranslation();
  const serviceFees = selectedActivities.map((activityValue, index) => {
    const activityInfo = activityData[activityValue];
    return {
      number: index + 1,
      activity: activityInfo?.label || activityValue,
      fee: activityInfo?.price || 0,
    };
  });
  const totalFee = serviceFees.reduce((sum, item) => sum + item.fee*1, 0);

  return (
    <div className="review-section">
      <div className="section-header" onClick={onToggle}>
        <h3 className="section-title">
          {t("mediaLicensePage.mediaActivitySection.title")}
        </h3>
        <RightOutlined className={`toggle-icon ${expanded ? 'expanded' : ''}`} />
      </div>

      {expanded && (
        <div className="section-content">
          <div className="info-block">
            <h4 className="block-title">
              {t("mediaLicensePage.mediaActivitySection.title")}
            </h4>
            <MultiSelectDropdown
              label={t("mediaLicensePage.mediaActivitySection.activities")}
              required
              placeholder={t("formPlaceholders.pages.mediaLicense.selectActivities")}
              value={selectedActivities}
              onChange={() => {}}
              options={availableActivities}
              disabled={true}
            />
          </div>

          <div className="info-block">
            <h4 className="block-title">
              {t("mediaLicensePage.feeTable.serviceFees")}
            </h4>
            <div className="fees-table">
              <div className="table-header">
                <div className="col-number">
                  {t("mediaLicensePage.feeTable.number")}
                </div>
                <div className="col-activity">
                  {t("mediaLicensePage.feeTable.activity")}
                </div>
                <div className="col-fee">
                  <span>{t("mediaLicensePage.feeTable.feesInAed")}</span>
                  <span className='fee-box'>( <img src={AEDH} /> )</span></div>
              </div>
              {serviceFees.map((item) => (
                <div key={item.number} className="table-row">
                  <div className="col-number">{item.number}</div>
                  <div className="col-activity">{item.activity}</div>
                  <div className="col-fee">
                    {item.fee.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              ))}
              <div className="table-footer">
                <div className="total-label">
                  {t("mediaLicensePage.feeTable.totalFee")}
                </div>
                <div className="total-amount">
                  <img src={AEDG} />
                  {totalFee.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
