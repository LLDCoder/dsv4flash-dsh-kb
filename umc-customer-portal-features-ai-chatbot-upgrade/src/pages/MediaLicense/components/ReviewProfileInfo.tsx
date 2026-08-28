import { useEffect, useMemo, useState } from "react";
import { RightOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import "./ReviewProfileInfo.less";
import NumberIcon from "@/assets/images/number.svg";
import DizhiIcon from "@/assets/images/dizhi.svg";
import YonghuIcon from "@/assets/images/yonghu.svg";
import PersonIcon from "@/assets/images/person.svg";
import JigouIcon from "@/assets/images/jigou.svg";
import { CustomButton } from "@/components/common";
import DocumentViewer from "@/components/common/DocumentViewer";
import { AddressMapField } from "@/components/common/AddressMapPicker";
import {
  resolveProfileFormReviewAddress,
  type ProfileFormAddressPicker,
} from "@/components/designable/src/components/ProfileForm/profileFormRules";
import {
  getAreaList,
  getEmirateList,
  getRegionList,
} from "@/services/address";
import { useUserStore } from "@/store/user";
import PartnerDetailsModal from "@/pages/EstablishmentProfile/components/modal/PartnerDetailsModal";
import { type PartnerData } from "@/pages/EstablishmentProfile/components/modal/PartnerModal";

import moment from "moment";
import {
  getPartnersNewList,
  getPartnerById,
  type PartnerDetail,
  type PartnerListItem as UserProfilePartnerListItem,
} from "@/services/userProfile";
interface ReviewProfileInfoProps {
  expanded: boolean;
  onToggle: () => void;
  ProfileInfoIndex: ProfileInfoInter;
  addressPicker?: ProfileFormAddressPicker;
}
const CLEARED_PROFILE_ADDRESS = {
  emirate: undefined,
  region: undefined,
  area: undefined,
};
interface lagalInter {
  name: string;
  personalMobile: string;
  idType?: string;
  emiratesId: string;
  dateBirth: string;
  personalEmail: string;
  emirate: string;
  region: string;
  area: string;
  street: string;
}
export interface ProfileInfoInter {
  hasTradeLicense?: boolean;
  reserveTradeNumber?: string;
  reserveTradeName?: string;
  establishmentTypeName?: string;
  emails?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  nameAr?: string;
  nameEn?: string;
  addressName?: string;
  authorityIdName?: string;
  establishmentMobile?: string;
  tenancyContractEndDate?: string;
  legalPerson?: lagalInter;
  licenseCopyUrl?: string;
  tenancyContractCopyUrl?: string;
  memorandumOfAssociationCopyUrl?: string;
  powerOfAttorneyCopyUrl?: string;
  emirate?: string;
  region?: string;
  area?: string;
  street?: string;
  latitude?: number | null;
  longitude?: number | null;
}
export default function ReviewProfileInfo({
  expanded,
  onToggle,
  ProfileInfoIndex: profileInfoSource,
  addressPicker,
}: ReviewProfileInfoProps) {
  const { t, i18n } = useTranslation();
  const isAr = Boolean(i18n.language?.startsWith("ar"));
  const userInfo = useUserStore((state) => state.userInfo);
  const crrentUser = useUserStore((state) => state.currentProfileId);
  const [resolvedProfileAddress, setResolvedProfileAddress] = useState<
    Pick<ProfileInfoInter, "emirate" | "region" | "area">
  >({});
  const addressEmirateId = addressPicker?.emirateId;
  const addressRegionId = addressPicker?.regionId;
  const addressAreaId = addressPicker?.areaId;

  useEffect(() => {
    if (!addressPicker) {
      setResolvedProfileAddress({});
      return;
    }
    if (
      addressEmirateId === undefined &&
      addressRegionId === undefined &&
      addressAreaId === undefined
    ) {
      setResolvedProfileAddress({});
      return;
    }

    setResolvedProfileAddress(CLEARED_PROFILE_ADDRESS);
    let isActive = true;
    Promise.all([getEmirateList(), getRegionList(), getAreaList()])
      .then(([emiratesResponse, regionsResponse, areasResponse]) => {
        if (!isActive) return;

        setResolvedProfileAddress(
          resolveProfileFormReviewAddress(
            {},
            addressPicker,
            emiratesResponse.data || [],
            regionsResponse.data || [],
            areasResponse.data || [],
            isAr,
          ),
        );
      })
      .catch((error) => {
        if (!isActive) return;
        setResolvedProfileAddress(CLEARED_PROFILE_ADDRESS);
        console.error("Failed to load profile review address lookups:", error);
      });

    return () => {
      isActive = false;
    };
    // The three ids fully capture what the address lookup depends on; the
    // addressPicker object identity changes on every re-parse and would trigger
    // redundant emirate/region/area refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressAreaId, addressEmirateId, addressRegionId, isAr]);

  const ProfileInfoIndex = useMemo(
    () => ({ ...profileInfoSource, ...resolvedProfileAddress }),
    [profileInfoSource, resolvedProfileAddress],
  );
  const latitude = ProfileInfoIndex?.latitude;
  const longitude = ProfileInfoIndex?.longitude;
  const hasReviewMapCoordinates =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);
  const reviewMapEmirateName = ProfileInfoIndex?.emirate?.trim();
  const reviewMapCenterAddress = reviewMapEmirateName
    ? `${reviewMapEmirateName}, United Arab Emirates`
    : undefined;

  const [partnerDetailsModalVisible, setPartnerDetailsModalVisible] =
    useState(false);
  const [viewingPartner, setViewingPartner] = useState<PartnerData | null>(
    null
  );
  const handleViewPartner = (partner: UserProfilePartnerListItem) => {
    console.log(partner);
    getPartnerById(String(partner.id)).then((res: { data: PartnerDetail }) => {
      setViewingPartner({
        id: String(res.data.id),
        source: res.data.source,
        partnerTypeCode: res.data.partnerTypeCode,
        verificationMethod: res.data.verificationMethodCode,
        verificationMethodCode: res.data.verificationMethodCode,
        dateBirth: res.data.dateBirth,
        emiratesId: res.data.emiratesId,
        fullNameAr: res.data.fullNameAr,
        fullNameEn: res.data.fullNameEn,
        representativeNameEn: res.data.representativeNameEn,
        representativeNameAr: res.data.representativeNameAr,
        representativeEmiratesId: res.data.representativeEmiratesId,
        nationalityId: res.data.nationalityId,
        nationalityName: partner.nationalityIdInfo?.nameEn ?? "",
        genderId: res.data.genderId,
        expiryDate: res.data.expiryDate,
        occupation: res.data.occupation,
        personalPhotoUrl: res.data.personalPhotoUrl,
        passportUrl: res.data.passportUrl,
        visaUrl: res.data.visaUrl,
        emiratesIdUrl: res.data.emiratesIdUrl,
        emiratesIdurl: res.data.emiratesIdurl,
        uaeNumber: res.data.uaeNumber,
        passportExpiryDate: res.data.passportExpiryDate,
        visaExpiryDate: res.data.visaExpiryDate,
        passportNumber: res.data.passportNumber,
        passportScanUrl: res.data.passportScanUrl,
        memorandumOfAssociationUrl: res.data.memorandumOfAssociationUrl,
        powerOfAttorneyUrl: res.data.powerOfAttorneyUrl,
        statementUrl: res.data.statementUrl,
      });
      setPartnerDetailsModalVisible(true);
    });
  };
  const [partners, setPartners] = useState<UserProfilePartnerListItem[]>([]);
  useEffect(() => {
    let isActive = true;
    const currentEstablishment = userInfo.userEstablishments.find(
      (item) => item.userProfileId === crrentUser
    );

    if (!currentEstablishment) {
      setPartners([]);
      return;
    }

    setPartners([]);
    getPartnersNewList(currentEstablishment.id)
      .then((res) => {
        if (isActive) {
          setPartners(res.data ?? []);
        }
      })
      .catch(() => {
        if (isActive) {
          setPartners([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [crrentUser, userInfo.userEstablishments]);
  return (
    <div className="review-section">
      <div className="section-header" onClick={onToggle}>
        <h3 className="section-title">
          {t("myRequestsPage.detail.profileInfo.title")}
        </h3>
        <RightOutlined
          className={`toggle-icon ${expanded ? "expanded" : ""}`}
        />
      </div>

      {expanded && (
        <div className="section-content">
          <div className="info-block">
            <h4 className="block-title">
              {t("myRequestsPage.detail.profileInfo.establishmentInformation")}
            </h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">
                  {t(
                    "myRequestsPage.detail.profileInfo.fields.establishmentSubTypes"
                  )}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.establishmentTypeName || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {t("myRequestsPage.detail.profileInfo.fields.workEmail")}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.emails || "-"}
                </span>
              </div>
              {ProfileInfoIndex.hasTradeLicense === false ? (
                <div className="info-item">
                  <span className="info-label">
                    {t("ProfileForm.label.reserveTradeNumber")}
                  </span>
                  <span className="info-value">
                    {ProfileInfoIndex.reserveTradeNumber || "-"}
                  </span>
                </div>
              ) : (
                <>
                  <div className="info-item">
                    <span className="info-label">
                      {t(
                        "myRequestsPage.detail.profileInfo.fields.commercialLicenseNumber"
                      )}
                    </span>
                    <span className="info-value">
                      {ProfileInfoIndex?.licenseNumber || "-"}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">
                      {t(
                        "myRequestsPage.detail.profileInfo.fields.licenseExpiryDate"
                      )}
                    </span>
                    <span className="info-value">
                      {ProfileInfoIndex?.licenseExpiryDate
                        ? moment(ProfileInfoIndex?.licenseExpiryDate).format(
                            "MM/DD/YYYY"
                          )
                        : "-"}
                    </span>
                  </div>
                </>
              )}
              <div className="info-item">
                <span className="info-label ">
                  {t(
                    "myRequestsPage.detail.profileInfo.fields.establishmentNameArabic"
                  )}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.nameAr || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {t(
                    "myRequestsPage.detail.profileInfo.fields.establishmentNameEnglish"
                  )}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.nameEn || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {t("myRequestsPage.detail.profileInfo.fields.emirate")}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.addressName || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {t(
                    "myRequestsPage.detail.profileInfo.fields.licensingAuthority"
                  )}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.authorityIdName || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {t("myRequestsPage.detail.profileInfo.fields.phoneNumber")}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.establishmentMobile || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {t(
                    "myRequestsPage.detail.profileInfo.fields.tenancyContractEndDate"
                  )}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.tenancyContractEndDate
                    ? moment(ProfileInfoIndex?.tenancyContractEndDate).format(
                        "MM/DD/YYYY"
                      )
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="info-block">
            <h4 className="block-title">
              {t("myRequestsPage.detail.profileInfo.establishmentDocuments")}
            </h4>
            <div className="documents-grid">
              {ProfileInfoIndex.hasTradeLicense === false ? (
                <div className="document-info">
                  <span className="document-label">
                    {t("ProfileForm.label.uploadReserveTradeName")}
                  </span>
                  {ProfileInfoIndex.reserveTradeName ? (
                    <DocumentViewer
                      hasDownload={true}
                      uploadConfig={{
                        maxCount: 1,
                        maxSize: 5,
                        uploadTip: "Maximum size: 5MB, File type: PDF",
                      }}
                      fileName={ProfileInfoIndex.reserveTradeName}
                    ></DocumentViewer>
                  ) : (
                    "-"
                  )}
                </div>
              ) : (
                <div className="document-info">
                  <span className="document-label">
                    {t(
                      "myRequestsPage.detail.profileInfo.documents.commercialLicense"
                    )}
                  </span>
                  {ProfileInfoIndex?.licenseCopyUrl ? (
                    <DocumentViewer
                      hasDownload={true}
                      uploadConfig={{
                        maxCount: 1,
                        maxSize: 5,
                        uploadTip:
                          "Maximum size: 5MB. File types: jpg, jpeg, and png.",
                      }}
                      fileName={ProfileInfoIndex?.licenseCopyUrl}
                    ></DocumentViewer>
                  ) : (
                    "-"
                  )}
                </div>
              )}

              <div className="document-info">
                <span className="document-label">
                  {t(
                    "myRequestsPage.detail.profileInfo.documents.tenancyContract"
                  )}
                </span>
                {ProfileInfoIndex?.tenancyContractCopyUrl ? (
                  <DocumentViewer
                    hasDownload={true}
                    uploadConfig={{
                      maxCount: 1,
                      maxSize: 5,
                      uploadTip:
                        "Maximum size: 5MB. File types: jpg, jpeg, and png.",
                    }}
                    fileName={ProfileInfoIndex?.tenancyContractCopyUrl}
                  ></DocumentViewer>
                ) : (
                  "-"
                )}
              </div>

              <div className="document-info">
                <span className="document-label">
                  {t(
                    "myRequestsPage.detail.profileInfo.documents.uploadMemorandumOfAssociation"
                  )}
                </span>
                {ProfileInfoIndex?.memorandumOfAssociationCopyUrl ? (
                  <DocumentViewer
                    hasDownload={true}
                    uploadConfig={{
                      maxCount: 1,
                      maxSize: 5,
                      uploadTip: "Maximum size: 5MB, File type: PDF",
                    }}
                    fileName={ProfileInfoIndex?.memorandumOfAssociationCopyUrl}
                  ></DocumentViewer>
                ) : (
                  "-"
                )}
              </div>

              <div className="document-info">
                <span className="document-label">
                  {t(
                    "myRequestsPage.detail.profileInfo.documents.uploadPowerOfAttorney"
                  )}
                </span>
                {ProfileInfoIndex?.powerOfAttorneyCopyUrl ? (
                  <DocumentViewer
                    hasDownload={true}
                    uploadConfig={{
                      maxCount: 1,
                      maxSize: 5,
                      uploadTip:
                        "Maximum size: 5MB. File types: jpg, jpeg, and png.",
                    }}
                    fileName={ProfileInfoIndex?.powerOfAttorneyCopyUrl}
                  ></DocumentViewer>
                ) : (
                  "-"
                )}
              </div>
            </div>
          </div>

          {/* <div className="info-block">
            <h4 className="block-title">Legal Person Information</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Legal Person</span>
                <span className="info-value">
                  {ProfileInfoIndex?.legalPerson?.name || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  Legal Person's Contact Number
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.legalPerson?.personalMobile || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">ID Type</span>
                <span className="info-value">
                  {ProfileInfoIndex?.legalPerson?.idType || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {ProfileInfoIndex?.legalPerson?.idType == "Passport ID"
                    ? "Passport Number"
                    : ProfileInfoIndex?.legalPerson?.idType || "-"}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.legalPerson?.emiratesId || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Date of Birth</span>
                <span className="info-value">
                  {ProfileInfoIndex?.legalPerson?.dateBirth
                    ? moment(ProfileInfoIndex?.legalPerson?.dateBirth).format(
                        "MM/DD/YYYY"
                      )
                    : "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">
                  {ProfileInfoIndex?.legalPerson?.personalEmail || "-"}
                </span>
              </div>
            </div>
          </div> */}

          <div className="info-block">
            <h4 className="block-title">
              {t("myRequestsPage.detail.profileInfo.addressInformation")}
            </h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">
                  {t("myRequestsPage.detail.profileInfo.fields.emirate")}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.emirate || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {t("myRequestsPage.detail.profileInfo.fields.region")}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.region || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {t("myRequestsPage.detail.profileInfo.fields.area")}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.area || "-"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {t("myRequestsPage.detail.profileInfo.fields.street")}
                </span>
                <span className="info-value">
                  {ProfileInfoIndex?.street || "-"}
                </span>
              </div>
            </div>
            {addressPicker && (reviewMapCenterAddress || hasReviewMapCoordinates) ? (
              <AddressMapField
                emirateList={[]}
                interactive={false}
                centerAddress={reviewMapCenterAddress}
                latitude={hasReviewMapCoordinates ? latitude : undefined}
                longitude={hasReviewMapCoordinates ? longitude : undefined}
                onPicked={() => undefined}
              />
            ) : null}
          </div>

          <div className="info-block">
            <h4 className="block-title">
              {t("myRequestsPage.detail.profileInfo.partnerList")}
            </h4>

            <div className="establishment-list">
              {partners?.length > 0
                ? partners?.map((item, index) => (
                    <div className="profile-card" key={index}>
                      <div className="profile-info">
                        <div className="profile-details">
                          <h3 className="profile-name">
                            {item.fullNameEn || "-"}
                          </h3>
                          {/* <div className="profile-status approved">Approved</div> */}
                          <div className="profile-item">
                            <img
                              src={YonghuIcon}
                              alt="type"
                              className="profile-icon"
                            />
                            <span>
                              {item.partnerTypeCodeInfo?.nameEn || "-"}
                            </span>
                          </div>
                          {(item.emiratesId ||
                            item.uaeNumber ||
                            item.passportNumber) && (
                            <div className="profile-item">
                              <img
                                src={NumberIcon}
                                alt="license"
                                className="profile-icon"
                              />
                              <span>
                                {item.emiratesId ||
                                  item.uaeNumber ||
                                  item.passportNumber ||
                                  ""}
                              </span>
                            </div>
                          )}
                          <div className="profile-item">
                            <img
                              src={DizhiIcon}
                              alt="id"
                              className="profile-icon"
                            />
                            <span>{item.nationalityIdInfo?.nameEn || "-"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="profile-right">
                        <div className="profile-avatar">
                            <img
                              src={
                              item.partnerTypeCode === "2"
                                ? PersonIcon
                                : JigouIcon
                            }
                            alt="avatar"
                          />
                        </div>

                        <CustomButton
                          customClassName="profile-btn"
                          text={t(
                            "myRequestsPage.detail.profileInfo.details"
                          )}
                          variant="primary"
                          onClick={() => handleViewPartner(item)}
                        />
                      </div>
                    </div>
                  ))
                : "-"}
            </div>
          </div>
        </div>
      )}
      <PartnerDetailsModal
        visible={partnerDetailsModalVisible}
        onCancel={() => setPartnerDetailsModalVisible(false)}
        partner={viewingPartner}
      />
    </div>
  );
}
