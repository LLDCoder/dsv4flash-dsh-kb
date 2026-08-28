import type { PaymentCenterCardPaymentInquiryResponse } from "@/services/paymentCenterCardPayment";
import {
  createInitialPaymentResultState,
  mapInquiryToPaymentResult,
  type PaymentResultViewState,
} from "./paymentResultState";
import { getPaymentResultHttpStatus } from "./paymentResultRequest";

type TimerHandle = unknown;

interface PaymentResultPollingOptions {
  transactionNo: string;
  inquire: (signal: AbortSignal) => Promise<PaymentCenterCardPaymentInquiryResponse>;
  onState: (state: PaymentResultViewState) => void;
  onUnauthorized?: () => void;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => TimerHandle;
  cancelSchedule?: (handle: TimerHandle) => void;
  pollIntervalMs?: number;
  deadlineMs?: number;
  maxErrorDelayMs?: number;
}

export class PaymentResultPollingController {
  private readonly transactionNo: string;
  private readonly inquire: PaymentResultPollingOptions["inquire"];
  private readonly onState: PaymentResultPollingOptions["onState"];
  private readonly onUnauthorized?: PaymentResultPollingOptions["onUnauthorized"];
  private readonly now: () => number;
  private readonly scheduleCallback: NonNullable<PaymentResultPollingOptions["schedule"]>;
  private readonly cancelScheduledCallback: NonNullable<PaymentResultPollingOptions["cancelSchedule"]>;
  private readonly pollIntervalMs: number;
  private readonly deadlineMs: number;
  private readonly maxErrorDelayMs: number;
  private startedAt = 0;
  private nextErrorDelayMs: number;
  private timer: TimerHandle | null = null;
  private abortController: AbortController | null = null;
  private active = false;
  private stopped = false;
  private visible = true;
  private inFlight = false;

  constructor(options: PaymentResultPollingOptions) {
    this.transactionNo = options.transactionNo;
    this.inquire = options.inquire;
    this.onState = options.onState;
    this.onUnauthorized = options.onUnauthorized;
    this.now = options.now ?? Date.now;
    this.scheduleCallback =
      options.schedule ?? ((callback, delay) => window.setTimeout(callback, delay));
    this.cancelScheduledCallback =
      options.cancelSchedule ?? ((handle) => window.clearTimeout(handle as number));
    this.pollIntervalMs = options.pollIntervalMs ?? 3000;
    this.deadlineMs = options.deadlineMs ?? 180000;
    this.maxErrorDelayMs = options.maxErrorDelayMs ?? 30000;
    this.nextErrorDelayMs = this.pollIntervalMs;
  }

  start() {
    if (this.active || this.stopped) return;
    this.active = true;
    this.startedAt = this.now();
    void this.runInquiry(false);
  }

  refresh() {
    if (this.stopped || this.inFlight) return;
    this.clearTimer();
    this.active = true;
    this.startedAt = this.now();
    void this.runInquiry(true);
  }

  setVisible(visible: boolean) {
    if (this.stopped || this.visible === visible) return;
    this.visible = visible;

    if (!visible) {
      this.clearTimer();
      return;
    }

    if (this.active && !this.inFlight) {
      void this.runInquiry(false);
    }
  }

  stop() {
    this.stopped = true;
    this.active = false;
    this.clearTimer();
    this.abortController?.abort();
    this.abortController = null;
  }

  private clearTimer() {
    if (this.timer === null) return;
    this.cancelScheduledCallback(this.timer);
    this.timer = null;
  }

  private scheduleNext(delay: number) {
    if (!this.active || this.stopped || !this.visible) return;
    const remainingMs = this.deadlineMs - (this.now() - this.startedAt);
    if (remainingMs <= 0) {
      this.emitUnconfirmed();
      return;
    }
    this.clearTimer();
    this.timer = this.scheduleCallback(() => {
      this.timer = null;
      void this.runInquiry(false);
    }, Math.min(delay, remainingMs));
  }

  private emitUnconfirmed() {
    this.active = false;
    this.onState({
      ...createInitialPaymentResultState(this.transactionNo),
      kind: "UNCONFIRMED",
    });
  }

  private async runInquiry(manual: boolean) {
    if (this.stopped || this.inFlight || !this.visible) return;
    if (!manual && this.now() - this.startedAt >= this.deadlineMs) {
      this.emitUnconfirmed();
      return;
    }

    this.inFlight = true;
    this.abortController = new AbortController();

    try {
      const response = await this.inquire(this.abortController.signal);
      if (this.stopped) return;

      const state = mapInquiryToPaymentResult(response, this.transactionNo);
      if (manual && state.kind === "CHECKING") {
        this.emitUnconfirmed();
        return;
      }

      this.onState(state);
      if (state.kind === "CHECKING") {
        this.nextErrorDelayMs = this.pollIntervalMs;
        this.scheduleNext(this.pollIntervalMs);
      } else {
        this.active = false;
      }
    } catch (error) {
      if (this.stopped || this.abortController?.signal.aborted) return;

      const httpStatus = getPaymentResultHttpStatus(error);
      if (httpStatus === 401) {
        this.stop();
        this.onUnauthorized?.();
        return;
      }

      if (httpStatus === 404) {
        this.active = false;
        this.onState({
          ...createInitialPaymentResultState(this.transactionNo),
          kind: "INVALID_LINK",
        });
        return;
      }

      if (manual) {
        this.emitUnconfirmed();
        return;
      }

      this.onState(createInitialPaymentResultState(this.transactionNo));
      this.scheduleNext(this.nextErrorDelayMs);
      this.nextErrorDelayMs = Math.min(
        this.nextErrorDelayMs * 2,
        this.maxErrorDelayMs,
      );
    } finally {
      this.inFlight = false;
      this.abortController = null;
    }
  }
}
