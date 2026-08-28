import KnowledgeImage1 from "@/assets/images/kn1.svg";
import KnowledgeImage2 from "@/assets/images/kn2.svg";
import KnowledgeImage3 from "@/assets/images/kn3.svg";
import KnowledgeImage4 from "@/assets/images/kn4.svg";
import KnowledgeImage5 from "@/assets/images/kn5.svg";
import KnowledgeImage6 from "@/assets/images/kn6.svg";
import KnowledgeImage7 from "@/assets/images/kn7.svg";

export interface KnowledgeDetailSection {
  id: number;
  titleKey: string;
  contentKey?: string;
  detailItems?: Array<{
    titleKey: string;
    descriptionKey: string;
  }>;
  detailKeys?: string[];
  detailListType?: "ordered" | "unordered";
}

export interface KnowledgeDetailPage {
  titleKey: string;
  introKey: string;
  sections: KnowledgeDetailSection[];
  guidanceKey: string;
}

export interface KnowledgeItem {
  id: number;
  img: string;
  url?: {
    en?: string;
    ar?: string;
  };
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
  detail?: KnowledgeDetailPage;
}

export const KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 1,
    img: KnowledgeImage1,
    detail: {
      titleKey: "knowledgeCenterDetail.details.profiles.title",
      introKey: "knowledgeCenterDetail.details.profiles.intro",
      sections: [
        {
          id: 1,
          titleKey:
            "knowledgeCenterDetail.details.profiles.sections.whatIsProfile.title",
          contentKey:
            "knowledgeCenterDetail.details.profiles.sections.whatIsProfile.content",
          detailItems: [
            {
              titleKey:
                "knowledgeCenterDetail.details.profiles.sections.whatIsProfile.individual.title",
              descriptionKey:
                "knowledgeCenterDetail.details.profiles.sections.whatIsProfile.individual.description",
            },
            {
              titleKey:
                "knowledgeCenterDetail.details.profiles.sections.whatIsProfile.establishment.title",
              descriptionKey:
                "knowledgeCenterDetail.details.profiles.sections.whatIsProfile.establishment.description",
            },
          ],
          detailListType: "unordered",
        },
        {
          id: 2,
          titleKey:
            "knowledgeCenterDetail.details.profiles.sections.establishmentSubtypes.title",
          contentKey:
            "knowledgeCenterDetail.details.profiles.sections.establishmentSubtypes.content",
        },
        {
          id: 3,
          titleKey:
            "knowledgeCenterDetail.details.profiles.sections.choosingProfile.title",
          contentKey:
            "knowledgeCenterDetail.details.profiles.sections.choosingProfile.content",
        },
        {
          id: 4,
          titleKey:
            "knowledgeCenterDetail.details.profiles.sections.multipleProfiles.title",
          contentKey:
            "knowledgeCenterDetail.details.profiles.sections.multipleProfiles.content",
        },
        {
          id: 5,
          titleKey:
            "knowledgeCenterDetail.details.profiles.sections.addOrSwitch.title",
          detailKeys: [
            "knowledgeCenterDetail.details.profiles.sections.addOrSwitch.addProfile",
            "knowledgeCenterDetail.details.profiles.sections.addOrSwitch.switchProfile",
          ],
          detailListType: "unordered",
        },
        {
          id: 6,
          titleKey:
            "knowledgeCenterDetail.details.profiles.sections.verification.title",
          contentKey:
            "knowledgeCenterDetail.details.profiles.sections.verification.content",
        },
      ],
      guidanceKey: "knowledgeCenterDetail.details.profiles.guidance",
    },
    titleEn: "Getting Started with Profiles",
    titleAr: "البدء باستخدام الملفات الشخصية",
    contentEn:
      "Understand profile types and how to get started with applications",
    contentAr:
      "تعرّف على أنواع الملفات الشخصية وكيفية البدء في تقديم الطلبات",
  },
  {
    id: 2,
    img: KnowledgeImage2,
    url: {
      en: "https://www.nma.gov.ae/en/api?url=/uploads/media_services_guide_281dd22a01.pdf",
      ar: "https://www.nma.gov.ae/ar/api?url=/uploads/dlyl_alkhdmat_alielamyt_0dac539d6c.pdf",
    },
    titleEn: "Media Service Guides",
    titleAr: "أدلة الخدمات الإعلامية",
    contentEn:
      "Complete walkthrough of media services, application steps and required documents",
    contentAr:
      "دليل شامل للخدمات الإعلامية وخطوات تقديم الطلبات والمستندات المطلوبة",
  },
  {
    id: 3,
    img: KnowledgeImage3,
    url: {
      en: "https://uaelegislation.gov.ae/en/legislations/2869/regulations",
      ar: "https://uaelegislation.gov.ae/ar/legislations/2869/regulations",
    },
    titleEn: "Media Service Fees",
    titleAr: "رسوم الخدمات الإعلامية",
    contentEn:
      "Official reference for media service fees and related regulations",
    contentAr:
      "مرجع رسمي لرسوم الخدمات الإعلامية واللوائح ذات الصلة",
  },
  {
    id: 4,
    img: KnowledgeImage4,
    url: {
      en: "https://www.nma.gov.ae/en/uae/media-content-standards",
      ar: "https://www.nma.gov.ae/ar/uae/media-content-standards",
    },
    titleEn: "Media Content Standards",
    titleAr: "معايير المحتوى الإعلامي",
    contentEn:
      "Essential guidelines for media content standards and compliance requirements",
    contentAr:
      "إرشادات أساسية لمعايير المحتوى الإعلامي ومتطلبات الامتثال",
  },
  {
    id: 5,
    img: KnowledgeImage5,
    url: {
      en: "https://www.nma.gov.ae/en/api?url=/uploads/qrar_mjls_alwzrae_rqm_42_lsnt_2025_fy_shan_layht_almkhalfat_waljzaeat_alidaryt_f4d47f3d23.pdf",
      ar: "https://www.nma.gov.ae/en/api?url=/uploads/qrar_mjls_alwzrae_rqm_42_lsnt_2025_fy_shan_layht_almkhalfat_waljzaeat_alidaryt_f4d47f3d23.pdf",
    },
    titleEn: "Administrative Violations and Penalties",
    titleAr: "المخالفات والجزاءات الإدارية",
    contentEn:
      "Official reference for media administrative violations and penalties",
    contentAr:
      "مرجع رسمي للمخالفات والجزاءات الإدارية في المجال الإعلامي",
  },
  {
    id: 6,
    img: KnowledgeImage6,
    detail: {
      titleKey: "knowledgeCenterDetail.details.serviceRequest.title",
      introKey: "knowledgeCenterDetail.details.serviceRequest.intro",
      sections: [
        {
          id: 1,
          titleKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.signIn.title",
          contentKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.signIn.content",
        },
        {
          id: 2,
          titleKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.selectService.title",
          contentKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.selectService.content",
        },
        {
          id: 3,
          titleKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.confirmProfile.title",
          contentKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.confirmProfile.content",
        },
        {
          id: 4,
          titleKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.completeApplication.title",
          contentKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.completeApplication.content",
        },
        {
          id: 5,
          titleKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.payment.title",
          contentKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.payment.content",
          detailItems: [
            {
              titleKey:
                "knowledgeCenterDetail.details.serviceRequest.sections.payment.payFirst.title",
              descriptionKey:
                "knowledgeCenterDetail.details.serviceRequest.sections.payment.payFirst.description",
            },
            {
              titleKey:
                "knowledgeCenterDetail.details.serviceRequest.sections.payment.reviewFirst.title",
              descriptionKey:
                "knowledgeCenterDetail.details.serviceRequest.sections.payment.reviewFirst.description",
            },
          ],
          detailKeys: [
            "knowledgeCenterDetail.details.serviceRequest.sections.payment.timing",
          ],
          detailListType: "unordered",
        },
        {
          id: 6,
          titleKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.submitAndTrack.title",
          contentKey:
            "knowledgeCenterDetail.details.serviceRequest.sections.submitAndTrack.content",
        },
      ],
      guidanceKey: "knowledgeCenterDetail.details.serviceRequest.guidance",
    },
    titleEn: "How to Submit a Service Request",
    titleAr: "كيفية تقديم طلب خدمة",
    contentEn:
      "Step by step guide for submitting and tracking a new service request",
    contentAr:
      "دليل خطوة بخطوة لتقديم طلب خدمة جديد ومتابعته",
  },
  {
    id: 7,
    img: KnowledgeImage7,
    detail: {
      titleKey: "knowledgeCenterDetail.details.refundRequest.title",
      introKey: "knowledgeCenterDetail.details.refundRequest.intro",
      sections: [
        {
          id: 1,
          titleKey:
            "knowledgeCenterDetail.details.refundRequest.sections.paymentsOption.title",
          detailKeys: [
            "knowledgeCenterDetail.details.refundRequest.sections.paymentsOption.signIn",
            "knowledgeCenterDetail.details.refundRequest.sections.paymentsOption.findPayment",
            "knowledgeCenterDetail.details.refundRequest.sections.paymentsOption.selectRefund",
            "knowledgeCenterDetail.details.refundRequest.sections.paymentsOption.submit",
          ],
          detailListType: "ordered",
        },
        {
          id: 2,
          titleKey:
            "knowledgeCenterDetail.details.refundRequest.sections.refundMenuOption.title",
          detailKeys: [
            "knowledgeCenterDetail.details.refundRequest.sections.refundMenuOption.signIn",
            "knowledgeCenterDetail.details.refundRequest.sections.refundMenuOption.addRequest",
            "knowledgeCenterDetail.details.refundRequest.sections.refundMenuOption.submit",
          ],
          detailListType: "ordered",
        },
        {
          id: 3,
          titleKey:
            "knowledgeCenterDetail.details.refundRequest.sections.track.title",
          contentKey:
            "knowledgeCenterDetail.details.refundRequest.sections.track.content",
        },
      ],
      guidanceKey: "knowledgeCenterDetail.details.refundRequest.guidance",
    },
    titleEn: "How to Submit a Refund Request",
    titleAr: "كيفية تقديم طلب استرداد",
    contentEn:
      "Step by step guide for submitting and tracking a refund request",
    contentAr:
      "دليل خطوة بخطوة لتقديم طلب استرداد ومتابعته",
  },
];

export const getKnowledgeItemUrl = (
  item: KnowledgeItem | null | undefined,
  language?: string,
): string | null => {
  if (!item?.url) {
    return null;
  }

  const url = language?.startsWith("ar")
    ? item.url.ar || item.url.en
    : item.url.en || item.url.ar;

  return url || null;
};
