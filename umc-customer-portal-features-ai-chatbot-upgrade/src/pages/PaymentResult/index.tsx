import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckOutlined,
  CloseOutlined,
  ExclamationOutlined,
  LoadingOutlined,
  QuestionOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import Layout from "@/layout";
import { CustomButton, CustomMessage } from "@/components/common";
import CardPaymentResultShell from "@/pages/Detail/CardPayment/CardPaymentResultShell";
import { authService } from "@/services/auth";
import { performAuthenticatedLogout } from "@/utils/authSession";
import { savePendingLoginRedirect } from "@/utils/pendingLoginRedirect";
import {
  inquiryCardPayment,
  unwrapPaymentCenterResponse,
  type PaymentCenterCardPaymentInquiryResponse,
} from "@/services/paymentCenterCardPayment";
import {
  downloadTransactionReceipt,
  getTransactionDetail,
  type PaymentCenterTransactionDetailDto,
} from "@/services/payments";
import {
  getReceiptDownloadErrorMessage,
  getReceiptDownloadFileName,
  getReceiptPendingMessage,
} from "@/utils/paymentReceipt";
import { PaymentResultPollingController } from "./paymentResultPolling";
import {
  createPaymentResultReturnUrl,
  runPaymentResultReceiptRequest,
} from "./paymentResultRequest";
import {
  createInitialPaymentResultState,
  createInvalidPaymentResultState,
  parsePaymentResultSearch,
  type PaymentResultKind,
  type PaymentResultViewState,
} from "./paymentResultState";
import "./index.less";

const unwrapTransactionDetail = (
  response: unknown,
): PaymentCenterTransactionDetailDto | null => {
  if (response == null || typeof response !== "object") return null;
  const result = response as Record<string, unknown>;
  return (result.data && typeof result.data === "object"
    ? result.data
    : result) as PaymentCenterTransactionDetailDto;
};

