import React from "react";
import { Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Col, DatePicker, Row, Select, Input, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import DocumentViewer from "@/components/common/DocumentViewer/index";
import { selectDownIcon } from "@/utils/date";
import { toPickerMoment } from "@/utils/dateLocale";
import QueryInput from "../components/QueryInput";
import PersonalPhotoLabel from "../components/PersonalPhotoLabel";
import {
  FULL_NAME_MAX_LENGTH,
  OCCUPATION_MAX_LENGTH,
  type SectionCommonProps,
  UID_MAX_LENGTH,
  disableFutureDate,
  disablePastDate,
  formatUidInput,
  normalizeArabicFullNameInput,
  normalizeEnglishFullNameInput,
  validateArabicFullName,
  validateEnglishFullName,
  validateOccupation,
  validateUid,
} from "../idSelectorUtils";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";

const { Option } = Select;

export const UidFields: React.FC<SectionCommonProps> = ({
  current,
  showList,
  showQueryButton,
  isFieldEditable,
  nationalityList,
  onFieldChange,
  onQuery,
  queryLoading,
  isQuerySuccess,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const nationalityLabel = (nationality: { nameEn?: string; nameAr?: string }) =>
    preferLocalizedEnAr(isAr, nationality.nameEn, nationality.nameAr) ||
    nationality.nameEn ||
    "";
  const disableAutoFilledFields = (key: keyof typeof current) =>
    !isFieldEditable(key) || isQuerySuccess;

  return (
    <Row gutter={24} className="idselector-row">
      <Col xs={24} md={12}>
        <div className="idselector-label">
          {t("IDSelector.label.dateOfBirth")} <span className="idselector-required">*</span>
        </div>
        <Field
          name="dateOfBirth"
          validator={(value) => (!value ? t("IDSelector.validation.required") : "")}
          decorator={[FormItem]}
        >
          <DatePicker
            style={{ width: "100%" }}
            placeholder={t("IDSelector.common.datePlaceholder")}
            format="DD/MM/YYYY"
            disabled={!isFieldEditable("dateOfBirth")}
            disabledDate={disableFutureDate}
            value={toPickerMoment(current.dateOfBirth as string, "YYYY-MM-DD")}
            onChange={(date) =>
              onFieldChange(
                "dateOfBirth",
                date ? date.format("YYYY-MM-DD") : undefined,
              )
            }
          />
        </Field>
      </Col>
      <Col xs={24} md={12}>
        <div className="idselector-label">
          {t("IDSelector.label.uid")} <span className="idselector-required">*</span>
        </div>
        <Field
          name="uid"
          validator={(value) => validateUid(String(value || ""))}
          decorator={[FormItem]}
        >
          <QueryInput
            placeholder={t("IDSelector.placeholder.uid")}
            value={current.uid || ""}
            disabled={!isFieldEditable("uid")}
            queryLoading={queryLoading}
            showQueryButton={showQueryButton}
            onQuery={onQuery}
            onChange={(e) => onFieldChange("uid", formatUidInput(e.target.value))}
            maxLength={UID_MAX_LENGTH}
          />
        </Field>
      </Col>
      {showList && (
        <>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.fullNameArabic")} <span className="idselector-required">*</span>
            </div>
            <Field
              name="fullNameArabic"
              validator={(value) => validateArabicFullName(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.fullNameArabic")}
                dir="rtl"
                maxLength={FULL_NAME_MAX_LENGTH}
                value={current.fullNameArabic || ""}
                disabled={disableAutoFilledFields("fullNameArabic")}
                onChange={(e) =>
                  onFieldChange(
                    "fullNameArabic",
                    normalizeArabicFullNameInput(e.target.value),
                  )
                }
              />
            </Field>
          </Col>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.fullNameEnglish")} <span className="idselector-required">*</span>
            </div>
            <Field
              name="fullNameEnglish"
              validator={(value) => validateEnglishFullName(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.fullNameEnglish")}
                maxLength={FULL_NAME_MAX_LENGTH}
                value={current.fullNameEnglish || ""}
                disabled={disableAutoFilledFields("fullNameEnglish")}
                onChange={(e) =>
                  onFieldChange(
                    "fullNameEnglish",
                    normalizeEnglishFullNameInput(e.target.value),
                  )
                }
              />
            </Field>
          </Col>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.nationality")} <span className="idselector-required">*</span>
            </div>
            <Field
              name="nationality"
              validator={(value) => (!value ? t("IDSelector.validation.selectNationality") : "")}
              decorator={[FormItem]}
            >
              <Select
                placeholder={t("IDSelector.placeholder.nationality")}
                showSearch
                value={current.nationality || undefined}
                disabled={disableAutoFilledFields("nationality")}
                onChange={(value) => onFieldChange("nationality", value)}
                suffixIcon={selectDownIcon}
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {nationalityList.map((nationality) => (
                  <Option key={nationality.id} value={nationality.id}>
                    {nationalityLabel(nationality)}
                  </Option>
                ))}
              </Select>
            </Field>
          </Col>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.gender")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="gender"
              validator={(value) => (!value ? t("IDSelector.validation.selectGender") : "")}
              decorator={[FormItem]}
            >
              <Select
                placeholder={t("IDSelector.placeholder.gender")}
                showSearch
                value={current.gender || undefined}
                disabled={disableAutoFilledFields("gender")}
                onChange={(value) => onFieldChange("gender", value)}
                suffixIcon={selectDownIcon}
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                <Option key="male" value="male">
                  {t("IDSelector.gender.male")}
                </Option>
                <Option key="female" value="female">
                  {t("IDSelector.gender.female")}
                </Option>
              </Select>
            </Field>
          </Col>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.passportExpiryDate")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="passportExpiryDate"
              validator={(value) => (!value ? t("IDSelector.common.datePlaceholder") : "")}
              decorator={[FormItem]}
            >
              <DatePicker
                style={{ width: "100%" }}
                placeholder={t("IDSelector.common.datePlaceholder")}
                format="DD/MM/YYYY"
                disabled={disableAutoFilledFields("passportExpiryDate")}
                value={toPickerMoment(
                  current.passportExpiryDate as string,
                  "YYYY-MM-DD",
                )}
                onChange={(date) =>
                  onFieldChange(
                    "passportExpiryDate",
                    date ? date.format("YYYY-MM-DD") : undefined,
                  )
                }
              />
            </Field>
          </Col>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.visaExpiryDate")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="visaExpiryDate"
              validator={(value) => (!value ? t("IDSelector.common.datePlaceholder") : "")}
              decorator={[FormItem]}
            >
              <DatePicker
                style={{ width: "100%" }}
                placeholder={t("IDSelector.common.datePlaceholder")}
                format="DD/MM/YYYY"
                disabled={disableAutoFilledFields("visaExpiryDate")}
                disabledDate={disablePastDate}
                value={toPickerMoment(
                  current.visaExpiryDate as string,
                  "YYYY-MM-DD",
                )}
                onChange={(date) =>
                  onFieldChange(
                    "visaExpiryDate",
                    date ? date.format("YYYY-MM-DD") : undefined,
                  )
                }
              />
            </Field>
          </Col>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.occupation")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="occupation"
              validator={(value) => validateOccupation(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.occupation")}
                maxLength={OCCUPATION_MAX_LENGTH}
                value={current.occupation || ""}
                disabled={disableAutoFilledFields("occupation")}
                onChange={(e) => onFieldChange("occupation", e.target.value)}
              />
            </Field>
          </Col>
          <Col xs={24} md={12}></Col>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              <PersonalPhotoLabel />
            </div>
            <Field
              name="PersonalPhoto"
              validator={(value) => (!value ? t("IDSelector.validation.required") : "")}
              decorator={[FormItem]}
            >
              <DocumentViewer
                fileType="JPG"
                value={current.PersonalPhoto}
                onChange={(value) =>
                  onFieldChange(
                    "PersonalPhoto",
                    Array.isArray(value) ? value[0] : value,
                  )
                }
                hasDelete={isFieldEditable("PersonalPhoto")}
                disabled={!isFieldEditable("PersonalPhoto")}
                hasDownload={true}
                uploadConfig={{
                  maxCount: 1,
                  maxSize: 5,
                  placeholder: t("IDSelector.common.upload"),
                  uploadTip: t("IDSelector.uploadTip.image", { size: 5 }),
                  showUploadTip: false,
                  invalidFileTypeMessage: t("IDSelector.validation.imageOnly"),
                  maxSizeErrorMessage: t("IDSelector.validation.fileSize", { size: 5 }),
                  accept: ".jpg,.jpeg,.png",
                }}
              />
            </Field>
          </Col>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.passport")}<span className="idselector-required">*</span>
              <Tooltip title={t("IDSelector.tooltip.pdfUpload")}>
                <QuestionCircleOutlined style={{ marginLeft: 4, color: "#999" }} />
              </Tooltip>
            </div>
            <Field
              name="Passport"
              validator={(value) => (!value ? t("IDSelector.validation.required") : "")}
              decorator={[FormItem]}
            >
              <DocumentViewer
                value={current.Passport}
                fileType="PDF"
                onChange={(value) =>
                  onFieldChange("Passport", Array.isArray(value) ? value[0] : value)
                }
                hasDelete={isFieldEditable("Passport")}
                disabled={!isFieldEditable("Passport")}
                hasDownload={true}
                uploadConfig={{
                  maxCount: 1,
                  maxSize: 5,
                  placeholder: t("IDSelector.common.upload"),
                  uploadTip: t("IDSelector.uploadTip.pdf", { size: 5 }),
                  showUploadTip: false,
                  invalidFileTypeMessage: t("IDSelector.validation.pdfOnly"),
                  maxSizeErrorMessage: t("IDSelector.validation.fileSize", { size: 5 }),
                  accept: ".pdf",
                }}
              />
            </Field>
          </Col>
          <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.visa")}<span className="idselector-required">*</span>
              <Tooltip title={t("IDSelector.tooltip.pdfUpload")}>
                <QuestionCircleOutlined style={{ marginLeft: 4, color: "#999" }} />
              </Tooltip>
            </div>
            <Field
              name="Visa"
              validator={(value) => (!value ? t("IDSelector.validation.required") : "")}
              decorator={[FormItem]}
            >
              <DocumentViewer
                fileType="PDF"
                value={current.Visa}
                onChange={(value) =>
                  onFieldChange("Visa", Array.isArray(value) ? value[0] : value)
                }
                hasDelete={isFieldEditable("Visa")}
                disabled={!isFieldEditable("Visa")}
                hasDownload={true}
                uploadConfig={{
                  maxCount: 1,
                  maxSize: 5,
                  placeholder: t("IDSelector.common.upload"),
                  uploadTip: t("IDSelector.uploadTip.pdf", { size: 5 }),
                  showUploadTip: false,
                  invalidFileTypeMessage: t("IDSelector.validation.pdfOnly"),
                  maxSizeErrorMessage: t("IDSelector.validation.fileSize", { size: 5 }),
                  accept: ".pdf",
                }}
              />
            </Field>
          </Col>
        </>
      )}
    </Row>
  );
};

export default UidFields;
