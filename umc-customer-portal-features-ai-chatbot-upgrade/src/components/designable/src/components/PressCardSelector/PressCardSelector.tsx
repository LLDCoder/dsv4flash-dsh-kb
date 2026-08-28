import { DEFAULT_COUNTRY_DIAL_CODE } from "@/components/common/MobileNumberInput";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select, Tabs } from "antd";
import moment from "moment";
import DocumentViewer from "../../../../common/DocumentViewer";
import type { FileType } from "../../../../common/DocumentViewer";
import EmptyBox from "../../../../common/EmptyBox/EmptyBox";
import { getPressCardByProfileId } from "@/services/services";
import { useUserStore } from "@/store/user";
import "./PressCardSelector.less";

type AttachmentItem = {
  name: string;
  filePath: string;
  fileUrl?: string;
  fileType: FileType;
};

type PressCardType = "Temporary Card" | "Permanent Card";

type PressCardRecord = {
  applicationId: string;
  applicationNumber: string;
  pressCardType: PressCardType;
  mediaType: string;
  issueDate: string;
  expiryDate: string;
  pressCard: AttachmentItem | null;
  concernCertificate: AttachmentItem | null;
  entity: {
    name: string;
    hqCountry: string;
    email: string;
    phoneNumber: string;
    website: string;
  };
  applicant: {
    fullName: string;
    nationality: string;
    gender: string;
    occupation: string;
    dateOfBirth: string;
    userType: string;
    email: string;
    personalPhoto: AttachmentItem | null;
    visa: AttachmentItem | null;
    twitterAccount: string;
    academicQualification: AttachmentItem | null;
  };
};

type PressCardSelectorValue =
  | string
  | number
  | null
  | undefined
  | Record<string, unknown>;

export type PressCardSelectorProps = {
  value?: PressCardSelectorValue;
  onChange?: (value?: PressCardSelectorValue) => void;
  placeholder?: string;
  designMode?: boolean;
};

const DEFAULT_PLACEHOLDER = "Select a press card";
const DEFAULT_ACTIVE_TAB = "application";

// Keep date rendering consistent across all detail sections.
const formatDisplayDate = (value?: string) => {
  if (!value) return "--";
  const formatted = moment(value);
  return formatted.isValid() ? formatted.format("DD/MM/YYYY") : value;
};

