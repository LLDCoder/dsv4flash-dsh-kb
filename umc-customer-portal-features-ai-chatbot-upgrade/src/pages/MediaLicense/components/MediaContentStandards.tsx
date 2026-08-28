import { Button, Modal } from "antd";
import { useTranslation } from "react-i18next";
import SimpleBar from "@/components/SimpleBar";
import BulletIcon from "@/assets/images/media-content-standard-bullet.svg";
import "./MediaContentStandards.less";

interface MediaContentStandardsProps {
  showMediaContentStandards: boolean;
  setShowMediaContentStandards: (showMediaContentStandards: boolean) => void;
}

const MediaContentStandards = ({
  showMediaContentStandards,
  setShowMediaContentStandards,
}: MediaContentStandardsProps) => {
  const { t } = useTranslation();
  const items = t("mediaLicensePage.MediaContentStandards.items", {
    returnObjects: true,
  }) as string[];

  const handleCancel = () => {
    setShowMediaContentStandards(false);
  };

  return (
    <Modal
      className="media-content-standards-modal"
      title={t("mediaLicensePage.MediaContentStandards.title")}
      visible={showMediaContentStandards}
      onCancel={handleCancel}
      centered
      footer={[
        <Button
          key="close"
          onClick={handleCancel}
          className="media-content-standards-modal__button"
        >
          {t("mediaLicensePage.MediaContentStandards.close")}
        </Button>,
      ]}
    >
      <SimpleBar className="media-content-standards-modal__scroll">
        <div className="media-content-standards-modal__content">
          {items.map((item) => (
            <div className="media-content-standards-modal__item" key={item}>
              <img
                src={BulletIcon}
                alt=""
                className="media-content-standards-modal__bullet"
              />
              <p className="media-content-standards-modal__text">{item}</p>
            </div>
          ))}
        </div>
      </SimpleBar>
    </Modal>
  );
};

export default MediaContentStandards;
