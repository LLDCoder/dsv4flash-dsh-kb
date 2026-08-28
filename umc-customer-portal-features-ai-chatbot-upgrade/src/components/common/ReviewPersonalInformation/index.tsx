import { RightOutlined } from "@ant-design/icons";
import "./ReviewPersonalInformation.less";
import DocumentViewer from "../DocumentViewer";
import { useTranslation } from "react-i18next";
import { preferLocalizedEnAr } from "@/utils/bilingualDisplay";

import moment from "moment";
interface ReviewProfileInfoProps {
  expanded: boolean;
  onToggle: () => void;
  ProfileInfoIndex: UserProfileData;
}
interface NationalityInfo {
  id: number;
  code: string | null;
  nameEn: string;
  nameAr: string;
}

interface GenderInfo {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
}

interface EmirateInfo {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
}

interface RegionInfo {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
}

interface AreaInfo {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
}

interface ProFileStatus {
  id: number;
  code: string;
  nameEn: string;
  nameAr: string;
}

interface UserProfileData {
  type: number;
  profileCode: string;
  userId: string;
  proFileId: number;
  rejectReason: string | null;
  dateOfBirth: string;
  passportNumber: string;
  uid: string;
  email: string;
  mobileNumber: string;
  emiratesId: string;
  fullNameAr: string;
  fullNameEn: string;
  nationalityId: number;
  nationalityInfo: NationalityInfo;
  genderId: number;
  genderInfo: GenderInfo;
  passportExpiryDate: string;
  emiratesIdexpiryDate: string | null;
  occupation: string;
  personalPhotoUrl: string;
  passportCopyUrl: string;
  emiratesIdCopyUrl: string | null;
  visaCopyUrl: string;
  visaExpiryDate: string;
  emirateId: number;
  emirateInfo: EmirateInfo;
  regionId: number;
  regionInfo: RegionInfo;
  areaId: number;
  areaInfo: AreaInfo;
  street: string;
  proFileStatus: ProFileStatus;
}

