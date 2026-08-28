import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircleOutlined, CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import CustomButton from "@/components/common/CustomButton";
import CustomMessage from "@/components/common/CustomMessage";
import PaymentSuccessFeedback from "@/components/common/PaymentSuccessFeedback";
import AED from "@/assets/icons/Aed";
import {
  cancelCardPaymentTransaction,
  inquiryCardPayment,
  unwrapPaymentCenterResponse,
} from "@/services/paymentCenterCardPayment";
import {
  createViolationFineCardPurchase,
} from "@/services/violationFinePayment";
import { submitViolationFineFeedbackRating } from "@/services/violationFine";
import { useViolationFineReceiptDownload } from "../ViolationsFines/hooks";
import { PageShell } from "../ViolationsFines/components/PageShared";
import {
  formatAmount,
} from "../ViolationsFines/utils/utils";
import {
  buildFinePaymentFailureDetails,
  buildFinePaymentResultUrl,
  clearFineCardPaymentContext,
  getPaymentErrorStatusCode,
  mapFinePaymentCancelToUiState,
  mapFinePaymentInquiryToUiState,
  navigateFinePaymentWindow,
  openFinePaymentWindow,
  readFineCardPaymentContext,
  saveFineCardPaymentContext,
  type FineCardPaymentContext,
  type FinePaymentFailureDetails,
  type FinePaymentUiStatus,
} from "../ViolationsFines/utils/payment";
import "./index.less";

interface PaymentResultLocationState {
  finePaymentContext?: FineCardPaymentContext | null;
  finePaymentInitialStatus?: FinePaymentUiStatus;
}

