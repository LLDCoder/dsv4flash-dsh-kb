import React, { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  cancelText?: string;
  children?: ReactNode;
  confirmLoading?: boolean;
  okText?: string;
  title?: ReactNode;
  visible?: boolean;
  onCancel?: () => void;
  onOk?: () => void | Promise<void>;
}

export function Modal({
  cancelText,
  children,
  confirmLoading,
  okText,
  title,
  visible,
  onCancel,
  onOk,
}: ModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (visible) cancelRef.current?.focus();
  }, [visible]);

  if (!visible) return null;
  return (
    <div
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel?.();
      }}
    >
      <h2>{title}</h2>
      {children}
      <button ref={cancelRef} type="button" onClick={onCancel}>
        {cancelText}
      </button>
      <button disabled={confirmLoading} type="button" onClick={() => void onOk?.()}>
        {okText}
      </button>
    </div>
  );
}
