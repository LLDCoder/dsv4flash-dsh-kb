/**
 * OCR integration guide
 *
 * 1. Render <OcrInput /> around the Emirates ID or Passport input.
 *    The document type is selected by the clicked input; it is not fixed:
 *
 *    const [ocrDocumentType, setOcrDocumentType] = useState<OcrDocumentType | null>(null);
 *    const openOcr = (documentType: OcrDocumentType) => setOcrDocumentType(documentType);
 *
 *    <OcrInput onOcrClick={() => openOcr(OCR_DOCUMENT_TYPE.EMIRATES_ID)}>
 *      <Input />
 *    </OcrInput>
 *
 * 2. Render the modal in the same component that owns the target form field:
 *
 *    <OcrModal
 *      visible={!!ocrDocumentType}
 *      documentType={ocrDocumentType!}
 *      nationalityList={nationalityList}
 *      onApply={(payload) => handleOcrApply(payload, ocrDocumentType!)}
 *      onClose={() => setOcrDocumentType(null)}
 *    />
 *
 * 3. OcrModal calls onApply only after the user confirms the result step.
 *    Map its payload to the target form's field names, then write it back to
 *    the target form. Keep existing values for fields that OCR did not return:
 *
 *    const handleOcrApply = (payload: OcrApplyPayload, type: OcrDocumentType) => {
 *      const mapped = type === OCR_DOCUMENT_TYPE.EMIRATES_ID
 *        ? {
 *            dateOfBirth: payload.dateOfBirth?.format("YYYY-MM-DD"),
 *            emiratesId: payload.emiratesId,
 *          }
 *        : {
 *            dateOfBirth: payload.dateOfBirth?.format("YYYY-MM-DD"),
 *            passportNumber: payload.passportNumber,
 *            fullNameEnglish: payload.fullNameEn,
 *            nationality: payload.nationalityId,
 *            gender: payload.gender === 1 ? "male" : "female",
 *            passportExpiryDate: payload.passportExpiryDate?.format("YYYY-MM-DD"),
 *          };
 *
 *      // Ant Design Form:
 *      form.setFieldsValue(mapped);
 *
 *      // Formily object field:
 *      field.setValue({ ...current, ...mapped });
 *      setOcrDocumentType(null);
 *    };
 *
 * The OCR Confirm action only fills the current form. Keep submit, search,
 * and other business actions under the target page's existing handlers.
 */
export { default as OcrTrigger } from "./components/OcrTrigger";
export { default as OcrInput } from "./components/OcrInput";
export { default as OcrModal } from "./components/OcrModal";
export { default as OcrBaseModal } from "./components/OcrBaseModal";
export { OCR_DOCUMENT_TYPE, OCR_DOCUMENT_TYPE_BY_METHOD } from "./constants";
export type {
  OcrApplyContext,
  OcrApplyPayload,
  OcrCaptureSource,
  OcrDocumentType,
  OcrErrorType,
  OcrModalProps,
  OcrPreviewFileType,
  OcrResolvedResult,
  OcrStep,
  OcrTriggerProps,
} from "./type";
export type { OcrInputProps } from "./components/OcrInput";