const ViolationsFinesPaymentResult: React.FC = () => {
  const history = useHistory();
  const location = useLocation<PaymentResultLocationState | undefined>();
  const { t, i18n } = useTranslation();
  const { downloadingReceiptId, downloadReceipt } =
    useViolationFineReceiptDownload();
  const [retryLoading, setRetryLoading] = useState(false);
  const [resultStatus, setResultStatus] =
    useState<FinePaymentUiStatus>("loading");
  const [paymentContext, setPaymentContext] =
    useState<FineCardPaymentContext | null>(null);
  const [failureDetails, setFailureDetails] =
    useState<FinePaymentFailureDetails | null>(null);
  const paymentStatusRefreshInFlightRef = useRef(false);
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const statePaymentContext = location.state?.finePaymentContext ?? null;
  const stateInitialStatus = location.state?.finePaymentInitialStatus;
  const searchPaymentContext = useMemo<FineCardPaymentContext | null>(() => {
    const transactionNo = searchParams.get("transactionNo")?.trim();
    const searchFineReferenceNumber = searchParams
      .get("fineReferenceNumber")
      ?.trim();

    if (!transactionNo || !searchFineReferenceNumber) {
      return null;
    }

    const amount = Number(searchParams.get("amount"));

    return {
      fineReferenceNumber: searchFineReferenceNumber,
      amount: Number.isFinite(amount) ? amount : 0,
      transactionNo,
      createdAt: Date.now(),
      paymentId: searchParams.get("paymentId") || undefined,
      referenceNumber: searchParams.get("referenceNumber") || undefined,
      hostedPaymentPageUrl:
        searchParams.get("hostedPaymentPageUrl") || undefined,
    };
  }, [searchParams]);
  const fineReferenceNumber =
    searchParams.get("fineReferenceNumber") ||
    paymentContext?.fineReferenceNumber ||
    "";
  const retryPath = fineReferenceNumber
    ? `/violations-fines/violations/${encodeURIComponent(fineReferenceNumber)}`
    : "/violations-fines";
  const chooseMethodPath = fineReferenceNumber
    ? `${retryPath}?action=payNow`
    : "/violations-fines";
  const isSuccess = resultStatus === "success";
  const isTerminalFailure =
    resultStatus === "failed" ||
    resultStatus === "cancelled" ||
    resultStatus === "missing";
  const resultCopy = useMemo(() => {
    if (resultStatus === "success") {
      return {
        title: t("violationsFinesPage.paymentResult.status.successTitle"),
        description: t(
          "violationsFinesPage.paymentResult.status.successDescription",
          { fineReferenceNumber: fineReferenceNumber || "-" },
        ),
      };
    }

    if (resultStatus === "processing") {
      return {
        title: t("violationsFinesPage.paymentResult.status.processingTitle"),
        description: t(
          "violationsFinesPage.paymentResult.status.processingDescription",
        ),
      };
    }

    if (resultStatus === "missing") {
      return {
        title: t("violationsFinesPage.paymentResult.status.missingTitle"),
        description: t(
          "violationsFinesPage.paymentResult.status.missingDescription",
        ),
      };
    }

    return {
      title: t(
        resultStatus === "cancelled"
          ? "violationsFinesPage.paymentResult.status.cancelledTitle"
          : "violationsFinesPage.paymentResult.status.failedTitle",
      ),
      description: t(
        "violationsFinesPage.paymentResult.status.failedDescription",
      ),
    };
  }, [fineReferenceNumber, resultStatus, t]);

  const finishCancelledPayment = useCallback(() => {
    clearFineCardPaymentContext();
    CustomMessage.success(t("violationsFinesPage.messages.paymentCancelled"));
    history.replace("/violations-fines");
  }, [history, t]);

  const refreshPaymentStatus = useCallback(async () => {
    if (paymentStatusRefreshInFlightRef.current) {
      return;
    }

    paymentStatusRefreshInFlightRef.current = true;
    const storedContext =
      readFineCardPaymentContext() ?? statePaymentContext ?? searchPaymentContext;
    const transactionNo =
      searchParams.get("transactionNo") || storedContext?.transactionNo || "";
    const paymentId = searchParams.get("paymentId") || storedContext?.paymentId;
    const shouldCancelGatewayFailure =
      location.pathname.endsWith("/failed") && !statePaymentContext;

    if (stateInitialStatus === "cancelled") {
      finishCancelledPayment();
      paymentStatusRefreshInFlightRef.current = false;
      return;
    }

    if (!storedContext || !transactionNo) {
      setPaymentContext(storedContext);
      setResultStatus("missing");
      setFailureDetails(
        buildFinePaymentFailureDetails({ context: storedContext }),
      );
      paymentStatusRefreshInFlightRef.current = false;
      return;
    }

    if (stateInitialStatus === "success" || stateInitialStatus === "failed") {
      setPaymentContext(storedContext);
      setResultStatus(stateInitialStatus);
      setFailureDetails(
        stateInitialStatus === "success"
          ? null
          : buildFinePaymentFailureDetails({ context: storedContext }),
      );
      clearFineCardPaymentContext();
      paymentStatusRefreshInFlightRef.current = false;
      return;
    }

    setPaymentContext(storedContext);
    setResultStatus("loading");
    setFailureDetails(null);

    try {
      if (shouldCancelGatewayFailure) {
        const cancelResult = unwrapPaymentCenterResponse(
          await cancelCardPaymentTransaction({
            transactionNo,
          }),
        );
        const resolution = mapFinePaymentCancelToUiState(cancelResult);
        const nextContext = {
          ...storedContext,
          referenceNumber:
            cancelResult.referenceNumber || storedContext.referenceNumber,
        };

        if (resolution.status === "cancelled") {
          finishCancelledPayment();
          return;
        }

        setPaymentContext(nextContext);
        setResultStatus(resolution.status);
        if (resolution.message) {
          console.error("Fine payment cancellation was not completed:", resolution.message);
        }

        if (resolution.status === "success") {
          clearFineCardPaymentContext();
        }

        if (resolution.status === "processing") {
          setFailureDetails(
            buildFinePaymentFailureDetails({ context: nextContext }),
          );
        }
        return;
      }

      const inquiryResult = unwrapPaymentCenterResponse(
        await inquiryCardPayment({
          transactionNo,
          paymentId,
        }),
      );
      const resolution = mapFinePaymentInquiryToUiState(inquiryResult);

      if (resolution.status === "cancelled") {
        finishCancelledPayment();
        return;
      }

      setResultStatus(resolution.status);
      if (resolution.message) {
        console.error("Fine payment inquiry returned a diagnostic message:", resolution.message);
      }

      if (resolution.status === "success") {
        clearFineCardPaymentContext();
      }

      if (
        resolution.status === "failed" ||
        resolution.status === "processing"
      ) {
        setFailureDetails(
          buildFinePaymentFailureDetails({
            result: inquiryResult,
            context: storedContext,
          }),
        );
      }
    } catch (error) {
      console.error("Failed to refresh fine payment status:", error);
      setResultStatus("processing");
      setFailureDetails(
        buildFinePaymentFailureDetails({ context: storedContext }),
      );

      if (getPaymentErrorStatusCode(error) === 404) {
        clearFineCardPaymentContext();
        setResultStatus("missing");
      }
    } finally {
      paymentStatusRefreshInFlightRef.current = false;
    }
  }, [
    finishCancelledPayment,
    location.pathname,
    searchParams,
    searchPaymentContext,
    statePaymentContext,
    stateInitialStatus,
  ]);

  useEffect(() => {
    refreshPaymentStatus();
  }, [refreshPaymentStatus]);

  const handleTryAgain = async () => {
    if (!paymentContext?.fineReferenceNumber || !paymentContext.amount) {
      history.push(chooseMethodPath);
      return;
    }

    const paymentWindow = openFinePaymentWindow();
    if (!paymentWindow) {
      CustomMessage.error(
        <span className="custom-message__text--error">
          {t("violationsFinesPage.violationDetail.payment.popupBlocked")}
        </span>,
      );
      return;
    }

    setRetryLoading(true);
    let paymentPageOpened = false;
    try {
      const response = await createViolationFineCardPurchase({
        fineReferenceNumber: paymentContext.fineReferenceNumber,
        amount: paymentContext.amount,
        responseUrl: buildFinePaymentResultUrl(
          "/violations-fines/payment/success",
          paymentContext.fineReferenceNumber,
        ),
        errorUrl: buildFinePaymentResultUrl(
          "/violations-fines/payment/failed",
          paymentContext.fineReferenceNumber,
        ),
        description: t(
          "violationsFinesPage.violationDetail.payment.description",
          {
            reference: paymentContext.fineReferenceNumber,
          },
        ),
        languageId: i18n.language.startsWith("ar") ? "AR" : "EN",
      });

      if (response.transactionNo && response.paymentUrl) {
        if (!navigateFinePaymentWindow(paymentWindow, response.paymentUrl)) {
          CustomMessage.error(
            t("violationsFinesPage.violationDetail.payment.startFailed"),
          );
          return;
        }
        paymentPageOpened = true;

        saveFineCardPaymentContext({
          fineReferenceNumber: paymentContext.fineReferenceNumber,
          amount: paymentContext.amount,
          transactionNo: response.transactionNo,
          createdAt: Date.now(),
          paymentId: response.paymentId,
          referenceNumber: response.referenceNumber,
          hostedPaymentPageUrl: response.paymentUrl,
          isRecovered: response.isRecovered,
        });
        return;
      }

      history.push(chooseMethodPath);
    } catch (error) {
      console.error("Failed to start fine card payment retry:", error);
      CustomMessage.error(
        t("violationsFinesPage.violationDetail.payment.startFailed"),
      );
    } finally {
      if (!paymentPageOpened && !paymentWindow.closed) {
        paymentWindow.close();
      }
      setRetryLoading(false);
    }
  };

  // Persist the rating the same way the other payment-success surfaces do; this page
  // previously rendered a rating widget that never reached the backend.
  const handleFeedbackSubmit = useCallback(
    async (rating: number): Promise<boolean> => {
      if (!rating || !fineReferenceNumber) {
        CustomMessage.error(
          t("violationsFinesPage.messages.ratingSubmitFailed"),
        );
        return false;
      }

      try {
        await submitViolationFineFeedbackRating({
          referenceNo: fineReferenceNumber,
          rating,
        });
        CustomMessage.success(
          t("violationsFinesPage.messages.ratingSubmitted"),
        );
        return true;
      } catch (error) {
        console.error("Failed to submit fine payment feedback:", error);
        CustomMessage.error(
          t("violationsFinesPage.messages.ratingSubmitFailed"),
        );
        return false;
      }
    },
    [fineReferenceNumber, t],
  );

  const failureRows = [
    {
      label: t("violationsFinesPage.paymentResult.failureDetails.errorCode"),
      value: failureDetails?.errorCode,
    },
    {
      label: t("violationsFinesPage.paymentResult.failureDetails.reason"),
      value: resultCopy.description,
    },
    {
      label: t(
        "violationsFinesPage.paymentResult.failureDetails.referenceNumber",
      ),
      value: failureDetails?.referenceNumber,
    },
    {
      label: t(
        "violationsFinesPage.paymentResult.failureDetails.transactionNumber",
      ),
      value: failureDetails?.transactionNo,
    },
    {
      label: t(
        "violationsFinesPage.paymentResult.failureDetails.attemptedAmount",
      ),
      value:
        failureDetails?.attemptedAmount === undefined ? undefined : (
          <span className="violations-fines-failure-details__amount">
            <span className="violations-fines-failure-details__amount-icon">
              <AED />
            </span>
            <span>{formatAmount(failureDetails.attemptedAmount)}</span>
          </span>
        ),
    },
    {
      label: t("violationsFinesPage.paymentResult.failureDetails.timestamp"),
      value: failureDetails?.timestamp,
    },
  ].filter((item) => item.value !== undefined && item.value !== "");

  return (
    <PageShell>
      <div className="violations-fines-result-page">
        <div
          className={
            "violations-fines-payment-result violations-fines-payment-result--" +
            (isSuccess ? "success" : "failed")
          }
        >
          <div className="violations-fines-payment-result__main">
            <div className="violations-fines-payment-result__icon">
              {isSuccess ? <CheckCircleOutlined /> : <CloseOutlined />}
            </div>
            <div className="violations-fines-payment-result__copy">
              <h2>
                {resultStatus === "loading"
                  ? t("violationsFinesPage.paymentResult.status.loadingTitle")
                  : resultCopy.title}
              </h2>
              <p>
                {resultStatus === "loading"
                  ? t(
                      "violationsFinesPage.paymentResult.status.loadingDescription",
                    )
                  : resultCopy.description}
              </p>
            </div>
            {isTerminalFailure || resultStatus === "processing" ? (
              <div className="violations-fines-failure-details">
                {failureRows.map((item) => (
                  <div
                    className="violations-fines-failure-details__row"
                    key={item.label}
                  >
                    <span className="violations-fines-failure-details__label">
                      {item.label}
                    </span>
                    <strong className="violations-fines-failure-details__value">
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
            ) : null}
            {resultStatus !== "loading" ? (
              <div className="violations-fines-payment-result__actions">
                {isSuccess ? (
                  <>
                    <CustomButton
                      text={t("violationsFinesPage.common.back")}
                      variant="outline"
                      onClick={() => history.push("/violations-fines")}
                      customClassName="violations-fines-payment-result__button violations-fines-payment-result__button--back"
                    />
                    {paymentContext?.transactionNo ? (
                      <CustomButton
                        text={t(
                          "violationsFinesPage.common.downloadReceipt",
                        )}
                        variant="primary"
                        loading={
                          downloadingReceiptId === paymentContext.transactionNo
                        }
                        onClick={() => {
                          void downloadReceipt(paymentContext.transactionNo);
                        }}
                        customClassName="violations-fines-payment-result__button violations-fines-payment-result__button--receipt"
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <CustomButton
                      text={
                        resultStatus === "processing"
                          ? t(
                              "violationsFinesPage.paymentResult.actions.refreshStatus",
                            )
                          : t(
                              "violationsFinesPage.paymentResult.actions.tryAgain",
                            )
                      }
                      variant="outline"
                      loading={retryLoading}
                      onClick={
                        resultStatus === "processing"
                          ? refreshPaymentStatus
                          : handleTryAgain
                      }
                      customClassName="violations-fines-payment-result__button violations-fines-payment-result__button--try-again"
                    />
                    <CustomButton
                      text={t(
                        "violationsFinesPage.paymentResult.actions.useDifferentMethod",
                      )}
                      variant="primary"
                      onClick={() => history.push(chooseMethodPath)}
                      customClassName="violations-fines-payment-result__button violations-fines-payment-result__button--different-method"
                    />
                  </>
                )}
              </div>
            ) : null}
          </div>
          {isSuccess ? (
            <div className="violations-fines-feedback-card">
              <PaymentSuccessFeedback
                title={t("violationsFinesPage.paymentResult.feedback.title")}
                dissatisfiedLabel={t(
                  "violationsFinesPage.paymentResult.feedback.dissatisfied",
                )}
                satisfiedLabel={t(
                  "violationsFinesPage.paymentResult.feedback.satisfied",
                )}
                submitLabel={t("common.submit")}
                onSubmit={handleFeedbackSubmit}
              />
            </div>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
};

export default ViolationsFinesPaymentResult;
