import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const defaultFixturePath = path.join(
  rootDir,
  "scripts",
  "fixtures",
  "service-entry-gate-matrix.json",
);
const mediaLicenseMockDir = path.join(
  rootDir,
  "src",
  "pages",
  "MediaLicense",
  "mockData",
);

const fixtureArg = process.argv[2];
const fixturePath = fixtureArg
  ? path.resolve(process.cwd(), fixtureArg)
  : defaultFixturePath;
const baseUrl = process.env.SERVICE_ENTRY_GATE_MOCK_BASE_URL || "http://localhost:5174";
const serviceNameCache = new Map();

const toRecord = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

const toText = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
};

const readActivityNameFromFormValues = (formValues) => {
  const formValueRecord = toRecord(formValues);
  if (!formValueRecord) {
    return "";
  }

  const selectTableSingle = toRecord(formValueRecord.SelectTableSingle);
  const singleTableRow = Array.isArray(selectTableSingle?.tableData)
    ? toRecord(selectTableSingle.tableData[0])
    : null;
  const selectTable = toRecord(formValueRecord.SelectTable);
  const selectTableRow = Array.isArray(selectTable?.tableData)
    ? toRecord(selectTable.tableData[0])
    : null;

  return (
    toText(singleTableRow?.ActivityEn) ||
    toText(singleTableRow?.Activity) ||
    toText(selectTableRow?.ActivityEn) ||
    toText(selectTableRow?.Activity)
  );
};

const loadServiceNameFromMockData = async (serviceCode) => {
  if (!serviceCode) {
    return "";
  }

  if (serviceNameCache.has(serviceCode)) {
    return serviceNameCache.get(serviceCode);
  }

  const mockFilePath = path.join(mediaLicenseMockDir, `${serviceCode}mock.json`);

  try {
    const raw = await fs.readFile(mockFilePath, "utf8");
    const parsed = JSON.parse(raw);
    const steps = Array.isArray(parsed) ? parsed : [parsed];

    for (const step of steps) {
      const stepRecord = toRecord(step);
      const formDataRaw = toText(stepRecord?.formData);
      if (!formDataRaw) {
        continue;
      }

      try {
        const formData = JSON.parse(formDataRaw);
        const formDataRecord = toRecord(formData);
        const activityName = readActivityNameFromFormValues(formDataRecord?.formValues);
        if (activityName) {
          serviceNameCache.set(serviceCode, activityName);
          return activityName;
        }
      } catch {
        // Ignore malformed formData and continue trying later steps.
      }
    }
  } catch {
    // Ignore missing mockData files and use the fallback label.
  }

  serviceNameCache.set(serviceCode, "");
  return "";
};