export default function ReviewPersonalInformation({
  expanded,
  onToggle,
  ProfileInfoIndex,
}: ReviewProfileInfoProps) {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const formatDate = (
    dateString: string,
    format: string = "DD/MM/YYYY"
  ): string => {
    if (!dateString) return "-";
    return moment(dateString).format(format);
  };

  const renderUIDFields = () => {
    return (
      <div className="section-content">
        <div className="info-block">
          <h4 className="block-title">
            {t("personalProfilePage.sections.personalInformation")}
          </h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.dateOfBirth")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.dateOfBirth
                  ? formatDate(ProfileInfoIndex?.dateOfBirth)
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.uid")}
              </span>
              <span className="info-value">{ProfileInfoIndex?.uid || "-"}</span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.fullNameArabic")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.fullNameAr || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.fullNameEnglish")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.fullNameEn || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.nationality")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.nationalityInfo?.nameEn,
                  ProfileInfoIndex?.nationalityInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.gender")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.genderInfo?.nameEn,
                  ProfileInfoIndex?.genderInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.passportExpiryDate")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.passportExpiryDate
                  ? formatDate(ProfileInfoIndex?.passportExpiryDate)
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.visaExpiryDate")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.visaExpiryDate
                  ? formatDate(ProfileInfoIndex?.visaExpiryDate)
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.occupation")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.occupation || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="info-block">
          <h4 className="block-title">
            {t("personalProfilePage.sections.personalDocuments")}
          </h4>
          <div className="documents-grid">
            <div className="document-info">
              <span className="document-label">
                {t("personalProfilePage.fields.personalPhoto")}
              </span>
              {ProfileInfoIndex?.personalPhotoUrl ? (
                <DocumentViewer
                  key={ProfileInfoIndex?.personalPhotoUrl}
                  fileName={ProfileInfoIndex?.personalPhotoUrl}
                ></DocumentViewer>
              ) : (
                "-"
              )}
            </div>

            <div className="document-info">
              <span className="document-label">
                {t("personalProfilePage.fields.passport")}
              </span>
              {ProfileInfoIndex?.passportCopyUrl ? (
                <DocumentViewer
                  key={ProfileInfoIndex?.passportCopyUrl}
                  fileName={ProfileInfoIndex?.passportCopyUrl}
                ></DocumentViewer>
              ) : (
                "-"
              )}
            </div>

            <div className="document-info">
              <span className="document-label">
                {t("personalProfilePage.fields.visa")}
              </span>
              {ProfileInfoIndex?.visaCopyUrl ? (
                <DocumentViewer
                  key={ProfileInfoIndex?.visaCopyUrl}
                  fileName={ProfileInfoIndex?.visaCopyUrl}
                ></DocumentViewer>
              ) : (
                "-"
              )}
            </div>
          </div>
        </div>

        <div className="info-block">
          <h4 className="block-title">
            {t("personalProfilePage.sections.addressInformation")}
          </h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.emirate")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.emirateInfo?.nameEn,
                  ProfileInfoIndex?.emirateInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.region")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.regionInfo?.nameEn,
                  ProfileInfoIndex?.regionInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.area")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.areaInfo?.nameEn,
                  ProfileInfoIndex?.areaInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.street")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.street || "-"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderPassportFields = () => {
    return (
      <div className="section-content">
        <div className="info-block">
          <h4 className="block-title">
            {t("personalProfilePage.sections.personalInformation")}
          </h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.dateOfBirth")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.dateOfBirth
                  ? formatDate(ProfileInfoIndex?.dateOfBirth)
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.passportNumber")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.passportNumber || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.fullNameArabic")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.fullNameAr || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.fullNameEnglish")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.fullNameEn || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.nationality")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.nationalityInfo?.nameEn,
                  ProfileInfoIndex?.nationalityInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.gender")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.genderInfo?.nameEn,
                  ProfileInfoIndex?.genderInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.expiryDate")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.emiratesIdexpiryDate
                  ? formatDate(ProfileInfoIndex?.emiratesIdexpiryDate)
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.occupation")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.occupation || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="info-block">
          <h4 className="block-title">
            {t("personalProfilePage.sections.personalDocuments")}
          </h4>
          <div className="documents-grid">
            <div className="document-info">
              <span className="document-label">
                {t("personalProfilePage.fields.personalPhoto")}
              </span>
              {ProfileInfoIndex?.personalPhotoUrl ? (
                <DocumentViewer
                  key={ProfileInfoIndex?.personalPhotoUrl}
                  fileName={ProfileInfoIndex?.personalPhotoUrl}
                ></DocumentViewer>
              ) : (
                "-"
              )}
            </div>

            <div className="document-info">
              <span className="document-label">
                {t("personalProfilePage.fields.passportScan")}
              </span>
              {ProfileInfoIndex?.passportCopyUrl ? (
                <DocumentViewer
                  key={ProfileInfoIndex?.passportCopyUrl}
                  fileName={ProfileInfoIndex?.passportCopyUrl}
                ></DocumentViewer>
              ) : (
                "-"
              )}
            </div>
          </div>
        </div>

        <div className="info-block">
          <h4 className="block-title">
            {t("personalProfilePage.sections.addressInformation")}
          </h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.emirate")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.emirateInfo?.nameEn,
                  ProfileInfoIndex?.emirateInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.region")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.regionInfo?.nameEn,
                  ProfileInfoIndex?.regionInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.area")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.areaInfo?.nameEn,
                  ProfileInfoIndex?.areaInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.street")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.street || "-"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderEmiratesIdFields = () => {
    return (
      <div className="section-content">
        <div className="info-block">
          <h4 className="block-title">
            {t("personalProfilePage.sections.personalInformation")}
          </h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.dateOfBirth")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.dateOfBirth
                  ? formatDate(ProfileInfoIndex?.dateOfBirth)
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.emiratesId")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.emiratesId || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.fullNameArabic")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.fullNameAr || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.fullNameEnglish")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.fullNameEn || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.nationality")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.nationalityInfo?.nameEn,
                  ProfileInfoIndex?.nationalityInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.gender")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.genderInfo?.nameEn,
                  ProfileInfoIndex?.genderInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.emiratesIdExpiryDate")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.emiratesIdexpiryDate
                  ? formatDate(ProfileInfoIndex?.emiratesIdexpiryDate)
                  : "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.occupation")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.occupation || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="info-block">
          <h4 className="block-title">
            {t("personalProfilePage.sections.personalDocuments")}
          </h4>
          <div className="documents-grid">
            <div className="document-info">
              <span className="document-label">
                {t("personalProfilePage.fields.personalPhoto")}
              </span>
              {ProfileInfoIndex?.personalPhotoUrl ? (
                <DocumentViewer
                  key={ProfileInfoIndex?.personalPhotoUrl}
                  fileName={ProfileInfoIndex?.personalPhotoUrl}
                ></DocumentViewer>
              ) : (
                "-"
              )}
            </div>

            <div className="document-info">
              <span className="document-label">
                {t("personalProfilePage.fields.emiratesIdCopy")}
              </span>
              {ProfileInfoIndex?.emiratesIdCopyUrl ? (
                <DocumentViewer
                  key={ProfileInfoIndex?.emiratesIdCopyUrl}
                  fileName={ProfileInfoIndex?.emiratesIdCopyUrl}
                ></DocumentViewer>
              ) : (
                "-"
              )}
            </div>
          </div>
        </div>

        <div className="info-block">
          <h4 className="block-title">
            {t("personalProfilePage.sections.addressInformation")}
          </h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.emirate")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.emirateInfo?.nameEn,
                  ProfileInfoIndex?.emirateInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.region")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.regionInfo?.nameEn,
                  ProfileInfoIndex?.regionInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.area")}
              </span>
              <span className="info-value">
                {preferLocalizedEnAr(
                  isAr,
                  ProfileInfoIndex?.areaInfo?.nameEn,
                  ProfileInfoIndex?.areaInfo?.nameAr,
                ) || "-"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">
                {t("personalProfilePage.fields.street")}
              </span>
              <span className="info-value">
                {ProfileInfoIndex?.street || "-"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderFields = () => {
    if (ProfileInfoIndex?.type === 2) return renderUIDFields();
    if (ProfileInfoIndex?.type === 3) return renderPassportFields();
    return renderEmiratesIdFields();
  };
  return (
    <div className="ReviewPersonalInformation-section">
      <div className="section-header" onClick={onToggle}>
        <h3 className="section-title">
          {t("myRequestsPage.detail.profileInfo.title")}
        </h3>
        <RightOutlined
          className={`toggle-icon ${expanded ? "expanded" : ""}`}
        />
      </div>
      {expanded && renderFields()}
    </div>
  );
}
