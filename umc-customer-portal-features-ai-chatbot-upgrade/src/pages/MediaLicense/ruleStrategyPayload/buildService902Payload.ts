import { nowGst, toApi } from "@/utils/gstTime";
import type { Service902RuleStrategyValidatePayload } from "@/services/services";
import { useUpdateFormStore } from "@/store/update-form";
import get from "lodash/get";
import {
  coerceNumber,
  getFirstDefined,
  resolveSelectedIds,
  resolveSelectTableValue,
  resolveTermsAgreed,
} from "../ruleStrategyPayloadUtils";
import {
  type BuildServiceRuleStrategyPayloadParams,
  resolveEstablishmentId,
} from "../ruleStrategyPayloadShared";

const SERVICE_902_RULE_VERSION = "1.0.0";

const resolveActivityIds = (formValuesList: Array<Record<string, unknown>>) => {
  const selectTableValue = resolveSelectTableValue(formValuesList);
  const selectedIds = resolveSelectedIds(selectTableValue);

  if (selectedIds.length > 0) {
    return selectedIds
      .map((item) => coerceNumber(item))
      .filter((item): item is number => item !== undefined);
  }

  return formValuesList
    .flatMap((formValues) => [
      get(formValues, "activityIds"),
      get(formValues, "SelectTable.activityIds"),
      get(formValues, "selectedActivityIds"),
      get(formValues, "SelectTable.selectedActivityIds"),
    ])
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map((item) => coerceNumber(item))
    .filter((item): item is number => item !== undefined);
};

const resolveCinemaScreenCategoryId = (
  formValuesList: Array<Record<string, unknown>>,
) => {
  return coerceNumber(
    getFirstDefined(
      formValuesList.flatMap((formValues) => [
        get(formValues, "cinemaScreenCategoryId"),
        get(formValues, "CinemaScreenCategoryId"),
        get(formValues, "screenCategoryId"),
        get(formValues, "ScreenCategoryId"),
        get(formValues, "SelectTable.cinemaScreenCategoryId"),
        get(formValues, "SelectTable.CinemaScreenCategoryId"),
        get(formValues, "SelectTable.screenCategoryId"),
        get(formValues, "SelectTable.ScreenCategoryId"),
      ]),
    ),
  );
};

export const buildService902Payload = ({
  config,
  formValuesList,
  currentProfileId,
  userInfo,
  submissionMode = "submit",
}: BuildServiceRuleStrategyPayloadParams): Service902RuleStrategyValidatePayload => {
  const applicationId = useUpdateFormStore.getState().applicationId;

  return {
    actionType: 2,
    request: {
      serviceId: config.serviceId,
      applicantUserId: currentProfileId,
      establishmentId: resolveEstablishmentId(userInfo, currentProfileId),
      applicationId: applicationId ?? undefined,
      submissionMode,
      requestTime: toApi(nowGst()),
      activityIds: resolveActivityIds(formValuesList),
      cinemaScreenCategoryId: resolveCinemaScreenCategoryId(formValuesList),
      termsAgreed: resolveTermsAgreed(formValuesList),
    },
  };
};