// Generate a lightweight inline mock image for design-mode attachments.
const buildMockImageUrl = (title: string, subtitle: string, accentColor: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
      <rect width="900" height="620" fill="#f7f4ed"/>
      <rect x="34" y="34" width="832" height="552" rx="28" fill="#ffffff" stroke="${accentColor}" stroke-width="8"/>
      <rect x="74" y="84" width="220" height="220" rx="20" fill="${accentColor}" opacity="0.14"/>
      <circle cx="184" cy="170" r="60" fill="${accentColor}" opacity="0.75"/>
      <rect x="354" y="110" width="330" height="30" rx="15" fill="${accentColor}" opacity="0.24"/>
      <rect x="354" y="160" width="250" height="24" rx="12" fill="#d9d9d9"/>
      <rect x="74" y="360" width="752" height="18" rx="9" fill="#efefef"/>
      <rect x="74" y="406" width="712" height="18" rx="9" fill="#efefef"/>
      <rect x="74" y="452" width="680" height="18" rx="9" fill="#efefef"/>
      <text x="354" y="245" fill="#1f1f1f" font-size="44" font-family="Arial, sans-serif" font-weight="700">${title}</text>
      <text x="354" y="292" fill="#6b7280" font-size="24" font-family="Arial, sans-serif">${subtitle}</text>
      <text x="74" y="535" fill="#8c8c8c" font-size="22" font-family="Arial, sans-serif">Mock attachment preview for PressCardSelector</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const normalizeFileName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const createAttachment = (
  name: string,
  subtitle: string,
  accentColor: string,
  fileType: FileType = "jpg"
): AttachmentItem => ({
  name,
  filePath: `/mock/press-card-selector/${normalizeFileName(name)}.${String(fileType).toLowerCase()}`,
  fileUrl: buildMockImageUrl(name, subtitle, accentColor),
  fileType,
});

// Static mock data keeps the selector fully usable in design/preview mode.
const MOCK_RECORDS: PressCardRecord[] = [
  {
    applicationId: "1801000123",
    applicationNumber: "APP-2026-000123",
    pressCardType: "Temporary Card",
    mediaType: "News Agency",
    issueDate: "2026-01-15",
    expiryDate: "2026-12-31",
    pressCard: createAttachment("Press Card", "Temporary card issued for field reporting", "#b88a2b"),
    concernCertificate: createAttachment(
      "To whom concern Certificate",
      "Supporting authority certificate",
      "#7058cc"
    ),
    entity: {
      name: "Global News Network",
      hqCountry: "United Kingdom",
      email: "licensing.globalnews@example.com",
      phoneNumber: "+44 20 7946 1200",
      website: "https://www.globalnewsnetwork.example",
    },
    applicant: {
      fullName: "Olivia Carter",
      nationality: "British",
      gender: "Female",
      occupation: "Senior Correspondent",
      dateOfBirth: "1991-08-17",
      userType: "Journalist",
      email: "olivia.carter@example.com",
      personalPhoto: createAttachment("Personal Photo", "Applicant profile photo", "#d46b08"),
      visa: createAttachment("Visa", "Valid UAE media visa", "#096dd9"),
      twitterAccount: "@oliviacreports",
      academicQualification: createAttachment(
        "Academic Qualification",
        "Journalism degree certificate",
        "#389e0d"
      ),
    },
  },
  {
    applicationId: "1801000187",
    applicationNumber: "APP-2026-000187",
    pressCardType: "Permanent Card",
    mediaType: "Broadcast Television",
    issueDate: "2026-02-08",
    expiryDate: "2028-02-07",
    pressCard: createAttachment("Press Card", "Permanent accredited press card", "#cf1322"),
    concernCertificate: createAttachment(
      "To whom concern Certificate",
      "Employer support certificate",
      "#531dab"
    ),
    entity: {
      name: "Arabia Broadcasting Hub",
      hqCountry: "United Arab Emirates",
      email: "media.office@abhub.example",
      phoneNumber: `${DEFAULT_COUNTRY_DIAL_CODE} 4 555 2300`,
      website: "https://www.abhub.example",
    },
    applicant: {
      fullName: "Yousef Al Mansoori",
      nationality: "Emirati",
      gender: "Male",
      occupation: "Field Producer",
      dateOfBirth: "1988-04-02",
      userType: "Media Professional",
      email: "yousef.mansoori@example.com",
      personalPhoto: createAttachment("Personal Photo", "Studio portrait", "#13a8a8"),
      visa: createAttachment("Visa", "Residency and work visa", "#1677ff"),
      twitterAccount: "@yousef_onair",
      academicQualification: createAttachment(
        "Academic Qualification",
        "Broadcast production diploma",
        "#7cb305"
      ),
    },
  },
  {
    applicationId: "1801000264",
    applicationNumber: "APP-2026-000264",
    pressCardType: "Temporary Card",
    mediaType: "Digital Media Platform",
    issueDate: "2026-03-01",
    expiryDate: "2026-09-01",
    pressCard: createAttachment("Press Card", "Short-term event coverage pass", "#ad6800"),
    concernCertificate: createAttachment(
      "To whom concern Certificate",
      "Coverage authorization letter",
      "#1d39c4"
    ),
    entity: {
      name: "Signal Story Lab",
      hqCountry: "Canada",
      email: "operations@signalstorylab.example",
      phoneNumber: "+1 416 555 0199",
      website: "https://www.signalstorylab.example",
    },
    applicant: {
      fullName: "Amelia Brooks",
      nationality: "Canadian",
      gender: "Female",
      occupation: "Multimedia Reporter",
      dateOfBirth: "1994-11-29",
      userType: "Freelance Journalist",
      email: "amelia.brooks@example.com",
      personalPhoto: createAttachment("Personal Photo", "Applicant headshot", "#eb2f96"),
      visa: createAttachment("Visa", "Event access visa", "#08979c"),
      twitterAccount: "@ameliabrooksmedia",
      academicQualification: createAttachment(
        "Academic Qualification",
        "Master of Journalism certificate",
        "#5b8c00"
      ),
    },
  },
];

const getObjectValue = (value: unknown, paths: string[]) => {
  if (!value || typeof value !== "object") return undefined;

  for (const path of paths) {
    const parts = path.split(".");
    let current: unknown = value;

    for (const part of parts) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (current !== undefined && current !== null && current !== "") {
      return current;
    }
  }

  return undefined;
};

const coerceString = (value: unknown) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const coerceOptionalString = (value: unknown) => {
  const normalized = coerceString(value);
  return normalized || undefined;
};

const getFileTypeFromValue = (...candidates: unknown[]): FileType => {
  const matched = candidates
    .map((item) => coerceOptionalString(item)?.toLowerCase())
    .find(Boolean);

  if (matched === "png") return "png";
  if (matched === "jpeg") return "jpeg";
  if (matched === "jpg") return "jpg";
  return "pdf";
};

const getAttachmentFromApi = (
  item: Record<string, unknown>,
  paths: string[],
  name: string
): AttachmentItem | null => {
  const url = coerceOptionalString(getObjectValue(item, paths));
  if (!url) return null;

  return {
    name,
    filePath: url,
    fileType: getFileTypeFromValue(
      url,
      getObjectValue(item, paths.map((path) => `${path}Type`)),
      getObjectValue(item, paths.map((path) => `${path}.fileType`))
    ),
  };
};

const resolvePressCardType = (item: Record<string, unknown>): PressCardType => {
  const explicitType = coerceString(
    getObjectValue(item, [
      "pressCardType",
      "PressCardType",
      "cardType",
      "CardType",
      "typeName",
      "TypeName",
    ])
  ).toLowerCase();

  if (explicitType.includes("temporary")) {
    return "Temporary Card";
  }

  if (explicitType.includes("permanent")) {
    return "Permanent Card";
  }

  const temporaryFlag = getObjectValue(item, [
    "isTemporaryPressCard",
    "IsTemporaryPressCard",
    "isTemporaryCard",
    "IsTemporaryCard",
  ]);

  if (typeof temporaryFlag === "boolean") {
    return temporaryFlag ? "Temporary Card" : "Permanent Card";
  }

  return "Permanent Card";
};

const mapPressCardRecord = (rawItem: unknown): PressCardRecord | null => {
  if (!rawItem || typeof rawItem !== "object") return null;

  const item = rawItem as Record<string, unknown>;
  const applicationId = coerceString(
    getObjectValue(item, [
      "applicationId",
      "ApplicationId",
      "id",
      "Id",
      "pressCardApplicationId",
      "PressCardApplicationId",
      "service18ApplicationId",
      "Service18ApplicationId",
    ])
  );
  const applicationNumber = coerceString(
    getObjectValue(item, [
      "applicationNumber",
      "ApplicationNumber",
      "permitNumber",
      "PermitNumber",
      "number",
      "Number",
    ])
  );

  if (!applicationId && !applicationNumber) {
    return null;
  }

  return {
    applicationId,
    applicationNumber: applicationNumber || applicationId,
    pressCardType: resolvePressCardType(item),
    mediaType:
      coerceString(
        getObjectValue(item, [
          "mediaType",
          "MediaType",
          "businessTypeName",
          "BusinessTypeName",
          "mediaCategory",
          "MediaCategory",
        ])
      ) || "--",
    issueDate: coerceString(
      getObjectValue(item, ["issueDate", "IssueDate", "cardIssueDate", "CardIssueDate"])
    ),
    expiryDate: coerceString(
      getObjectValue(item, ["expiryDate", "ExpiryDate", "cardExpiryDate", "CardExpiryDate"])
    ),
    pressCard: getAttachmentFromApi(
      item,
      ["pressCard", "PressCard", "pressCardUrl", "PressCardUrl"],
      "Press Card"
    ),
    concernCertificate:
      getAttachmentFromApi(
        item,
        [
          "concernCertificate",
          "ConcernCertificate",
          "toWhomConcernCertificate",
          "ToWhomConcernCertificate",
          "concernCertificateUrl",
          "ConcernCertificateUrl",
        ],
        "To whom concern Certificate"
      ),
    entity: {
      name:
        coerceString(
          getObjectValue(item, [
            "entity.name",
            "Entity.Name",
            "foreignEntity.nameEnglish",
            "ForeignEntity.NameEnglish",
            "entityName",
            "EntityName",
          ])
        ) || "--",
      hqCountry:
        coerceString(
          getObjectValue(item, [
            "entity.hqCountry",
            "Entity.HqCountry",
            "foreignEntity.headquarterCountryName",
            "ForeignEntity.HeadquarterCountryName",
            "headquarterCountryName",
            "HeadquarterCountryName",
          ])
        ) || "--",
      email:
        coerceString(
          getObjectValue(item, [
            "entity.email",
            "Entity.Email",
            "foreignEntity.email",
            "ForeignEntity.Email",
            "email",
            "Email",
          ])
        ) || "--",
      phoneNumber:
        coerceString(
          getObjectValue(item, [
            "entity.phoneNumber",
            "Entity.PhoneNumber",
            "foreignEntity.phoneNumber",
            "ForeignEntity.PhoneNumber",
            "phoneNumber",
            "PhoneNumber",
          ])
        ) || "--",
      website:
        coerceString(
          getObjectValue(item, [
            "entity.website",
            "Entity.Website",
            "foreignEntity.websiteUrl",
            "ForeignEntity.WebsiteUrl",
            "websiteUrl",
            "WebsiteUrl",
          ])
        ) || "--",
    },
    applicant: {
      fullName:
        coerceString(
          getObjectValue(item, [
            "applicant.fullName",
            "Applicant.FullName",
            "journalist.fullNameEnglish",
            "Journalist.FullNameEnglish",
            "fullNameEnglish",
            "FullNameEnglish",
          ])
        ) || "--",
      nationality:
        coerceString(
          getObjectValue(item, [
            "applicant.nationality",
            "Applicant.Nationality",
            "journalist.nationality",
            "Journalist.Nationality",
            "nationality",
            "Nationality",
          ])
        ) || "--",
      gender:
        coerceString(
          getObjectValue(item, [
            "applicant.gender",
            "Applicant.Gender",
            "journalist.gender",
            "Journalist.Gender",
            "gender",
            "Gender",
          ])
        ) || "--",
      occupation:
        coerceString(
          getObjectValue(item, [
            "applicant.occupation",
            "Applicant.Occupation",
            "journalist.occupation",
            "Journalist.Occupation",
            "occupation",
            "Occupation",
          ])
        ) || "--",
      dateOfBirth: coerceString(
        getObjectValue(item, [
          "applicant.dateOfBirth",
          "Applicant.DateOfBirth",
          "journalist.dateOfBirth",
          "Journalist.DateOfBirth",
          "dateOfBirth",
          "DateOfBirth",
        ])
      ),
      userType:
        coerceString(
          getObjectValue(item, [
            "applicant.userType",
            "Applicant.UserType",
            "journalist.userType",
            "Journalist.UserType",
            "userType",
            "UserType",
          ])
        ) || "--",
      email:
        coerceString(
          getObjectValue(item, [
            "applicant.email",
            "Applicant.Email",
            "journalist.email",
            "Journalist.Email",
          ])
        ) || "--",
      personalPhoto:
        getAttachmentFromApi(
          item,
          ["applicant.personalPhoto", "Applicant.PersonalPhoto", "personalPhotoUrl", "PersonalPhotoUrl"],
          "Personal Photo"
        ),
      visa:
        getAttachmentFromApi(item, ["applicant.visa", "Applicant.Visa", "visaUrl", "VisaUrl"], "Visa"),
      twitterAccount:
        coerceString(
          getObjectValue(item, [
            "applicant.twitterAccount",
            "Applicant.TwitterAccount",
            "twitterAccount",
            "TwitterAccount",
          ])
        ) || "--",
      academicQualification:
        getAttachmentFromApi(
          item,
          [
            "applicant.academicQualification",
            "Applicant.AcademicQualification",
            "academicQualificationUrl",
            "AcademicQualificationUrl",
          ],
          "Academic Qualification"
        ),
    },
  };
};

const getRecordSelectValue = (record: PressCardRecord) =>
  record.applicationId || record.applicationNumber;

const getRawSelectedValue = (value: PressCardSelectorValue) => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const objectValue =
    getObjectValue(value, [
      "applicationId",
      "ApplicationId",
      "id",
      "Id",
      "pressCardApplicationId",
      "service18ApplicationId",
      "applicationNumber",
      "ApplicationNumber",
      "value",
      "selectedKey",
    ]) ?? undefined;

  if (Array.isArray(objectValue)) {
    return objectValue.length > 0 ? String(objectValue[0]) : undefined;
  }

  return objectValue !== undefined && objectValue !== null
    ? String(objectValue)
    : undefined;
};

