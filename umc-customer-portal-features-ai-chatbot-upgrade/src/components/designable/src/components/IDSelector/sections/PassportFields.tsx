import React, { useEffect, useMemo, useState } from "react";
import { Field } from "@formily/react";
import { FormItem } from "@formily/antd";
import { Col, DatePicker, Input, Row, Select, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import DocumentViewer from "@/components/common/DocumentViewer/index";
import PersonalPhotoLabel from "../components/PersonalPhotoLabel";
import { selectDownIcon } from "@/utils/date";
import { toPickerMoment } from "@/utils/dateLocale";
import {
  getAreaList,
  getAllEmirateList,
  getEmirateList,
  getRegionList,
  type AreaItem,
  type EmirateItem,
  type RegionItem,
} from "@/services/address";
import {
  CONTACT_NUMBER_MAX_LENGTH,
  CONTACT_TEXT_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  OCCUPATION_MAX_LENGTH,
  PASSPORT_NUMBER_MAX_LENGTH,
  PASSPORT_TYPE_MAX_LENGTH,
  PLACE_OF_ISSUE_MAX_LENGTH,
  STREET_MAX_LENGTH,
  type SectionCommonProps,
  disableFutureDate,
  disablePastDate,
  normalizeArabicFullNameInput,
  normalizeArabicLettersInput,
  normalizeDigitsInput,
  normalizeEnglishFullNameInput,
  normalizeEnglishLettersInput,
  normalizePassportNumberInput,
  validateArabicFullName,
  validateAreaCode,
  validateEmailAddress,
  validateEnglishFullName,
  validateFax,
  validateOccupation,
  validatePassportNumber,
  validatePassportType,
  validatePlaceOfIssueAr,
  validatePlaceOfIssueEn,
  validateStreet,
  validateTelephoneNo,
  validateWorkNo,
} from "../idSelectorUtils";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";
import QueryInput from "../components/QueryInput";
import {
  DEFAULT_COUNTRY_DIAL_CODE,
  StandaloneMobileNumberInput,
  validateMobileNumber,
} from "@/components/common/MobileNumberInput";

const { Option } = Select;

const filterOptionByChildren = (input: string, option?: { children?: React.ReactNode }) =>
  String(option?.children ?? "")
    .toLowerCase()
    .includes(input.toLowerCase());

export const PassportFields: React.FC<SectionCommonProps> = ({
  current,
  showList,
  enablePassportExtendedFields,
  useAllEmirates,
  isFieldEditable,
  nationalityList,
  onFieldChange,
  onOpenOcr,
  queryLoading,
  showQueryButton,
  onQuery,
  onFieldsChange,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const nationalityLabel = (nationality: { nameEn?: string; nameAr?: string }) =>
    preferLocalizedEnAr(isAr, nationality.nameEn, nationality.nameAr) ||
    nationality.nameEn ||
    "";

  const [emirates, setEmirates] = useState<EmirateItem[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAddressLists = async () => {
      try {
        setLoadingAddress(true);
        const [emiratesResponse, regionsResponse, areasResponse] = await Promise.all([
          useAllEmirates ? getAllEmirateList() : getEmirateList(),
          getRegionList(),
          getAreaList(),
        ]);

        if (!cancelled) {
          setEmirates(emiratesResponse.data || []);
          setRegions(regionsResponse.data || []);
          setAreas(areasResponse.data || []);
        }
      } catch {
        if (!cancelled) {
          setEmirates([]);
          setRegions([]);
          setAreas([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAddress(false);
        }
      }
    };

    loadAddressLists();

    return () => {
      cancelled = true;
    };
  }, [useAllEmirates]);

  const showRegion = Number(current.emirateId) === 1;

  const filteredRegions = useMemo(() => {
    if (!current.emirateId) return [];
    return regions.filter((region) => region.emirateId === Number(current.emirateId));
  }, [current.emirateId, regions]);

  const filteredAreas = useMemo(() => {
    if (!current.emirateId) return [];

    if (showRegion) {
      if (!current.regionId) return [];
      return areas.filter((area) => area.regionId === Number(current.regionId));
    }

    const regionIds = new Set(
      regions
        .filter((region) => region.emirateId === Number(current.emirateId))
        .map((region) => region.id),
    );

    return areas.filter((area) => regionIds.has(area.regionId));
  }, [areas, current.emirateId, current.regionId, regions, showRegion]);

  const areaDisabled =
    !current.emirateId || (showRegion && !current.regionId);

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
          {t("IDSelector.label.passportNumber")} <span className="idselector-required">*</span>
        </div>
        <Field
          name="passportNumber"
          validator={(value) => validatePassportNumber(String(value || ""))}
          decorator={[FormItem]}
        >
          <QueryInput
            placeholder={t("IDSelector.placeholder.passportNumber")}
            maxLength={PASSPORT_NUMBER_MAX_LENGTH}
            value={current.passportNumber || ""}
            disabled={!isFieldEditable("passportNumber")}
            queryLoading={queryLoading}
            showQueryButton={showQueryButton}
            ocrDisabled={!isFieldEditable("passportNumber") || queryLoading}
            onOcrClick={onOpenOcr}
            ocrTitle={t("ocr.trigger")}
            onQuery={onQuery}
            onChange={(e) =>
              onFieldChange(
                "passportNumber",
                normalizePassportNumberInput(e.target.value),
              )
            }
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
                disabled={!isFieldEditable("fullNameArabic")}
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
                disabled={!isFieldEditable("fullNameEnglish")}
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
                disabled={!isFieldEditable("nationality")}
                onChange={(value) => onFieldChange("nationality", value)}
                suffixIcon={selectDownIcon}
                filterOption={filterOptionByChildren}
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
                disabled={!isFieldEditable("gender")}
                onChange={(value) => onFieldChange("gender", value)}
                suffixIcon={selectDownIcon}
                filterOption={filterOptionByChildren}
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
                disabled={!isFieldEditable("occupation")}
                onChange={(e) => onFieldChange("occupation", e.target.value)}
              />
            </Field>
          </Col>
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.passportType")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="passportType"
              validator={(value) => validatePassportType(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.passportType")}
                maxLength={PASSPORT_TYPE_MAX_LENGTH}
                value={current.passportType || ""}
                disabled={!isFieldEditable("passportType")}
                onChange={(e) => onFieldChange("passportType", e.target.value)}
              />
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.placeOfIssueEn")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="placeOfIssueEn"
              validator={(value) => validatePlaceOfIssueEn(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.placeOfIssueEn")}
                maxLength={PLACE_OF_ISSUE_MAX_LENGTH}
                value={current.placeOfIssueEn || ""}
                disabled={!isFieldEditable("placeOfIssueEn")}
                onChange={(e) =>
                  onFieldChange(
                    "placeOfIssueEn",
                    normalizeEnglishLettersInput(e.target.value),
                  )
                }
              />
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.placeOfIssueAr")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="placeOfIssueAr"
              validator={(value) => validatePlaceOfIssueAr(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.placeOfIssueAr")}
                dir="rtl"
                maxLength={PLACE_OF_ISSUE_MAX_LENGTH}
                value={current.placeOfIssueAr || ""}
                disabled={!isFieldEditable("placeOfIssueAr")}
                onChange={(e) =>
                  onFieldChange(
                    "placeOfIssueAr",
                    normalizeArabicLettersInput(e.target.value),
                  )
                }
              />
            </Field>
            </Col>
          ) : null}
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
                disabled={!isFieldEditable("passportExpiryDate")}
                disabledDate={disablePastDate}
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
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.emirate")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="emirateId"
              validator={(value) => (!value ? t("IDSelector.validation.selectEmirate") : "")}
              decorator={[FormItem]}
            >
              <Select
                placeholder={t("IDSelector.placeholder.emirate")}
                showSearch
                value={current.emirateId}
                disabled={!isFieldEditable("emirateId")}
                loading={loadingAddress}
                onChange={(value) => {
                  onFieldChange("emirateId", value);
                  onFieldChange("regionId", undefined);
                  onFieldChange("areaId", undefined);
                }}
                suffixIcon={selectDownIcon}
                filterOption={filterOptionByChildren}
              >
                {emirates.map((emirate) => (
                  <Option key={emirate.id} value={emirate.id}>
                    {preferLocalizedEnAr(isAr, emirate.nameEn, emirate.nameAr)}
                  </Option>
                ))}
              </Select>
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields && showRegion ? (
            <Col xs={24} md={12}>
              <div className="idselector-label">
                {t("IDSelector.label.region")}<span className="idselector-required">*</span>
              </div>
              <Field
                name="regionId"
                validator={(value) => (!value ? t("IDSelector.validation.selectRegion") : "")}
                decorator={[FormItem]}
              >
                <Select
                  placeholder={t("IDSelector.placeholder.region")}
                  showSearch
                  value={current.regionId}
                  disabled={!isFieldEditable("regionId") || !current.emirateId}
                  loading={loadingAddress}
                  onChange={(value) => {
                    onFieldChange("regionId", value);
                    onFieldChange("areaId", undefined);
                  }}
                  suffixIcon={selectDownIcon}
                  filterOption={filterOptionByChildren}
                >
                  {filteredRegions.map((region) => (
                    <Option key={region.id} value={region.id}>
                      {preferLocalizedEnAr(isAr, region.nameEn, region.nameAr)}
                    </Option>
                  ))}
                </Select>
              </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.area")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="areaId"
              validator={(value) => (!value ? t("IDSelector.validation.selectArea") : "")}
              decorator={[FormItem]}
            >
              <Select
                placeholder={t("IDSelector.placeholder.area")}
                showSearch
                value={current.areaId}
                disabled={!isFieldEditable("areaId") || areaDisabled}
                loading={loadingAddress}
                onChange={(value) => onFieldChange("areaId", value)}
                suffixIcon={selectDownIcon}
                filterOption={filterOptionByChildren}
              >
                {filteredAreas.map((area) => (
                  <Option key={area.id} value={area.id}>
                    {preferLocalizedEnAr(isAr, area.nameEn, area.nameAr)}
                  </Option>
                ))}
              </Select>
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.street")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="street"
              validator={(value) => validateStreet(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input.TextArea
                placeholder={t("IDSelector.placeholder.street")}
                rows={4}
                maxLength={STREET_MAX_LENGTH}
                value={current.street || ""}
                disabled={!isFieldEditable("street")}
                onChange={(e) => onFieldChange("street", e.target.value)}
              />
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.mobileNo")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="mobileNo"
              validator={(value) => {
                if (!current.mobileNoLocalNumber && value) return "";
                const validation = validateMobileNumber({
                  countryCode: String(
                    current.mobileNoCountryCode || DEFAULT_COUNTRY_DIAL_CODE,
                  ),
                  phoneNumber: String(
                    current.mobileNoLocalNumber || value || "",
                  ),
                });
                return validation.isValid ? "" : validation.message;
              }}
              decorator={[FormItem]}
            >
              <StandaloneMobileNumberInput
                placeholder={t("IDSelector.placeholder.mobileNo")}
                countryCode={
                  current.mobileNoCountryCode || DEFAULT_COUNTRY_DIAL_CODE
                }
                phoneNumber={current.mobileNoLocalNumber || current.mobileNo || ""}
                disabled={!isFieldEditable("mobileNo")}
                onCountryCodeChange={(countryCode) => {
                  const localNumber = current.mobileNoLocalNumber || "";
                  onFieldsChange({
                    mobileNo: localNumber
                      ? `${countryCode}${localNumber}`
                      : current.mobileNo || "",
                    mobileNoCountryCode: countryCode,
                    mobileNoLocalNumber: localNumber,
                  });
                }}
                onPhoneNumberChange={(value) => {
                  const countryCode =
                    current.mobileNoCountryCode || DEFAULT_COUNTRY_DIAL_CODE;
                  onFieldsChange({
                    mobileNo: value
                      ? `${countryCode}${value.replace(/\D/g, "")}`
                      : "",
                    mobileNoCountryCode: value ? countryCode : "",
                    mobileNoLocalNumber: value,
                  });
                }}
              />
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.telephoneNo")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="telephoneNo"
              validator={(value) => validateTelephoneNo(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.telephoneNo")}
                maxLength={CONTACT_NUMBER_MAX_LENGTH}
                value={current.telephoneNo || ""}
                disabled={!isFieldEditable("telephoneNo")}
                onChange={(e) =>
                  onFieldChange("telephoneNo", normalizeDigitsInput(e.target.value))
                }
              />
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.fax")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="fax"
              validator={(value) => validateFax(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.fax")}
                maxLength={CONTACT_NUMBER_MAX_LENGTH}
                value={current.fax || ""}
                disabled={!isFieldEditable("fax")}
                onChange={(e) =>
                  onFieldChange("fax", normalizeDigitsInput(e.target.value))
                }
              />
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.workNo")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="workNo"
              validator={(value) => validateWorkNo(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.workNo")}
                maxLength={CONTACT_NUMBER_MAX_LENGTH}
                value={current.workNo || ""}
                disabled={!isFieldEditable("workNo")}
                onChange={(e) =>
                  onFieldChange("workNo", normalizeDigitsInput(e.target.value))
                }
              />
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.areaCode")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="areaCode"
              validator={(value) => validateAreaCode(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.areaCode")}
                maxLength={CONTACT_TEXT_MAX_LENGTH}
                value={current.areaCode || ""}
                disabled={!isFieldEditable("areaCode")}
                onChange={(e) => onFieldChange("areaCode", e.target.value)}
              />
            </Field>
            </Col>
          ) : null}
          {enablePassportExtendedFields ? (
            <Col xs={24} md={12}>
            <div className="idselector-label">
              {t("IDSelector.label.emailAddress")}<span className="idselector-required">*</span>
            </div>
            <Field
              name="emailAddress"
              validator={(value) => validateEmailAddress(String(value || ""))}
              decorator={[FormItem]}
            >
              <Input
                placeholder={t("IDSelector.placeholder.emailAddress")}
                value={current.emailAddress || ""}
                disabled={!isFieldEditable("emailAddress")}
                onChange={(e) => onFieldChange("emailAddress", e.target.value)}
              />
            </Field>
            </Col>
          ) : null}
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
                value={current.PersonalPhoto}
                fileType="JPG"
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
              {t("IDSelector.label.passportScan")}<span className="idselector-required">*</span>
              <Tooltip title={t("IDSelector.tooltip.pdfUpload")}>
                <QuestionCircleOutlined style={{ marginLeft: 4, color: "#999" }} />
              </Tooltip>
            </div>
            <Field
              name="PassportScan"
              validator={(value) => (!value ? t("IDSelector.validation.required") : "")}
              decorator={[FormItem]}
            >
              <DocumentViewer
                value={current.PassportScan}
                fileType="PDF"
                onChange={(value) =>
                  onFieldChange(
                    "PassportScan",
                    Array.isArray(value) ? value[0] : value,
                  )
                }
                hasDelete={isFieldEditable("PassportScan")}
                disabled={!isFieldEditable("PassportScan")}
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

export default PassportFields;
