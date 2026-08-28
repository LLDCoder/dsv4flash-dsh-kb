import { useTranslation } from "react-i18next";
import mediaLicenseNmaLogo from "@/assets/images/media-license-terms-logo.svg";

type TermsContentVariant = "signUp" | "mediaLicense";

interface TermsContentProps {
  variant: TermsContentVariant;
}

const TERMS_SECTIONS = [
  { titleKey: "firstTitle", clauseKeys: ["first1", "first2", "first3"], numbered: true },
  {
    titleKey: "secondTitle",
    clauseKeys: ["second1", "second2", "second3", "second4", "second5", "second6"],
    numbered: true,
  },
  {
    titleKey: "thirdTitle",
    clauseKeys: [
      "third1",
      "third2",
      "third3",
      "third4",
      "third5",
      "third6",
      "third7",
      "third8",
    ],
    numbered: true,
  },
  { titleKey: "fourthTitle", clauseKeys: ["fourth1", "fourth2", "fourth3"], numbered: true },
  { titleKey: "fifthTitle", clauseKeys: ["fifth1"], numbered: false },
  { titleKey: "sixthTitle", clauseKeys: ["sixth1"], numbered: false },
  { titleKey: "seventhTitle", clauseKeys: ["seventh1"], numbered: false },
  { titleKey: "eighthTitle", clauseKeys: ["eighth1"], numbered: false },
  { titleKey: "ninthTitle", clauseKeys: ["ninth1", "ninth2"], numbered: true },
] as const;

export default function TermsContent({ variant }: TermsContentProps) {
  const { t } = useTranslation();
  const isSignUp = variant === "signUp";

  const contentClassName = isSignUp
    ? "terms-modal-content"
    : "terms-conditions-modal__content";
  const sectionClassName = isSignUp
    ? "terms-section"
    : "terms-conditions-modal__section";
  const titleClassName = isSignUp
    ? "terms-section-title"
    : "terms-conditions-modal__title";
  const paragraphClassName = isSignUp
    ? "terms-section-paragraph"
    : "terms-conditions-modal__paragraph";

  return (
    <div className={contentClassName}>
      {isSignUp ? (
        <div className="terms-logo">
          <img src={mediaLicenseNmaLogo} alt="" draggable={false} />
        </div>
      ) : (
        <img
          src={mediaLicenseNmaLogo}
          className="terms-conditions-modal__logo"
          alt=""
          draggable={false}
        />
      )}

      <div className={isSignUp ? "terms-paragraph1" : sectionClassName}>
        <div className={isSignUp ? "terms-section-heading" : titleClassName}>
          {t("termsModal.introduction")}
        </div>
        {["introParagraph1", "introParagraph2"].map((key) => (
          <div
            className={isSignUp ? "terms-paragraph text-indent-2" : paragraphClassName}
            key={key}
          >
            {t(`termsModal.${key}`)}
          </div>
        ))}
      </div>

      <div>
        {TERMS_SECTIONS.map((section) => (
          <div className={sectionClassName} key={section.titleKey}>
            <div className={titleClassName}>
              {!isSignUp && <div className="terms-conditions-modal__dot" />}
              {t(`termsModal.${section.titleKey}`)}
            </div>
            {section.clauseKeys.map((clauseKey, index) => (
              <div className={paragraphClassName} key={clauseKey}>
                {section.numbered && (
                  <span>{index + 1}.</span>
                )}
                <span>{t(`termsModal.${clauseKey}`)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
