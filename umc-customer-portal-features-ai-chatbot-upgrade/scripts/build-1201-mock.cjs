/* eslint-disable no-console */
/**
 * Builds src/pages/MediaLicense/mockData/1201mock.json from test1201skip.json
 * with dev-prefill formValues (reprint activity 1015 -> skips Chief Editor + Acquaintance).
 * Run: node scripts/build-1201-mock.cjs
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const src = path.join(
  root,
  "src/pages/MediaLicense/mockData/test1201skip.json",
);
const out = path.join(
  root,
  "src/pages/MediaLicense/mockData/1201mock.json",
);

const steps = JSON.parse(fs.readFileSync(src, "utf8"));
const [activityStep, ...rest] = steps;

const parsed = JSON.parse(activityStep.formData);
parsed.formValues = {
  // Flat fields (Formily step values)
  SelectTableSingle: {
    selectedKey: ["1015"],
    tableData: [
      {
        Number: 1,
        Activity: "Issuing License for reprinting a foreign daily newspaper",
        money: 1000,
        Id: 1015,
        ActivityEn: "Issuing License for reprinting a foreign daily newspaper",
        ActivityAr: "رخصة لإعادة طباعة صحيفة أجنبية يومية",
      },
    ],
    // Nested keys used by buildService1201Payload (resolveSelectTableSingleRecord)
    ji4agxm79fl: "Demo Newspaper 1201 Mock",
    Languages: [1],
    SubjectCategory: ["Art & Photography"],
  },
  NewspaperMagazineName: "Demo Newspaper 1201 Mock",
  Language: 1,
  SubjectCategory: ["Art & Photography"],
  addressPicker: {
    emirateId: 2,
    areaId: 1,
    street: "Sheikh Zayed Road — mock dev prefill",
  },
  UploadMaterial: [
    {
      uid: "dev-1201-1",
      name: "owner-approval-mock.pdf",
      status: "done",
      url: "2026/04/22/1201000000/owner-approval-mock.pdf",
    },
  ],
};
parsed.fileList = [];

const merged = [
  {
    ...activityStep,
    formData: JSON.stringify(parsed),
  },
  ...rest,
];

fs.writeFileSync(out, `${JSON.stringify(merged, null, 4)}\n`, "utf8");
console.log("Wrote", out);
