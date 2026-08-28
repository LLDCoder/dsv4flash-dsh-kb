import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import CustomMessage from "@/components/common/CustomMessage";
import {
  downloadViolationFineReceiptByTransactionNo,
  getViolationFineReceiptDownloadErrorMessage,
} from "@/services/violationFinePayment";

export interface ViolationFineReceiptDownloadTarget {
  transactionNo?: string | null;
  receiptNo?: string | null;
}

type ViolationFineReceiptDownloadInput =
  | string
  | null
  | undefined
  | ViolationFineReceiptDownloadTarget;

interface NormalizedViolationFineReceiptDownloadTarget {
  transactionNo: string;
  receiptNo: string;
}

function normalizeReceiptDownloadTarget(
  target: ViolationFineReceiptDownloadInput,
): NormalizedViolationFineReceiptDownloadTarget {
  if (typeof target === "string") {
    return {
      transactionNo: target.trim(),
      receiptNo: "",
    };
  }

  return {
    transactionNo: String(target?.transactionNo ?? "").trim(),
    receiptNo: String(target?.receiptNo ?? "").trim(),
  };
}

export function useViolationFineReceiptDownload() {
  const { t } = useTranslation();
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<
    string | null
  >(null);

  const downloadReceipt = useCallback(
    async (target: ViolationFineReceiptDownloadInput) => {
      const { transactionNo, receiptNo } =
        normalizeReceiptDownloadTarget(target);
      const receiptDownloadId = transactionNo || receiptNo;

      if (!receiptDownloadId) {
        CustomMessage.error(
          t("violationsFinesPage.messages.receiptUnavailable"),
        );
        return;
      }

      if (downloadingReceiptId !== null) {
        return;
      }

      setDownloadingReceiptId(receiptDownloadId);
      try {
        await downloadViolationFineReceiptByTransactionNo(
          transactionNo,
          {
            fallbackFileName: `receipt-${receiptDownloadId}.pdf`,
            receiptNo,
          },
        );
      } catch (error) {
        CustomMessage.error(
          getViolationFineReceiptDownloadErrorMessage(error),
        );
      } finally {
        setDownloadingReceiptId(null);
      }
    },
    [downloadingReceiptId, t],
  );

  return {
    downloadingReceiptId,
    downloadReceipt,
  };
}
