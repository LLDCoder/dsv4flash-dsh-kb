import assert from "node:assert/strict";

const { resolvePortalActionNavigation } = await import(
  "../src/components/AIChatBot/model/actions.ts"
);

const openFinePayment = {
  key: "OPEN_FINE_PAYMENT",
  label: "Open Fine Payment page",
  requiresLogin: false,
};
const signInForFines = {
  key: "SIGN_IN_FOR_FINES",
  label: "Sign in to see my fines",
  requiresLogin: true,
};
const openAllFinePayment = {
  key: "OPEN_ALL_FINE_PAYMENT",
  label: "Open Pay All page · AED 750.00",
  requiresLogin: true,
};
const openFineSelection = {
  key: "OPEN_FINE_SELECTION",
  label: "Open fines list to choose",
  requiresLogin: true,
};
const openMyLicensesRenewal = {
  key: "OPEN_MY_LICENSES_RENEWAL",
  label: "Open My Licenses (sign in)",
  requiresLogin: true,
};
const seeRenewalFees = {
  key: "SEE_RENEWAL_FEES",
  label: "See renewal fees",
  requiresLogin: true,
};
const browsePolicyLibrary = {
  key: "BROWSE_POLICY_LIBRARY",
  label: "Browse full policy library",
  requiresLogin: false,
};
const subscribeRegulationUpdates = {
  key: "SUBSCRIBE_REGULATION_UPDATES",
  label: "Subscribe to updates (sign in)",
  requiresLogin: true,
};
const openFullCabinetResolution = {
  key: "OPEN_FULL_CABINET_RESOLUTION",
  label: "Open full Cabinet Resolution",
  requiresLogin: false,
};
const seeAiDisclosureTemplates = {
  key: "SEE_AI_DISCLOSURE_TEMPLATES",
  label: "See AI disclosure templates",
  requiresLogin: false,
};
const signInFormalComplaint = {
  key: "SIGN_IN_FORMAL_COMPLAINT",
  label: "Sign in to file formal complaint",
  requiresLogin: true,
};
const contactPersonDirectly = {
  key: "CONTACT_PERSON_DIRECTLY",
  label: "Contact a person directly",
  requiresLogin: false,
};

assert.deepEqual(resolvePortalActionNavigation(openFinePayment, false), {
  path: "/pay-fines",
});
assert.deepEqual(resolvePortalActionNavigation(openFinePayment, true), {
  path: "/pay-fines",
});
assert.deepEqual(resolvePortalActionNavigation(signInForFines, true), {
  path: "/violations-fines",
});
assert.deepEqual(resolvePortalActionNavigation(signInForFines, false), {
  path: "/login?returnUrl=%2Fviolations-fines",
  returnUrl: "/violations-fines",
});
assert.deepEqual(resolvePortalActionNavigation(openAllFinePayment, true), {
  path: "/violations-fines",
});
assert.deepEqual(resolvePortalActionNavigation(openFineSelection, true), {
  path: "/violations-fines",
});
assert.deepEqual(resolvePortalActionNavigation(openAllFinePayment, false), {
  path: "/login?returnUrl=%2Fviolations-fines",
  returnUrl: "/violations-fines",
});
assert.deepEqual(resolvePortalActionNavigation(openFineSelection, false), {
  path: "/login?returnUrl=%2Fviolations-fines",
  returnUrl: "/violations-fines",
});
assert.deepEqual(resolvePortalActionNavigation(openMyLicensesRenewal, true), {
  path: "/permits-license",
});
assert.deepEqual(resolvePortalActionNavigation(openMyLicensesRenewal, false), {
  path: "/login?returnUrl=%2Fpermits-license",
  returnUrl: "/permits-license",
});
assert.deepEqual(resolvePortalActionNavigation(seeRenewalFees, true), {
  path: "/services",
});
assert.deepEqual(resolvePortalActionNavigation(seeRenewalFees, false), {
  path: "/login?returnUrl=%2Fservices",
  returnUrl: "/services",
});
assert.deepEqual(resolvePortalActionNavigation(browsePolicyLibrary, false), {
  path: "/knowledge-center",
});
assert.deepEqual(resolvePortalActionNavigation(browsePolicyLibrary, true), {
  path: "/knowledge-center",
});
assert.deepEqual(resolvePortalActionNavigation(subscribeRegulationUpdates, false), {
  path: "/login?returnUrl=%2Fnotifications",
  returnUrl: "/notifications",
});
assert.deepEqual(resolvePortalActionNavigation(subscribeRegulationUpdates, true), {
  path: "/notifications",
});
assert.deepEqual(resolvePortalActionNavigation(openFullCabinetResolution, false), {
  path: "/knowledge-center",
});
assert.deepEqual(resolvePortalActionNavigation(seeAiDisclosureTemplates, false), {
  path: "/knowledge-center",
});
assert.deepEqual(resolvePortalActionNavigation(signInFormalComplaint, false), {
  path: "/login?returnUrl=%2Fcomplaints",
  returnUrl: "/complaints",
});
assert.deepEqual(resolvePortalActionNavigation(signInFormalComplaint, true), {
  path: "/complaints",
});
assert.deepEqual(resolvePortalActionNavigation(contactPersonDirectly, false), {
  path: "/inquiries",
});
assert.deepEqual(resolvePortalActionNavigation(contactPersonDirectly, true), {
  path: "/inquiries",
});

assert.equal(
  resolvePortalActionNavigation(
    {
      key: "OPEN_ARBITRARY_URL",
      label: "https://attacker.example/path",
      requiresLogin: false,
    },
    true,
  ),
  undefined,
);

console.log("FF AI controlled action navigation verified");
