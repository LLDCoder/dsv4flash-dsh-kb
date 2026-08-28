import { Modal, Button } from "antd";
import { useTranslation } from "react-i18next";
import SimpleBar from "@/components/SimpleBar";
import TermsContent from "@/components/common/TermsContent";
import "./TermsConditions.less";

interface TermsConditionsProps {
  showTerms: boolean;
  setShowTerms: React.Dispatch<React.SetStateAction<boolean>>;
}

const TermsConditions: React.FC<TermsConditionsProps> = ({
  showTerms,
  setShowTerms,
}) => {
  const { t } = useTranslation();

  const handleCancel = () => {
    setShowTerms(false);
  };

  return (
    <Modal
      className="terms-conditions-modal"
      title={t("termsModal.title")}
      visible={showTerms}
      onCancel={handleCancel}
      centered
      footer={[
        <Button
          key="back"
          onClick={handleCancel}
          className="terms-conditions-modal__button"
        >
          {t("common.close")}
        </Button>,
      ]}
    >
      <SimpleBar className="terms-conditions-modal__scroll">
        <TermsContent variant="mediaLicense" />
      </SimpleBar>
    </Modal>
  );
};

export default TermsConditions;
