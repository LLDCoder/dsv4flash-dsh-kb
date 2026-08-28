import React from "react";
import VerificationSection from "./VerificationSection";
import DemographicsSection from "./DemographicsSection";
import DocumentsSection from "./DocumentsSection";
import type {
  DEFAULT_INDIVIDUAL_IDENTITY_SECTIONS,
  IndividualIdentityFormProps,
} from "./types";
import "./index.less";

const IndividualIdentityForm: React.FC<IndividualIdentityFormProps> = ({
  sections = ["verification", "demographics", "documents"] as typeof DEFAULT_INDIVIDUAL_IDENTITY_SECTIONS,
  showExtendedFields,
  layout,
  ...props
}) => {
  const show = (name: (typeof sections)[number]) => sections.includes(name);
  const isProfile = layout === "profile";

  if (isProfile) {
    return (
      <div className="individual-identity-form individual-identity-form--profile">
        {show("verification") && (
          <VerificationSection {...props} layout={layout} part="method" />
        )}
        {(show("verification") || (showExtendedFields && show("demographics"))) && (
          <div className="form-grid">
            {show("verification") && (
              <VerificationSection {...props} layout={layout} part="fields" />
            )}
            {showExtendedFields && show("demographics") && (
              <DemographicsSection {...props} layout={layout} flat />
            )}
          </div>
        )}
        {showExtendedFields && show("documents") && (
          <div className="documents-grid">
            <DocumentsSection {...props} layout={layout} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="individual-identity-form individual-identity-form--modal">
      {show("verification") && (
        <VerificationSection {...props} layout={layout} part="all" />
      )}
      {showExtendedFields && show("demographics") && (
        <DemographicsSection {...props} layout={layout} />
      )}
      {showExtendedFields && show("documents") && (
        <DocumentsSection {...props} layout={layout} />
      )}
    </div>
  );
};

export default IndividualIdentityForm;
export type {
  IndividualIdentityFormProps,
  DocumentFieldFlags,
  DocumentExpiryFlags,
  VerificationOption,
  VerificationOptionValue,
  IndividualIdentityOcrApplyContext,
  IndividualIdentityOcrApplyResult,
  IndividualIdentityOcrPayloadMapper,
} from "./types";
