import React from "react";
import { Modal } from "antd";
import type { ModalProps } from "antd";
import "./index.less";

interface OcrBaseModalProps {
  visible: boolean;
  width?: ModalProps["width"];
  className?: string;
  children?: React.ReactNode;
  onCancel: () => void;
}

const OcrBaseModal: React.FC<OcrBaseModalProps> = ({
  visible,
  width = 960,
  className = "",
  children,
  onCancel,
}) => (
  <Modal
    visible={visible}
    width={width}
    title={<div className="identity-ocr-modal__header-spacer" />}
    className={className}
    wrapClassName="identity-ocr-modal-root"
    centered
    footer={null}
    onCancel={onCancel}
    destroyOnClose={false}
    maskClosable={false}
  >
    {children}
  </Modal>
);

export default OcrBaseModal;
