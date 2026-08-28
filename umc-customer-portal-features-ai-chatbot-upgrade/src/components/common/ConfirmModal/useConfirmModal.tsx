import React from "react";
import ConfirmModal from "./index";

interface UseConfirmModalOptions<T> {
  title: string;
  content: string | React.ReactNode;
  okText?: string;
  cancelText?: string;
  onConfirm?: (payload: T) => void;
}

export function useConfirmModal<T = void>(options: UseConfirmModalOptions<T>) {
  const [visible, setVisible] = React.useState(false);
  const payloadRef = React.useRef<T | undefined>(undefined);
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const show = (payload?: T) => {
    payloadRef.current = payload;
    setVisible(true);
  };

  const hide = () => setVisible(false);

  const handleConfirm = () => {
    optionsRef.current.onConfirm?.(payloadRef.current as T);
    hide();
  };

  const modal = (
    <ConfirmModal
      visible={visible}
      type="danger"
      layout="centered"
      title={options.title}
      content={options.content}
      confirmText={options.okText}
      cancelText={options.cancelText}
      onConfirm={handleConfirm}
      onCancel={hide}
    />
  );

  return { modal, show, hide };
}
