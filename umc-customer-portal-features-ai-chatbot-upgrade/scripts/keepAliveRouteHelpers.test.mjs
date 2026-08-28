import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { matchKeepAliveRoute } from "../src/components/KeepAlive/routeMatcher.js";
import { createKeepAliveAsyncGuard } from "../src/components/KeepAlive/asyncGuard.js";
import {
  getLayoutScrollContainer,
  restoreScrollPosition,
  saveScrollPosition,
} from "../src/components/KeepAlive/scrollRestoration.js";
import { resolveKeepAliveTab } from "../src/pages/ViolationsFines/utils/keepAliveTab.js";

test("matches an exact dynamic keep-alive detail route", () => {
  assert.equal(
    matchKeepAliveRoute(
      "/violations-fines/violations/FIN-100",
      "/violations-fines/violations/:violationId",
    ),
    true,
  );
  assert.equal(
    matchKeepAliveRoute(
      "/violations-fines/violations/FIN-100/payment",
      "/violations-fines/violations/:violationId",
    ),
    false,
  );
});

test("saves and restores the layout scroll container position", () => {
  const originalDocument = globalThis.document;
  const scrollContainer = { scrollTop: 264 };

  globalThis.document = {
    querySelector: (selector) =>
      selector === ".layout-scroll .simplebar-content-wrapper"
        ? scrollContainer
        : null,
  };

  try {
    assert.equal(getLayoutScrollContainer(), scrollContainer);
    assert.equal(saveScrollPosition(scrollContainer), 264);

    scrollContainer.scrollTop = 0;
    restoreScrollPosition(scrollContainer, 264);

    assert.equal(scrollContainer.scrollTop, 264);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("scroll helpers are safe when the layout container is unavailable", () => {
  const originalDocument = globalThis.document;
  globalThis.document = undefined;

  try {
    assert.equal(getLayoutScrollContainer(), null);
    assert.equal(saveScrollPosition(null), 0);
    assert.doesNotThrow(() => restoreScrollPosition(null, 264));
  } finally {
    globalThis.document = originalDocument;
  }
});

test("invalidates stale async callbacks when a cached page deactivates", () => {
  const guard = createKeepAliveAsyncGuard();
  const staleVersion = guard.capture();

  guard.invalidate();

  assert.equal(guard.isCurrent(staleVersion), false);
  assert.equal(guard.isCurrent(guard.capture()), true);
});

test("keeps the cached tab unless the return location explicitly selects one", () => {
  assert.equal(resolveKeepAliveTab("appeals", "", undefined), "appeals");
  assert.equal(
    resolveKeepAliveTab("violations", "?tab=appeals", undefined),
    "appeals",
  );
  assert.equal(
    resolveKeepAliveTab("violations", "", { activeTab: "appeals" }),
    "appeals",
  );
});

test("declares the standard list-detail keep-alive contract for supported modules", async () => {
  const routeSource = await readFile(
    new URL("../src/routes/routes.tsx", import.meta.url),
    "utf8",
  );

  for (const { group, rootPath, detailPath } of [
    {
      group: "my-requests",
      rootPath: "/my-requests",
      detailPath: "/my-requests/detail",
    },
    {
      group: "payments",
      rootPath: "/payments",
      detailPath: "/payments/transaction-detail",
    },
    {
      group: "refund",
      rootPath: "/refund",
      detailPath: "/refund/refund-detail",
    },
    {
      group: "complaints",
      rootPath: "/complaints",
      detailPath: "/complaints/complaints-details",
    },
  ]) {
    assert.match(
      routeSource,
      new RegExp(
        `path: "${rootPath}"[\\s\\S]*?keepAlive: \\{[\\s\\S]*?group: "${group}",[\\s\\S]*?mode: "cache",`,
      ),
    );
    assert.match(
      routeSource,
      new RegExp(
        `path: "${detailPath}"[\\s\\S]*?keepAlive: \\{[\\s\\S]*?group: "${group}",[\\s\\S]*?mode: "route",`,
      ),
    );
  }
});

test("declares the Services list, detail, and application route contract", async () => {
  const routeSource = await readFile(
    new URL("../src/routes/routes.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    routeSource,
    /path: "\/services"[\s\S]*?keepAlive: \{[\s\S]*?group: "services",[\s\S]*?mode: "cache",/,
  );

  for (const path of [
    "/services/service-card",
    "/services/media-license",
  ]) {
    assert.match(
      routeSource,
      new RegExp(
        `path: "${path}"[\\s\\S]*?keepAlive: \\{[\\s\\S]*?group: "services",[\\s\\S]*?mode: "route",`,
      ),
    );
  }
});