const findSelectedRecord = (
  records: PressCardRecord[],
  value: PressCardSelectorValue
) => {
  const rawValue = getRawSelectedValue(value);
  if (!rawValue) return undefined;

  return records.find(
    (item) =>
      item.applicationId === rawValue ||
      item.applicationNumber === rawValue ||
      getRecordSelectValue(item) === rawValue
  );
};

const buildFieldValue = (record: PressCardRecord) => ({
  id: record.applicationId,
  Id: record.applicationId,
  value: record.applicationId,
  selectedKey: record.applicationId,
  applicationId: record.applicationId,
  ApplicationId: record.applicationId,
  applicationNumber: record.applicationNumber,
  ApplicationNumber: record.applicationNumber,
  pressCardApplicationId: record.applicationId,
  service18ApplicationId: record.applicationId,
});

const DetailField: React.FC<{
  label: string;
  value?: React.ReactNode;
  className?: string;
}> = ({ label, value, className }) => (
  <div className={`press-card-selector__field${className ? ` ${className}` : ""}`}>
    <div className="press-card-selector__field-label">{label}</div>
    <div className="press-card-selector__field-value">{value || "--"}</div>
  </div>
);

const AttachmentField: React.FC<{
  label: string;
  attachment?: AttachmentItem | null;
  designMode?: boolean;
}> = ({ label, attachment, designMode = false }) => {
  if (!attachment) {
    return <DetailField label={label} value="--" />;
  }

  // Prevent Designable canvas from selecting/moving parent nodes when users interact with attachment actions.
  const stopDesignEvent: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (designMode) {
      event.stopPropagation();
    }
  };

  return (
    <div
      className="press-card-selector__attachment-field"
      onMouseDownCapture={stopDesignEvent}
      onClickCapture={stopDesignEvent}
    >
      <DocumentViewer
        label={label}
        fileName={attachment.name}
        fileUrl={attachment.fileUrl || attachment.filePath}
        fileType={attachment.fileType}
        hasView
        hasDownload
      />
    </div>
  );
};

