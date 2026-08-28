import type { ReactNode } from 'react';
import warningIcon from '@/assets/images/warning_red.svg';
import { splitForgotPasswordHint } from './utils';
import './index.less';

export type FormErrorPromptVariant = 'boxed' | 'inline';

export interface FormErrorPromptProps {
  /** When empty, nothing is rendered. */
  message?: string | null;
  /** Optional action below the message when the message has no embedded forgot-password hint. */
  action?: ReactNode;
  /** Click handler for the forgot-password line parsed from `message`. */
  onActionClick?: () => void;
  className?: string;
  /** `boxed` — icon + tinted background; `inline` — message text only. */
  variant?: FormErrorPromptVariant;
}

export default function FormErrorPrompt({
  message,
  action,
  onActionClick,
  className = '',
  variant = 'boxed',
}: FormErrorPromptProps) {
  const text = String(message ?? '').trim();
  if (!text) {
    return null;
  }

  const { mainMessage, forgotPasswordLine } = splitForgotPasswordHint(text);

  const forgotPasswordLink =
    forgotPasswordLine && onActionClick ? (
      <a
        className="form-error-prompt__link"
        href="/forgot-password"
        onClick={(event) => {
          event.preventDefault();
          onActionClick();
        }}
      >
        {forgotPasswordLine}
      </a>
    ) : forgotPasswordLine ? (
      <span className="form-error-prompt__link">{forgotPasswordLine}</span>
    ) : null;

  const messageContent = (
    <>
      {mainMessage}
      {forgotPasswordLink ? (
        <>
          {' '}
          {forgotPasswordLink}
        </>
      ) : null}
      {!forgotPasswordLink && action ? (
        <>
          {' '}
          <span className="form-error-prompt__link">{action}</span>
        </>
      ) : null}
    </>
  );

  if (variant === 'inline') {
    return (
      <div
        className={`form-error-prompt form-error-prompt--inline ${className}`.trim()}
        role="alert"
      >
        {messageContent}
      </div>
    );
  }

  return (
    <div
      className={`form-error-prompt form-error-prompt--boxed ${className}`.trim()}
      role="alert"
    >
      <img className="form-error-prompt__icon" src={warningIcon} alt="" />
      <div className="form-error-prompt__body">
        <div className="form-error-prompt__message">{messageContent}</div>
      </div>
    </div>
  );
}
