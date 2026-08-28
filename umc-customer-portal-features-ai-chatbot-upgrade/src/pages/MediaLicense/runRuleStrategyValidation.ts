import { CustomMessage } from "@/components/common";
import i18n from "@/localization/config";
import {
  type RuleStrategyIssue,
  type RuleStrategySubmissionMode,
  type Service204SelfMonitorBlockingReason,
  type Service204SelfMonitorRuleData,
  validateRuleStrategy,
} from "@/services/services";
import type { IUser as PortalUserInfo } from "@/store/user";
import {
  buildMediaLicenseRuleStrategyPayload,
  type MediaLicenseRuleStrategyConfig,
} from "./ruleStrategyPayload";
import { attachCustomerEngineRequestContext } from "./customerEngineRequestContext";
import { getModifyEnginePayloadErrorMessageKey } from "./modifyEnginePayloadError";
import { getPublicationLanguageValidationKey } from "./ruleStrategyPayloadUtils";

interface RunRuleStrategyValidationParams {
  activeRuleStrategyConfig?: MediaLicenseRuleStrategyConfig;
  currentServiceId: number;
  serviceCode: string | number | null | undefined;
  currentProfileId: string;
  userInfo: PortalUserInfo;
  formilyList: unknown[];
  submissionMode?: RuleStrategySubmissionMode;
  licensePermitNo?: string | null;
  mediaLicenseId?: number | null;
}

/**
 * FE-3: Resolve a Self-Monitor blocking reason to a user-facing message.
 *
 * Only registered reason codes are shown. Backend messages and unknown codes
 * remain diagnostic data because their localization contract is not proven.
 */
const translateSelfMonitorReason = (
  reason: Service204SelfMonitorBlockingReason,
): string => {
  const resolveByCode = (code: string): string => {
    const trimmed = code.trim();
    if (!trimmed) {
      return "";
    }
    const key = `selfMonitor.reasons.${trimmed}`;
    const translated = i18n.t(key);
    return translated === key ? "" : translated;
  };

  if (typeof reason === "object" && reason !== null) {
    return resolveByCode(reason.code ?? "");
  }

  return resolveByCode(String(reason));
};
const getValidationFailureMessage = (failures?: RuleStrategyIssue[]) => {
  const summary = Array.isArray(failures)
    ? failures
        .map((failure) => {
          return typeof failure?.message === "string"
            ? failure.message.trim()
            : "";
        })
        .filter(Boolean)
        .filter((message, index, messages) => messages.indexOf(message) === index)
        .slice(0, 3)
    : [];
  if (summary.length > 0) {
    return summary.join("\n");
  }
  return i18n.t("selfMonitor.messages.validationFailed");
};

/**
 * FE-3: Surface Self-Monitor auto-approval feedback from the rule/validate
 * response when the service returns Service204 self-monitor fields. Additive —
 * only fires when the response carries the self-monitor payload, so non-204 /
 * non-self-monitor flows are unaffected.
 *
 * Priority: bookHistoryDecision (Approved/Rejected) > Arabic-book block >
 * auto-approval eligible / blocking reasons.
 */
const notifySelfMonitorOutcome = (
  data: Service204SelfMonitorRuleData | undefined,
) => {
  if (!data) return;

  const {
    bookHistoryDecision,
    selfMonitorAutoApprovalEligible,
    selfMonitorBlockingReasons,
    isArabicBook,
    isSelfMonitorEnterprise,
  } = data;

  // Nothing self-monitor-related came back; stay silent.
  if (
    bookHistoryDecision === undefined &&
    selfMonitorAutoApprovalEligible === undefined &&
    !isSelfMonitorEnterprise
  ) {
    return;
  }

  if (bookHistoryDecision === "Approved") {
    CustomMessage.info(i18n.t("selfMonitor.messages.bookPreviouslyApproved"));
    return;
  }
  if (bookHistoryDecision === "Rejected") {
    CustomMessage.warning(i18n.t("selfMonitor.messages.bookPreviouslyRejected"));
    return;
  }

  if (isArabicBook) {
    CustomMessage.warning(i18n.t("selfMonitor.messages.arabicNotEligible"));
    return;
  }

  if (selfMonitorAutoApprovalEligible === true) {
    CustomMessage.success(i18n.t("selfMonitor.messages.autoApprovalEligible"));
    return;
  }

  if (selfMonitorAutoApprovalEligible === false) {
    const reasons = Array.isArray(selfMonitorBlockingReasons)
      ? selfMonitorBlockingReasons
          .map(translateSelfMonitorReason)
          .filter(Boolean)
      : [];
    const suffix =
      reasons.length > 0 ? `\n${reasons.slice(0, 3).join("\n")}` : "";
    CustomMessage.warning(
      `${i18n.t("selfMonitor.messages.autoApprovalNotEligible")}${suffix}`,
    );
  }
};

export const runRuleStrategyValidation = async ({
  activeRuleStrategyConfig,
  currentServiceId,
  serviceCode,
  currentProfileId,
  userInfo,
  formilyList,
  submissionMode = "submit",
  licensePermitNo,
  mediaLicenseId,
}: RunRuleStrategyValidationParams) => {
  if (!activeRuleStrategyConfig) {
    console.error(
      `Rule validation is not configured for service ${currentServiceId}.`,
    );
    CustomMessage.error(i18n.t("mediaLicensePage.ruleValidationUnavailable"));
    return false;
  }

  let validatePayload;
  try {
    validatePayload = await buildMediaLicenseRuleStrategyPayload({
      config: activeRuleStrategyConfig,
      formilyList,
      currentProfileId,
      userInfo,
      serviceCode,
      submissionMode,
    });
  } catch (error) {
    const publicationLanguageKey =
      getPublicationLanguageValidationKey(error);
    const userMessageKey = getModifyEnginePayloadErrorMessageKey(error);
    CustomMessage.error(
      publicationLanguageKey
        ? i18n.t(publicationLanguageKey)
        : userMessageKey
          ? i18n.t(userMessageKey)
          : i18n.t("mediaLicensePage.ruleValidationUnavailable"),
    );
    return false;
  }
  // return true;

  try {
    const validatePayloadWithLifecycleContext =
      attachCustomerEngineRequestContext(validatePayload, {
        licensePermitNo,
        mediaLicenseId,
      });
    const validateEnvelope = await validateRuleStrategy({
      serviceId: activeRuleStrategyConfig.serviceId,
      enginePayload: validatePayloadWithLifecycleContext,
    });

    if (!validateEnvelope?.isSuccess) {
      console.error("Rule strategy validation was rejected:", validateEnvelope);
      CustomMessage.error(i18n.t("mediaLicensePage.ruleValidationUnavailable"));
      return false;
    }

    if (validateEnvelope.data?.hasErrors) {
      CustomMessage.error(
        getValidationFailureMessage(validateEnvelope.data?.failures),
      );
      return false;
    }

    // FE-3: additive self-monitor auto-approval feedback (Service204 only).
    notifySelfMonitorOutcome(
      validateEnvelope.data as Service204SelfMonitorRuleData | undefined,
    );

    return true;
  } catch (error) {
    console.error("Rule strategy validation failed:", error);
    CustomMessage.error(
      i18n.t("mediaLicensePage.ruleValidationUnavailable"),
    );
    return false;
  }
};
