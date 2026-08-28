interface FlowActionsProps {
  backLabel: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryHidden?: boolean;
  primaryLoading?: boolean;
  primaryType?: "button" | "submit";
  primaryWide?: boolean;
  onBack: () => void;
  onPrimary?: () => void;
}

export default function FlowActions({
  backLabel,
  primaryLabel,
  primaryDisabled = false,
  primaryHidden = false,
  primaryLoading = false,
  primaryType = "button",
  primaryWide = false,
  onBack,
  onPrimary,
}: FlowActionsProps) {
  return (
    <div className="forgot-email-actions">
      <button className="forgot-email-back" onClick={onBack} type="button">
        {backLabel}
      </button>
      {!primaryHidden ? (
        <button
          className={`forgot-email-primary${
            primaryWide ? " forgot-email-primary--wide" : ""
          }`}
          aria-busy={primaryLoading}
          disabled={primaryDisabled || primaryLoading}
          onClick={onPrimary}
          type={primaryType}
        >
          {primaryLabel}
        </button>
      ) : null}
    </div>
  );
}