const resolveMockStatus = (entry) => {
  const body = toRecord(entry?.body);
  const data = toRecord(body?.data);
  const decision = toRecord(data?.decision);
  const documentInfo = toRecord(data?.documentInfo);
  const uiHints = toRecord(data?.uiHints);
  const finalAction = toText(decision?.finalAction);
  const promptCode = toText(decision?.promptCode);
  const variant = toText(uiHints?.variant);
  const hasPenalty =
    documentInfo?.expiredState === "penalty" ||
    documentInfo?.penaltyApplies === true ||
    variant.toLowerCase().includes("penalty");

  if (finalAction === "Allow") {
    if (uiHints?.applicantMode === "Both") {
      return "Allow (Both Applicant Modes)";
    }
    return "Allow";
  }

  if (promptCode === "IN_PROGRESS_APPLICATION") {
    return "Under Review";
  }

  if (promptCode === "EXISTING_VALID_DOCUMENT") {
    return "License Already Exists";
  }

  if (promptCode === "SUSPENDED_DOCUMENT_EXISTS") {
    return "License Suspended";
  }

  if (promptCode === "DOCUMENT_STATUS_INVALID") {
    return hasPenalty ? "License Expired (Penalty)" : "License Expired (Grace)";
  }

  if (promptCode === "REDIRECT_TO_RENEWAL") {
    return decision?.targetServiceId ? "Redirect To Renewal" : "Redirect Missing Target";
  }

  if (promptCode === "DOCUMENT_NOT_FOUND") {
    return "Document Not Found";
  }

  if (promptCode === "RENEWABLE_DOCUMENT_NOT_FOUND") {
    return "Renewable Document Not Found";
  }

  if (promptCode === "MissingPrerequisiteDocument") {
    return "Missing Prerequisite Document";
  }

  if (promptCode === "PrerequisiteDocumentUnavailable") {
    return "Prerequisite Document Unavailable";
  }

  if (promptCode === "ApplicantTypeNotAllowed") {
    const applicantTypeStatusMap = {
      "complete-personal": "Complete Your Profile",
      "add-personal": "Add Personal Profile",
      "switch-to-personal": "Switch To Personal Profile",
      "switch-to-establishment": "Switch To Establishment Profile",
      "switch-to-required-establishment": "Switch To Required Establishment",
      "switch-establishment-qualified-types": "Switch Qualified Establishment",
      "complete-profile-verification-dual-cta": "Complete Profile Verification",
    };
    return applicantTypeStatusMap[variant] || "Applicant Type Not Allowed";
  }

  if (promptCode === "MissingEstablishmentContext") {
    const establishmentStatusMap = {
      "add-establishment-basic": "Add Establishment Profile",
      "add-establishment-qualified-types": "Add Qualified Establishment",
    };
    return establishmentStatusMap[variant] || "Missing Establishment Context";
  }

  if (variant === "both-add-personal") {
    return "Both Modes: Add Personal";
  }

  if (variant === "both-complete-personal") {
    return "Both Modes: Complete Personal";
  }

  if (variant === "both-add-required-establishment") {
    return "Both Modes: Add Required Establishment";
  }

  if (variant === "both-switch-establishment") {
    return "Both Modes: Switch Establishment";
  }

  return finalAction || promptCode || variant || "Custom Mock";
};

const resolveServiceName = async (entry) => {
  const body = toRecord(entry?.body);
  const data = toRecord(body?.data);
  const explicitName =
    toText(entry?.serviceName) ||
    toText(data?.serviceName) ||
    toText(data?.nameEn) ||
    toText(data?.nameAr);

  if (explicitName) {
    return explicitName;
  }

  const serviceCode = toText(data?.serviceCode || entry?.serviceCode);
  const mockDataName = await loadServiceNameFromMockData(serviceCode);
  if (mockDataName) {
    return mockDataName;
  }

  if (serviceCode) {
    return `Service Code ${serviceCode}`;
  }

  return `Service ${toText(entry?.serviceId) || "Unknown"}`;
};

async function main() {
  const raw = await fs.readFile(fixturePath, "utf8");
  const parsed = JSON.parse(raw);
  const entries = Array.isArray(parsed) ? parsed : parsed.entries;

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`No mock entries found in ${fixturePath}`);
  }

  const summaryRows = [];

  for (const entry of entries) {
    const response = await fetch(`${baseUrl}/__dev/service-entry-gate/mock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serviceId: entry.serviceId,
        statusCode: entry.statusCode ?? 200,
        body: entry.body,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to seed serviceId=${entry.serviceId}: ${response.status} ${text}`,
      );
    }

    const result = await response.json();
    const body = toRecord(entry?.body);
    const data = toRecord(body?.data);
    summaryRows.push({
      serviceId: toText(entry.serviceId),
      serviceCode: toText(data?.serviceCode || entry?.serviceCode) || "-",
      serviceName: await resolveServiceName(entry),
      mockStatus: resolveMockStatus(entry),
      scenario: toText(entry.scenario) || "unnamed",
      httpStatus: String(result.mock?.statusCode ?? entry.statusCode ?? 200),
    });
  }

  console.log(`Seeded ${summaryRows.length} service-entry-gate mocks from ${fixturePath}`);
  console.table(summaryRows);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
