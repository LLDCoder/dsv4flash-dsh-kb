import { Modal, Input } from "antd";
import CustomButton from "@/components/common/CustomButton";
import { DownloadOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { downFile } from "@/utils/down";
import { useTranslation } from "react-i18next";
import "./index.less";
import PasswordNoteIcon from "@/assets/images/passwordNote.svg";
interface Props {
  code?: string;
  url: string;
  visible: boolean;
  password: string;
  fileName: string;
  cancle: () => void;
  title?: string;
  subtitle?: string;
  noteText?: string;
  passwordLabel?: string;
  noteTitle?: string;
  copyButtonText?: string;
  useCustomIcon?: boolean;
  className?: string;
}
const baseUrl = import.meta.env.VITE_DownloadPDF_URL || window.location.origin;

const DocumentDown: React.FC<Props> = ({
  visible,
  cancle,
  url,
  password,
  fileName,
  title,
  subtitle,
  noteText,
  passwordLabel,
  noteTitle,
  copyButtonText,
  useCustomIcon = false,
  className
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("myRequestsPage.documentModal.title");
  const resolvedSubtitle =
    subtitle ?? t("myRequestsPage.documentModal.subtitle");
  const resolvedNoteText =
    noteText ?? t("myRequestsPage.documentModal.noteText");
  const resolvedPasswordLabel =
    passwordLabel ?? t("myRequestsPage.documentModal.passwordLabel");
  const resolvedNoteTitle =
    noteTitle ?? t("myRequestsPage.documentModal.noteTitle");
  const resolvedCopyButtonText =
    copyButtonText ?? t("myRequestsPage.documentModal.copyRedirect");

  return (
    <Modal
      visible={visible}
      onCancel={() => {
        cancle();
      }}
      footer={null}
      className={className ? `DocumentDown ${className}` : "DocumentDown"}
      centered
    >
      <div className="document-down">
        <div className="_down-icon">
          <DownloadOutlined />
        </div>
        <div className="_down-title">{resolvedTitle}</div>
        <div className="_down-tips">{resolvedSubtitle}</div>
        <div className="_down-password">
          <div className="_label">{resolvedPasswordLabel}</div>
          <Input.Password value={password} />
        </div>
        <div className="_down-note">
          <div className="_icon">
            {useCustomIcon ? (
              <img src={PasswordNoteIcon} alt="" />
            ) : (
              <ExclamationCircleOutlined />
            )}
          </div>
          <div className="_note">
            <div className="_title">{resolvedNoteTitle}</div>
            <div className="_text">
              {resolvedNoteText}
            </div>
          </div>
        </div>
        <div className="_down-btn">
          <CustomButton
            text={resolvedCopyButtonText}
            variant="primary"
            onClick={() => {
              const ele = document.createElement("input");
              ele.value = password;
              document.body.appendChild(ele);
              ele.select();
              document.execCommand("copy");
              document.body.removeChild(ele);
              const downUrl = `${baseUrl}/api/pdf/preview?fileName=${url}`;
              
              downFile(downUrl, `${fileName}.pdf`);
            }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default DocumentDown;
