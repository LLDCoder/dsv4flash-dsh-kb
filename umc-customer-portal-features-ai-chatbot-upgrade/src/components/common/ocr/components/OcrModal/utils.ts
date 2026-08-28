import type { OcrApplyPayload, OcrResultFieldConfig } from "../../type";
import type { OcrResultFormValues } from "./type";

export const getPopupContainer = (triggerNode: HTMLElement) =>
  triggerNode.parentElement || triggerNode;

export const pickResultFormValues = (
  payload: OcrApplyPayload,
  fieldConfigs: OcrResultFieldConfig[],
): OcrResultFormValues => {
  return fieldConfigs.reduce<OcrResultFormValues>((accumulator, fieldConfig) => {
    accumulator[fieldConfig.key] = payload[fieldConfig.key];
    return accumulator;
  }, {});
};
