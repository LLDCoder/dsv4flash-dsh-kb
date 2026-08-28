import React, { useState, useEffect, useMemo } from "react";
import { Collapse, Spin } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./index.less";
import Step1Icon from "@/assets/images/step1.svg";
import Step2Icon from "@/assets/images/step2.svg";
import Step3Icon from "@/assets/images/step3.svg";
import Step4Icon from "@/assets/images/step4.svg";
import Step5Icon from "@/assets/images/step5.svg";
import Step6Icon from "@/assets/images/step6.svg";
import RightArrowIcon from "@/assets/images/rightAr.svg";

import ValidityPeriodIcon from "@/assets/images/ValidityPeriod.svg";
import UserTypeIcon from "@/assets/images/UserType.svg";
import ScopeOfApplicationIcon from "@/assets/images/ScopeofApplication.svg";
import LastUpdatedDateIcon from "@/assets/images/LastUpdatedDate.svg";
import {
  getServiceLearn,
  type RelatedServiceDto,
  type ServiceLearnData,
} from "@/services/services";
import RelatedServiceCard from "@/pages/Services/components/ServiceCard";
import { ActionFooter, CustomButton, CustomMessage } from "@/components/common";
import {
  useGlobalServiceProfileSelection,
  useServiceEntryGateDialogController,
} from "@/components/ServiceEntryGate";
import { useServicesStore } from "@/store/services";
import { sanitizeRichTextHtml } from "@/utils/sanitizeRichTextHtml";
const { Panel } = Collapse;

type StepKey =
  | "fillInfo"
  | "submitApp"
  | "waitReview"
  | "approvalGranted"
  | "makePayment"
  | "documentIssuance";

const STEP_DEFS: { key: StepKey; icon: string }[] = [
  { key: "fillInfo", icon: Step1Icon },
  { key: "submitApp", icon: Step2Icon },
  { key: "waitReview", icon: Step3Icon },
  { key: "approvalGranted", icon: Step4Icon },
  { key: "makePayment", icon: Step5Icon },
  { key: "documentIssuance", icon: Step6Icon },
];

const getLocalizedText = (
  language: string,
  en?: string | null,
  ar?: string | null,
) => {
  const isArabic = language.toLowerCase().startsWith("ar");
  const primaryText = isArabic ? ar : en;
  const fallbackText = isArabic ? en : ar;
  return primaryText?.trim() || fallbackText?.trim() || "";
};

interface StartServicePayload {
  id: number;
  code?: string | null;
  nameEn?: string | null;
  nameAr?: string | null;
}

interface RelatedServiceCardItem {
  id: number;
  title: string;
  iconUri?: string | null;
  tags: string[];
  serviceCategoryNameEn: string;
  serviceCategoryNameAr?: string | null;
  nameEn: string;
  nameAr?: string | null;
  code?: string | null;
  isCollect: boolean;
  isFavorite: boolean;
  userTypes: string[];
  userTypeLabels: Array<{
    value: string;
    label: string;
  }>;
}