const PaymentResultPage = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const parsedSearch = useMemo(
    () => parsePaymentResultSearch(location.search),
    [location.search],
  );
  const [viewState, setViewState] = useState<PaymentResultViewState>(() =>
    parsedSearch
      ? createInitialPaymentResultState(parsedSearch.transactionNo)
      : createInvalidPaymentResultState(),
  );
  const [receiptLoading, setReceiptLoading] = useState(false);
  const pollingControllerRef = useRef<PaymentResultPollingController | null>(null);
  const receiptAbortControllerRef = useRef<AbortController | null>(null);
  const returnUrl = useMemo(
    () => createPaymentResultReturnUrl(location.pathname, location.search),
    [location.pathname, location.search],
  );
  const handleUnauthorized = useCallback(() => {
    savePendingLoginRedirect(returnUrl);
    performAuthenticatedLogout({
      redirectOptions: { returnUrl },
    });
  }, [returnUrl]);

  useEffect(() => {
    if (isAuthenticated) return;
    const loginParams = new URLSearchParams({ returnUrl });
    history.replace(`/login?${loginParams.toString()}`);
  }, [history, isAuthenticated, returnUrl]);

  useEffect(() => {
    receiptAbortControllerRef.current?.abort();
    receiptAbortControllerRef.current = null;
    setReceiptLoading(false);

    return () => {
      receiptAbortControllerRef.current?.abort();
      receiptAbortControllerRef.current = null;
    };
  }, [parsedSearch?.transactionNo]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    if (!parsedSearch) {
      setViewState(createInvalidPaymentResultState());
      return undefined;
    }

    setViewState(createInitialPaymentResultState(parsedSearch.transactionNo));
    const controller = new PaymentResultPollingController({
      transactionNo: parsedSearch.transactionNo,
      inquire: async (signal) => {
        const response = await inquiryCardPayment(
          { transactionNo: parsedSearch.transactionNo },
          {
            signal,
            skipErrorToast: true,
            skipUnauthorizedRedirect: true,
          },
        );
        return unwrapPaymentCenterResponse(
          response as unknown as PaymentCenterCardPaymentInquiryResponse,
        );
      },
      onState: setViewState,
      onUnauthorized: handleUnauthorized,
    });
    pollingControllerRef.current = controller;

    const handleVisibilityChange = () => {
      controller.setVisible(document.visibilityState === "visible");
    };
    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    controller.start();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      controller.stop();
      if (pollingControllerRef.current === controller) {
        pollingControllerRef.current = null;
      }
    };
  }, [handleUnauthorized, isAuthenticated, parsedSearch]);

  if (!isAuthenticated) return null;

  const stateContent: Record<
    PaymentResultKind,
    { title: string; body: string; icon: JSX.Element }
  > = {
    CHECKING: {
      title: t("payment.checking.title"),
      body: t("payment.checking.body"),
      icon: <LoadingOutlined />,
    },
    SUCCESS: {
      title: t("payment.success.title"),
      body: t("payment.success.body"),
      icon: <CheckOutlined />,
    },
    FAILED: {
      title: t("payment.failed.title"),
      body: t("payment.failed.body"),
      icon: <CloseOutlined />,
    },
    UNCONFIRMED: {
      title: t("payment.unconfirmed.title"),
      body: t("payment.unconfirmed.body"),
      icon: <QuestionOutlined />,
    },
    INVALID_LINK: {
      title: t("payment.invalid.title"),
      body: t("payment.invalid.body"),
      icon: <ExclamationOutlined />,
    },
  };
  const content = stateContent[viewState.kind];
  const stateModifier = viewState.kind.toLowerCase().replace("_", "-");
  const supportDetails = [
    { label: t("payment.common.paymentId"), value: viewState.paymentId },
    { label: t("payment.common.gatewayStatus"), value: viewState.gatewayStatus },
    { label: t("payment.common.errorCode"), value: viewState.errorCode },
  ].filter((item) => item.value);

  const handleDownloadReceipt = async () => {
    if (!viewState.transactionNo || receiptLoading) return;
    const transactionNo = viewState.transactionNo;
    const abortController = new AbortController();
    receiptAbortControllerRef.current = abortController;
    setReceiptLoading(true);
    try {
      await runPaymentResultReceiptRequest({
        signal: abortController.signal,
        loadDetail: async (signal) => {
          const response = await getTransactionDetail(transactionNo, {
            signal,
            skipErrorToast: true,
            skipUnauthorizedRedirect: true,
          });
          return unwrapTransactionDetail(response);
        },
        download: async (detail, signal) => {
          const pendingMessage = getReceiptPendingMessage(
            detail?.hasReceipt,
            detail?.receipt,
          );
          if (pendingMessage) {
            CustomMessage.error(pendingMessage);
            return;
          }
          await downloadTransactionReceipt(
            transactionNo,
            getReceiptDownloadFileName(
              detail?.receipt,
              `receipt-${transactionNo}.pdf`,
            ),
            {
              signal,
              skipErrorToast: true,
              skipUnauthorizedRedirect: true,
            },
          );
        },
        onUnauthorized: handleUnauthorized,
      });
    } catch (error) {
      if (!abortController.signal.aborted) {
        CustomMessage.error(getReceiptDownloadErrorMessage(error));
      }
    } finally {
      if (receiptAbortControllerRef.current === abortController) {
        receiptAbortControllerRef.current = null;
        if (!abortController.signal.aborted) {
          setReceiptLoading(false);
        }
      }
    }
  };

  const renderActions = () => {
    if (viewState.kind === "SUCCESS") {
      return (
        <>
          <CustomButton variant="outline" onClick={() => history.push("/payments")}>
            {t("payment.common.goPayments")}
          </CustomButton>
          <CustomButton
            variant="primary"
            loading={receiptLoading}
            onClick={() => void handleDownloadReceipt()}
          >
            {t("payment.success.receipt")}
          </CustomButton>
        </>
      );
    }

    if (viewState.kind === "FAILED") {
      return (
        <>
          <CustomButton variant="outline" onClick={() => history.push("/inquiries")}>
            {t("payment.common.help")}
          </CustomButton>
          <CustomButton variant="primary" onClick={() => history.push("/payments")}>
            {t("payment.common.goPayments")}
          </CustomButton>
        </>
      );
    }

    if (viewState.kind === "UNCONFIRMED") {
      return (
        <>
          <CustomButton variant="outline" onClick={() => history.push("/payments")}>
            {t("payment.common.goPayments")}
          </CustomButton>
          <CustomButton variant="outline" onClick={() => history.push("/inquiries")}>
            {t("payment.common.help")}
          </CustomButton>
          <CustomButton
            variant="primary"
            onClick={() => {
              setViewState(
                createInitialPaymentResultState(viewState.transactionNo),
              );
              pollingControllerRef.current?.refresh();
            }}
          >
            {t("payment.unconfirmed.refresh")}
          </CustomButton>
        </>
      );
    }

    if (viewState.kind === "INVALID_LINK") {
      return (
        <>
          <CustomButton variant="outline" onClick={() => history.push("/")}>
            {t("payment.common.backHome")}
          </CustomButton>
          <CustomButton variant="primary" onClick={() => history.push("/payments")}>
            {t("payment.common.goPayments")}
          </CustomButton>
        </>
      );
    }

    return (
      <CustomButton variant="outline" onClick={() => history.push("/payments")}>
        {t("payment.common.goPayments")}
      </CustomButton>
    );
  };

  return (
    <Layout>
      <div
        className={`payment-result payment-result--${stateModifier}`}
        data-testid={`payment-result-${stateModifier}`}
      >
        <CardPaymentResultShell className="payment-result__shell">
          <main className="payment-result__body">
            <div className="payment-result__icon" aria-hidden="true">
              {content.icon}
            </div>
            <div className="payment-result__copy">
              <h1>{content.title}</h1>
              <p>{content.body}</p>
            </div>

            {viewState.kind === "FAILED" ? (
              <div className="payment-result__reason">
                <span>{t("payment.failed.reasonLabel")}</span>
                <strong>{t("payment.failed.genericReason")}</strong>
              </div>
            ) : null}

            {viewState.kind !== "INVALID_LINK" ? (
              <div className="payment-result__summary">
                <div className="payment-result__summary-row">
                  <span>{t("payment.common.transactionNo")}</span>
                  <bdi dir="ltr">{viewState.transactionNo}</bdi>
                </div>
                {viewState.referenceNumber ? (
                  <div className="payment-result__summary-row">
                    <span>{t("payment.common.reference")}</span>
                    <bdi dir="ltr">{viewState.referenceNumber}</bdi>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="payment-result__actions">{renderActions()}</div>

            {viewState.kind === "FAILED" && supportDetails.length > 0 ? (
              <details className="payment-result__support-details">
                <summary>{t("payment.common.details")}</summary>
                <div className="payment-result__support-content">
                  {supportDetails.map((item) => (
                    <div className="payment-result__support-row" key={item.label}>
                      <span>{item.label}</span>
                      <bdi dir="ltr">{item.value}</bdi>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </main>
        </CardPaymentResultShell>
      </div>
    </Layout>
  );
};

export default PaymentResultPage;
