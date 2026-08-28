import React, { useEffect, useState } from "react";
import { Checkbox } from "antd";
import { Trans, useTranslation } from "react-i18next";
import "./ReviewDeclaration.less";
import MediaContentStandards from "./MediaContentStandards";
import TermsConditions from "./TermsConditions";

export default function ReviewDeclaration({
  onChoose,
  showRequiredError = false,
}: {
  onChoose: (checked: boolean) => void;
  showRequiredError?: boolean;
}) {
  const { t } = useTranslation();
  const [falseInfoChecked, setFalseInfoChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showMediaContentStandards, setShowMediaContentStandards] =
    useState(false);

  useEffect(() => {
    onChoose(falseInfoChecked && termsChecked);
  }, [falseInfoChecked, onChoose, termsChecked]);

  const handleTermsClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setShowTerms(true);
  };

  const handleMediaContentStandardsClick = (
    event: React.MouseEvent<HTMLAnchorElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setShowMediaContentStandards(true);
  };

  return (
    <div className="declaration-section">
      <h3 className="declaration-title">
        {t("mediaLicensePage.Declaration.title")}
        <span className="declaration-section__required">*</span>
      </h3>

      <div className="declaration-content">
        <div className="declaration-item">
          <Checkbox
            checked={falseInfoChecked}
            onChange={(e) => setFalseInfoChecked(e.target.checked)}
          >
            <span className="declaration-text">
              {t("mediaLicensePage.Declaration.falseInfo")}
            </span>
          </Checkbox>
        </div>

        <div className="declaration-item">
          <Checkbox
            checked={termsChecked}
            onChange={(e) => setTermsChecked(e.target.checked)}
          >
            <span className="declaration-text">
              <Trans
                i18nKey="mediaLicensePage.Declaration.agreement"
                components={{
                  terms: (
                    <a
                      href="#terms-and-conditions"
                      className="declaration-section__link"
                      onClick={handleTermsClick}
                    />
                  ),
                  standards: (
                    <a
                      href="#media-content-standards"
                      className="declaration-section__link"
                      onClick={handleMediaContentStandardsClick}
                    />
                  ),
                }}
              />
            </span>
          </Checkbox>
        </div>
      </div>
      {showRequiredError && (
        <div className="declaration-section__error" role="alert">
          {t("mediaLicensePage.Declaration.required")}
        </div>
      )}
      <TermsConditions showTerms={showTerms} setShowTerms={setShowTerms} />
      <MediaContentStandards
        showMediaContentStandards={showMediaContentStandards}
        setShowMediaContentStandards={setShowMediaContentStandards}
      />
    </div>
  );
}
