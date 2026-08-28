import assert from "node:assert/strict";

const protocol = await import("../src/components/AIChatBot/model/publicReply.ts");
const workflow = await import("../src/components/AIChatBot/model/customerWorkflow.ts");

const payload = JSON.stringify({
  version: "public-reply/v1",
  kind: "clarification",
  skill: {
    id: "license_application",
    version: "public-license-v1",
    step: "select_account_type",
  },
  message: {
    text: "Please choose the account type.",
    quote: "The exact source passage.",
    sections: [
      { key: "requirements", title: "What's required", items: ["Official letter"] },
    ],
  },
  choices: [
    { key: "ACCOUNT_INDIVIDUAL", label: "An Individual Account" },
    { key: "customer.profile:commercial", label: "A Commercial Account" },
  ],
  citations: [
    {
      id: "C1",
      evidence_id: "E1",
      title: "NMA Permit Guidelines 2024",
      locator: "Page 15",
    },
  ],
  actions: [
    { key: "OPEN_LICENSE_APPLICATION", label: "Start application", requires_login: true },
  ],
});

const artifact = {
  type: "ff-ai.record-list.v1",
  id: "licenses",
  title: "Your licenses",
  items: [
    {
      id: "license-1",
      title: "License #6286924",
      fields: [
        {
          key: "status",
          label: "Status",
          value: "205",
          format: "status",
          tone: "default",
        },
      ],
    },
  ],
};

const parsed = protocol.parsePublicReply(payload);
assert.equal(parsed?.kind, "clarification");
assert.equal(parsed?.message.quote, "The exact source passage.");
assert.equal(parsed?.choices[0].key, "ACCOUNT_INDIVIDUAL");
assert.equal(parsed?.message.sections[0].title, "What's required");
assert.equal(parsed?.citations[0].evidenceId, "E1");
assert.equal(parsed?.actions[0].requiresLogin, true);

const encodedChoice = protocol.encodeChoiceSelection(parsed.choices[1]);
assert.equal(
  encodedChoice,
  "[choice_key=customer.profile%3Acommercial] A Commercial Account",
);
assert.deepEqual(protocol.parseChoiceSelection(encodedChoice), parsed.choices[1]);
assert.equal(protocol.visibleChoiceSelection(encodedChoice), "A Commercial Account");

const finalized = workflow.finalizeWorkflowAssistantMessage(
  { id: "assistant-1", role: "assistant", status: "streaming", text: "" },
  [],
  [artifact],
  payload,
);
assert.equal(finalized.text, "Please choose the account type.");
assert.equal(finalized.quote, "The exact source passage.");
assert.equal(finalized.choices[0].key, "ACCOUNT_INDIVIDUAL");
assert.equal(finalized.artifacts[0], artifact);
assert.equal(finalized.status, undefined);
const uploadPayload = JSON.stringify({
  ...JSON.parse(payload),
  skill: {
    id: "submit_204",
    version: "3.0.0-deterministic",
    step: "material_upload",
  },
  message: {
    text: "Upload the electronic book file (PDF, EPUB, or MOBI; maximum 50 MB).",
    sections: [],
  },
  choices: [],
  citations: [],
  actions: [
    {
      type: "upload",
      purpose: "service204.material",
      accept: [
        "application/pdf",
        "application/epub+zip",
        "application/x-mobipocket-ebook",
      ],
      maxSizeBytes: 52428800,
    },
  ],
});
const parsedUpload = protocol.parsePublicReply(uploadPayload);
assert.equal(parsedUpload?.actions.length, 0);
assert.deepEqual(parsedUpload?.interactions, [
  {
    schema_version: "ff-ai.interaction.v1",
    id: "direct-upload:submit_204:service204.material:0",
    kind: "file_upload",
    status: "pending",
    purpose: "service204.material",
    constraints: {
      accept: "application/pdf,application/epub+zip,application/x-mobipocket-ebook",
      max_files: 1,
      max_size_bytes: 52428800,
    },
  },
]);
const finalizedUpload = workflow.finalizeWorkflowAssistantMessage(
  { id: "assistant-upload", role: "assistant", text: "" },
  [],
  [],
  uploadPayload,
);
assert.equal(finalizedUpload.interactions?.[0]?.constraints?.max_size_bytes, 52428800);

const recovered = workflow.recoverWorkflowHistoryMessages([
  {
    id: "assistant-history",
    role: "assistant",
    content: payload,
    created_at: "2026-08-17T10:00:00Z",
    cards: [],
    artifacts: [artifact],
    interactions: [],
  },
  {
    id: "user-history",
    role: "user",
    content: protocol.encodeChoiceSelection(parsed.choices[0]),
    created_at: "2026-08-17T10:00:01Z",
    cards: [],
    artifacts: [],
    interactions: [],
  },
]);
assert.equal(recovered[0].selectedChoiceKey, "ACCOUNT_INDIVIDUAL");
assert.deepEqual(recovered[0].artifacts[0], artifact);
assert.equal(recovered[1].text, "An Individual Account");

assert.equal(
  protocol.parsePublicReply(JSON.stringify({ ...JSON.parse(payload), version: "unknown/v1" })),
  null,
);
assert.equal(
  protocol.parsePublicReply(
    JSON.stringify({ ...JSON.parse(payload), choices: [{ label: "Missing key" }] }),
  ),
  null,
);

const insufficientEvidencePayload = JSON.stringify({
  version: "public-reply/v1",
  kind: "insufficient_evidence",
  skill: {
    id: "latest_regulations",
    version: "public-policy-exact-quote-v1",
    step: "completed",
  },
  message: {
    text: "I could not find the requested exact wording with a locatable official source in the UMC knowledge base.",
    quote: "",
    sections: [],
  },
  choices: [],
  citations: [],
  actions: [],
});

const insufficientEvidence = protocol.parsePublicReply(insufficientEvidencePayload);
assert.equal(insufficientEvidence?.kind, "insufficient_evidence");
assert.equal(insufficientEvidence?.message.quote, undefined);

const finalizedInsufficientEvidence = workflow.finalizeWorkflowAssistantMessage(
  { id: "assistant-2", role: "assistant", text: insufficientEvidencePayload },
  [],
  [],
  insufficientEvidencePayload,
);
assert.equal(
  finalizedInsufficientEvidence.text,
  "I could not find the requested exact wording with a locatable official source in the UMC knowledge base.",
);
assert.equal(finalizedInsufficientEvidence.quote, undefined);
assert.equal(finalizedInsufficientEvidence.tone, "warning");

console.log("Structured public reply and artifact coexistence verified");
