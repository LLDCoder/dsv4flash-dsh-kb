import instagram from "@/assets/icons/footer/instagram.svg";
import linkedin from "@/assets/icons/footer/linkedin.svg";
import x from "@/assets/icons/footer/x.svg";
import { Modal } from "antd";
import { useState } from "react";
import './footer.less'
import { CustomButton } from "@/components/common";
import TermsContent from "@/components/common/TermsContent";
import SimpleBar from "@/components/SimpleBar";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";

type PolicyModalType = "terms" | "privacy";

const SOCIAL_LINKS = [
  {
    href: "https://www.instagram.com/uaenma/",
    icon: instagram,
    labelKey: "footer.social.instagram",
  },
  {
    href: "https://www.linkedin.com/company/uaenma",
    icon: linkedin,
    labelKey: "footer.social.linkedin",
  },
  {
    href: "https://x.com/UAENMA",
    icon: x,
    labelKey: "footer.social.twitter",
  },
] as const;

export default function Footer() {
  const { t, i18n } = useTranslation();
  const [policyModal, setPolicyModal] = useState<PolicyModalType | null>(null);
  const history = useHistory();
  const copyrightYear = new Date().getFullYear();
  const policyTitle = policyModal === "privacy"
    ? t("footer.links.privacyPolicy")
    : t("termsModal.title");

  const openFaqs = () => {
    const language = i18n.language.toLowerCase();
    const faqUrl = language.startsWith("ar")
      ? "https://nma.gov.ae/ar/faq"
      : "https://nma.gov.ae/en/faq";

    window.open(faqUrl, "_blank", "noopener,noreferrer");
  };

  return <div className="footer">
    <div className="copyright">
      {t("footer.copyright", {
        year: copyrightYear,
        organization: t("footer.organization"),
      })}
    </div>
    <Modal
      centered
      className="html-editor-modal"
      title={policyTitle}
      onCancel={() => setPolicyModal(null)}
      visible={policyModal !== null}
      footer={(
        <CustomButton
          customClassName="html-editor-modal__close-button"
          onClick={() => setPolicyModal(null)}
          text={t("common.close")}
        />
      )}
    >
      <SimpleBar className="terms-conditions-modal__scroll">
        <TermsContent variant="mediaLicense" />
      </SimpleBar>
    </Modal>
    <div className="links">
      <div onClick={()=>history.push("/complaints")}>{t("footer.links.customerHappiness")}</div>
      <div onClick={() => setPolicyModal("terms")}>{t("footer.links.termsAndConditions")}</div>
      <div onClick={() => setPolicyModal("privacy")}>{t("footer.links.privacyPolicy")}</div>
      <div onClick={openFaqs}>{t("footer.links.faqs")}</div>
    </div>
    <div className="footer__social-links">
      {SOCIAL_LINKS.map(({ href, icon, labelKey }) => (
        <a
          className="footer__social-link"
          href={href}
          key={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          <img
            className="footer__social-icon"
            src={icon}
            alt={t(labelKey)}
          />
        </a>
      ))}
    </div>
  </div>
}