const PressCardSelectorInner: React.FC<PressCardSelectorProps> = ({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  designMode = false,
}) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language ?? "";
  const currentProfileId = useUserStore((state) => state.currentProfileId);
  const [activeTab, setActiveTab] = useState(DEFAULT_ACTIVE_TAB);
  const [designSelectedValue, setDesignSelectedValue] = useState<string>();
  const [records, setRecords] = useState<PressCardRecord[]>(() =>
    designMode ? MOCK_RECORDS : []
  );
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    if (designMode) {
      setRecords(MOCK_RECORDS);
      return;
    }

    const profileId = String(currentProfileId || "").trim();
    if (!profileId) {
      setRecords([]);
      return;
    }

    let cancelled = false;
    setRecordsLoading(true);
    getPressCardByProfileId(profileId)
      .then((res: unknown) => {
        if (cancelled) return;

        const data = res && typeof res === "object" && "data" in res
          ? (res as { data?: unknown }).data
          : undefined;
        const rows = Array.isArray(data) ? data : [];
        setRecords(rows.map(mapPressCardRecord).filter(Boolean) as PressCardRecord[]);
      })
      .catch(() => {
        if (!cancelled) {
          setRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecordsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfileId, designMode]);

  useEffect(() => {
    // In design mode, auto-select the first record so the schema has a visible default state.
    if (designMode && records.length > 0 && !designSelectedValue) {
      setDesignSelectedValue(getRecordSelectValue(records[0]));
    }
  }, [designMode, designSelectedValue, records]);

  const selectedRecord = useMemo(
    () => findSelectedRecord(records, designMode ? designSelectedValue : value),
    [designMode, designSelectedValue, records, value]
  );
  const effectivePlaceholder = useMemo(
    () =>
      placeholder === DEFAULT_PLACEHOLDER
        ? t("PressCardSelector.placeholder.select")
        : placeholder,
    [currentLanguage, placeholder, t],
  );
  const selectedValue = designMode
    ? designSelectedValue
    : selectedRecord
      ? getRecordSelectValue(selectedRecord)
      : undefined;
  const stopDesignEvent: React.MouseEventHandler<HTMLElement> = (event) => {
    if (designMode) {
      event.stopPropagation();
    }
  };

  const handleSelectionChange = (nextValue?: string) => {
    const hadSelection = Boolean(selectedValue);
    // Reset to the first tab when switching from empty state to a selected record.
    if (!hadSelection && nextValue) {
      setActiveTab(DEFAULT_ACTIVE_TAB);
    }

    // Design mode is isolated from Formily field value updates.
    if (designMode) {
      setDesignSelectedValue(nextValue);
      return;
    }

    const nextRecord = records.find(
      (item) =>
        item.applicationId === nextValue ||
        item.applicationNumber === nextValue ||
        getRecordSelectValue(item) === nextValue
    );

    onChange?.(nextRecord ? buildFieldValue(nextRecord) : undefined);
  };

  return (
    <div className="press-card-selector">
      <Select
        allowClear
        showSearch
        loading={recordsLoading}
        className="press-card-selector__select"
        placeholder={effectivePlaceholder}
        value={selectedValue}
        onChange={handleSelectionChange}
        onMouseDown={stopDesignEvent}
        onClick={stopDesignEvent}
        optionFilterProp="label"
        notFoundContent={
          <EmptyBox title={t("PressCardSelector.empty.noData")} />
        }
        options={records.map((item) => ({
          label: item.applicationNumber,
          value: getRecordSelectValue(item),
        }))}
      />

      {selectedRecord ? (
        <div
          className="press-card-selector__details"
          onMouseDownCapture={stopDesignEvent}
          onClickCapture={stopDesignEvent}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            onTabClick={(_, event) => {
              if (designMode) {
                event.stopPropagation();
              }
            }}
            className="press-card-selector__tabs"
          >
            <Tabs.TabPane tab={t("PressCardSelector.tab.application")} key="application">
              <div className="press-card-selector__grid">
                <DetailField label={t("PressCardSelector.label.pressCardType")} value={selectedRecord.pressCardType} />
                <DetailField label={t("PressCardSelector.label.mediaType")} value={selectedRecord.mediaType} />
                <DetailField
                  label={t("PressCardSelector.label.issueDate")}
                  value={formatDisplayDate(selectedRecord.issueDate)}
                />
                <DetailField
                  label={t("PressCardSelector.label.expiryDate")}
                  value={formatDisplayDate(selectedRecord.expiryDate)}
                />
                <AttachmentField
                  label={t("PressCardSelector.label.pressCard")}
                  attachment={selectedRecord.pressCard}
                  designMode={designMode}
                />
                <AttachmentField
                  label={t("PressCardSelector.label.concernCertificate")}
                  attachment={selectedRecord.concernCertificate}
                  designMode={designMode}
                />
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab={t("PressCardSelector.tab.entity")} key="entity">
              <div className="press-card-selector__grid">
                <DetailField
                  label={t("PressCardSelector.label.entityName")}
                  value={selectedRecord.entity.name}
                />
                <DetailField
                  label={t("PressCardSelector.label.entityHqCountry")}
                  value={selectedRecord.entity.hqCountry}
                />
                <DetailField
                  label={t("PressCardSelector.label.email")}
                  value={selectedRecord.entity.email}
                />
                <DetailField
                  label={t("PressCardSelector.label.phoneNumber")}
                  value={selectedRecord.entity.phoneNumber}
                />
                <DetailField
                  label={t("PressCardSelector.label.website")}
                  value={selectedRecord.entity.website}
                />
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab={t("PressCardSelector.tab.applicant")} key="applicant">
              <div className="press-card-selector__grid">
                <DetailField
                  label={t("PressCardSelector.label.fullName")}
                  value={selectedRecord.applicant.fullName}
                />
                <DetailField
                  label={t("PressCardSelector.label.nationality")}
                  value={selectedRecord.applicant.nationality}
                />
                <DetailField label={t("PressCardSelector.label.gender")} value={selectedRecord.applicant.gender} />
                <DetailField
                  label={t("PressCardSelector.label.occupation")}
                  value={selectedRecord.applicant.occupation}
                />
                <DetailField
                  label={t("PressCardSelector.label.dateOfBirth")}
                  value={formatDisplayDate(selectedRecord.applicant.dateOfBirth)}
                />
                <DetailField
                  label={t("PressCardSelector.label.userType")}
                  value={selectedRecord.applicant.userType}
                />
                <DetailField
                  label={t("PressCardSelector.label.email")}
                  value={selectedRecord.applicant.email}
                />
                <DetailField
                  label={t("PressCardSelector.label.twitterAccount")}
                  value={selectedRecord.applicant.twitterAccount}
                />
                <AttachmentField
                  label={t("PressCardSelector.label.personalPhoto")}
                  attachment={selectedRecord.applicant.personalPhoto}
                  designMode={designMode}
                />
                <AttachmentField
                  label={t("PressCardSelector.label.visa")}
                  attachment={selectedRecord.applicant.visa}
                  designMode={designMode}
                />
                <AttachmentField
                  label={t("PressCardSelector.label.academicQualification")}
                  attachment={selectedRecord.applicant.academicQualification}
                  designMode={designMode}
                />
              </div>
            </Tabs.TabPane>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
};

export type { AttachmentItem, PressCardRecord };
export default PressCardSelectorInner;