const ServiceCard: React.FC = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [serviceData, setServiceData] = useState<ServiceLearnData | null>(null);
  const [gateLoadingServiceId, setGateLoadingServiceId] = useState<
    number | null
  >(null);
  const { openDialog, dialogNode } = useServiceEntryGateDialogController();
  const {
    startService: startServiceWithProfileSelection,
    profileSelectionNode,
  } = useGlobalServiceProfileSelection();
  const currentLang = i18n.language || "en";
  const isAr = currentLang.toLowerCase().startsWith("ar");
  const history = useHistory();
  const updateServicesName = useServicesStore(
    (state) => state.updateServicesName,
  );
  const updateServicesCode = useServicesStore(
    (state) => state.updateServicesCode,
  );
  const updateServicesId = useServicesStore((state) => state.updateServicesId);
  const updateServiceProcessId = useServicesStore(
    (state) => state.updateServiceProcessId,
  );
  const updateServiceExpressSupport = useServicesStore(
    (state) => state.updateServiceExpressSupport,
  );
  const serviceId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get("id");
    if (!id) return null;
    const parsed = Number(id);
    return Number.isNaN(parsed) ? null : parsed;
  }, [location.search]);

  const isLicenseService = serviceData?.departmentId === 1;
  const stepOrder = isLicenseService ? [0, 1, 2, 3, 4, 5] : [0, 1, 4, 2, 3, 5];
  const steps = serviceData
    ? stepOrder.map((defIdx, i) => ({
        icon: STEP_DEFS[defIdx].icon,
        text: t(`serviceDetail.steps.${STEP_DEFS[defIdx].key}`),
        rightArrow: i < stepOrder.length - 1,
      }))
    : [];

  useEffect(() => {
    if (serviceId === null) {
      return;
    }
    setLoading(true);
    getServiceLearn(serviceId)
      .then((response) => {
        if (response?.data) {
          setServiceData(response.data);
          updateServicesName(response.data.serviceName || "");
          updateServicesId(response.data.serviceId || serviceId);
          if (response.data.serviceCode) {
            updateServicesCode(response.data.serviceCode);
          }
        } else {
          CustomMessage.error(t("serviceDetail.loadFailed"));
        }
      })
      .catch((error) => {
        console.error("Failed to fetch service learn info:", error);
        CustomMessage.error(t("serviceDetail.loadFailed"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [serviceId, t, updateServicesCode, updateServicesId, updateServicesName]);

  const getText = (en?: string | null, ar?: string | null) => {
    return getLocalizedText(currentLang, en, ar);
  };

  const relatedServiceCards = useMemo<RelatedServiceCardItem[]>(() => {
    const relatedServices = Array.isArray(serviceData?.relateServices)
      ? serviceData.relateServices
      : [];

    return relatedServices.reduce<RelatedServiceCardItem[]>(
      (cards, service) => {
        const relatedService = service as RelatedServiceDto;
        const relatedServiceId = Number(relatedService?.id);

        if (!Number.isFinite(relatedServiceId) || relatedServiceId <= 0) {
          return cards;
        }

        const nameEn = relatedService.nameEn ?? relatedService.nameAr ?? "";
        const nameAr = relatedService.nameAr ?? relatedService.nameEn ?? "";
        const categoryNameEn =
          relatedService.categoryNameEn ?? relatedService.categoryNameAr ?? "";
        const categoryNameAr =
          relatedService.categoryNameAr ?? relatedService.categoryNameEn ?? "";
        const userTypeLabels = Array.isArray(relatedService.userTypes)
          ? relatedService.userTypes
              .map((type) => {
                const label = getLocalizedText(
                  currentLang,
                  type?.nameEn,
                  type?.nameAr,
                );

                if (!label) {
                  return null;
                }

                return {
                  value:
                    type?.id === null || type?.id === undefined
                      ? label
                      : String(type.id),
                  label,
                };
              })
              .filter((item): item is { value: string; label: string } =>
                Boolean(item),
              )
          : [];

        cards.push({
          id: relatedServiceId,
          title: getLocalizedText(currentLang, nameEn, nameAr),
          iconUri: relatedService.iconUri,
          tags: [],
          serviceCategoryNameEn: categoryNameEn,
          serviceCategoryNameAr: categoryNameAr,
          nameEn,
          nameAr,
          code: relatedService.code ?? null,
          isCollect: false,
          isFavorite: false,
          userTypes: [],
          userTypeLabels,
        });

        return cards;
      },
      [],
    );
  }, [currentLang, serviceData?.relateServices]);

  const renderRichText = (content: string, fallback: React.ReactNode) => {
    if (!content) {
      return fallback;
    }

    const sanitizedContent = sanitizeRichTextHtml(content);
    if (!sanitizedContent.trim()) {
      return fallback;
    }

    return (
      <div
        className="service-detail-rich-text"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    );
  };

  const renderStaticTerms = () => {
    const terms = isAr
      ? {
          introduction: t("serviceDetail.terms.intro"),
          content: [
            t("serviceDetail.terms.p1"),
            t("serviceDetail.terms.p2"),
          ].join(" "),
          firstTitle: t("serviceDetail.terms.firstTitle"),
          firstSections: [
            t("serviceDetail.terms.first1"),
            t("serviceDetail.terms.first2"),
          ],
          secondTitle: t("serviceDetail.terms.secondTitle"),
          secondSections: [
            t("serviceDetail.terms.second1"),
            t("serviceDetail.terms.second2"),
            t("serviceDetail.terms.second3"),
          ],
        }
      : {
          introduction: "Introduction",
          content:
            "Welcome to the website of the UAE Media Council. Please read the terms and conditions carefully before using the website as they are clarifying the permitted and restricted usages. Your access to and use of the website of the UAE Media Council is subject to the terms and conditions set forth in this document, in addition to the laws of the United Arab Emirates. Your access to the website means your acceptance of these terms and conditions, unconditionally, and these terms and conditions are:",
          firstTitle: "First: Intellectual Property Rights",
          firstSections: [
            "1. All copyrights, rademarks, copyright and other intellectual property rights in all materials on the Website (including without limitation images, audios, charts, reports, files, software, data, applications, information, text, videos, logos, models, artwork other materials, animations, etc.) contained in or accessible through the Website are owned by the UAE Media Council.",
            "2. The information published on the website of the Council is for personal usage only, to conduct research and studies and to search for information and / or educational purposes only for the purposes of requesting services.",
            "The use of information published on the website of the Council for any commercial purposes shall not be permitted, including but not limited to: sale of published materials, distribution or republication.",
          ],
          secondTitle: "Second: Limits of Guarantees and Responsibilities",
          secondSections: [
            "1. The Council may modify or delete the information published without prior notice.",
            "2. The Council disclaims any liability for warranties and conditions relating to the information published.",
            "3. The Council is not responsible for any damage or whatever the damage, caused by information published, directly or indirectly, or due to the use of the site.",
            "The Council does not assume any lablity for loss of data or damage to computer systems as a result of the use of the website or published material and also disclaims any liability for any guarantee that the website and/or the service provider is free of malware.",
          ],
        };

    return (
      <div className="service-detail-static-content">
        <div>{terms.introduction}</div>
        <div>{terms.content}</div>

        <div>{terms.firstTitle}</div>
        {terms.firstSections.map((section) => (
          <div key={section}>{section}</div>
        ))}

        <div>{terms.secondTitle}</div>
        {terms.secondSections.map((section) => (
          <div key={section}>{section}</div>
        ))}
      </div>
    );
  };

  const descriptionContent = getText(
    serviceData?.serviceDescriptionEn,
    serviceData?.serviceDescriptionAr,
  );
  const feeContent = getText(
    serviceData?.serviceFeeEn,
    serviceData?.serviceFeeAr,
  );
  const deliveryTimeContent = getText(
    serviceData?.serviceDeliveryTimeEn,
    serviceData?.serviceDeliveryTimeAr,
  );
  if (loading) {
    return (
      <div
        className="service-detail-page"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!serviceData) {
    return (
      <div
        className="service-detail-page"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <div>{t("serviceDetail.noServiceData")}</div>
      </div>
    );
  }

  const handleStartService = async (targetService?: StartServicePayload) => {
    const resolvedServiceId = targetService?.id ?? serviceId;
    if (!resolvedServiceId) {
      return;
    }

    setGateLoadingServiceId(resolvedServiceId);
    try {
      updateServiceProcessId(null);
      updateServiceExpressSupport(null);

      await startServiceWithProfileSelection({
        history,
        serviceId: resolvedServiceId,
        serviceCode: targetService
          ? targetService.code ?? null
          : serviceData?.serviceCode || null,
        serviceName: targetService
          ? getText(targetService.nameEn, targetService.nameAr)
          : getText(serviceData?.serviceName, serviceData?.serviceNameAr),
        source: "services-card",
        openDialog,
      });
    } finally {
      setGateLoadingServiceId(null);
    }
  };

  const serviceStepsPrefix =
    serviceData.departmentId === 1 ? "license" : "content";

  return (
    <div className="service-detail-page">
      <div className="service-detail-content">
        <div className="left">
          <div className="steps-card">
            {serviceData.serviceName ? (
              <div className="steps-card-title">{serviceData.serviceName}</div>
            ) : null}
            <div className="steps-bar">
              {steps.map((item) => (
                <div className="step-item-box" key={item.text}>
                  <div className="step-item" key={item.text}>
                    <div className="step-item-icon-box">
                      <div className="step-item-icon">
                        <img src={item.icon} alt={item.text} />
                      </div>
                    </div>
                    <div className="step-item-text">
                      <span>{item.text}</span>
                    </div>
                  </div>

                  <div className="step-item-right-arrow-box">
                    {item.rightArrow && (
                      <img
                        src={RightArrowIcon}
                        className="right-arrow"
                        style={isAr ? { transform: "scaleX(-1)" } : undefined}
                        alt=""
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="service-sections">
            <Collapse
              bordered={false}
              expandIconPosition="right"
              expandIcon={({ isActive }) => {
                if (i18n.language.startsWith("ar")) {
                  return isActive ? <DownOutlined /> : <UpOutlined />;
                } else {
                  return isActive ? <UpOutlined /> : <DownOutlined />;
                }
              }}
            >
              <Panel
                header={t("serviceDetail.panels.description")}
                key="description"
              >
                {renderRichText(
                  descriptionContent,
                  <p>{t("serviceDetail.noDescription")}</p>,
                )}
              </Panel>

              <Panel header={t("serviceDetail.panels.process")} key="process">
                <div className="service-detail-static-content">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n}>
                      {t(
                        `serviceDetail.serviceSteps.${serviceStepsPrefix}.line${n}` as const,
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel header={t("serviceDetail.panels.related")} key="related">
                {relatedServiceCards.length > 0 ? (
                  <div className="related-services-grid">
                    {relatedServiceCards.map((service) => (
                      <RelatedServiceCard
                        key={service.id}
                        service={service}
                        selectOptions={[]}
                        onStartService={handleStartService}
                        gateLoading={gateLoadingServiceId === service.id}
                        showFavoriteAction={false}
                      />
                    ))}
                  </div>
                ) : (
                  <p>{t("serviceDetail.noRelated")}</p>
                )}
              </Panel>
              <Panel header={t("serviceDetail.panels.terms")} key="terms">
                {renderStaticTerms()}
              </Panel>
            </Collapse>
          </div>
        </div>

        <div className="right">
          <div className="info-card">
            <h3>{t("serviceDetail.sidebar.title")}</h3>
            <div className="info-item">
              <div className="info-label">
                {t("serviceDetail.sidebar.serviceFees")}
              </div>
              <div className="info-value">
                {feeContent || t("serviceDetail.noFee")}
              </div>
              <img src={ValidityPeriodIcon} className="info-item-img" alt="" />
            </div>
            <div className="info-item">
              <div className="info-label">
                {t("serviceDetail.sidebar.scopeOfApplication")}
              </div>
              <div className="info-value">
                {Array.isArray(serviceData.scopAppcations) &&
                serviceData.scopAppcations.length > 0
                  ? serviceData.scopAppcations
                      .map((scope) => getText(scope.nameEn, scope.nameAr))
                      .filter(Boolean)
                      .join(", ")
                  : "-"}
              </div>
              <img
                src={ScopeOfApplicationIcon}
                className="info-item-img"
                alt=""
              />
            </div>
            <div className="info-item">
              <div className="info-label">
                {t("serviceDetail.sidebar.userTypes")}
              </div>
              <div className="info-value">
                {Array.isArray(serviceData.userType) &&
                serviceData.userType.length > 0
                  ? serviceData.userType
                      .map((type) => getText(type.nameEn, type.nameAr))
                      .filter(Boolean)
                      .join(", ")
                  : "-"}
              </div>
              <img src={UserTypeIcon} className="info-item-img" alt="" />
            </div>
            <div className="info-item">
              <div className="info-label">
                {t("serviceDetail.sidebar.serviceDeliveryTime")}
              </div>
              <div className="info-value">
                {deliveryTimeContent || t("serviceDetail.timeNotSpecified")}
              </div>
              <img
                src={LastUpdatedDateIcon}
                className="info-item-img"
                alt=""
              />
            </div>
          </div>
        </div>
      </div>
      <ActionFooter
        backText={t("serviceDetail.back")}
        actions={
          <CustomButton
            onClick={() => {
              handleStartService();
            }}
            text={t("servicesPage.startService")}
            variant="primary"
            loading={gateLoadingServiceId === serviceId}
          />
        }
      ></ActionFooter>
      {dialogNode}
      {profileSelectionNode}
    </div>
  );
};

export default ServiceCard;
