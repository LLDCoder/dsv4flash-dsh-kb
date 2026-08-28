import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const readArg = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const baseUrl = readArg("--base-url") || process.env.UMC_BASE_URL || "http://localhost:5174";
const outputDir = path.resolve(
  readArg("--output-dir") || "output/playwright/training-confirmation",
);
const confirmLivePending = args.includes("--live");
const runLiveChecks = confirmLivePending || args.includes("--live-read-only");
const codexHome = process.env.CODEX_HOME || path.join(homedir(), ".codex");
const pwcli = process.env.PWCLI || path.join(
  codexHome,
  "skills/playwright/scripts/playwright_cli.sh",
);
const socketsDir = path.join(tmpdir(), `training-confirmation-${process.pid}`);
const commandEnv = {
  ...process.env,
  PLAYWRIGHT_SOCKETS_DIR: socketsDir,
  UMC_PLAYWRIGHT_SOCKETS_DIR: socketsDir,
  UMC_PLAYWRIGHT_OUTPUT_DIR: path.join(socketsDir, "output"),
};
delete commandEnv.PLAYWRIGHT_CLI_SESSION;
delete commandEnv.UMC_PLAYWRIGHT_SESSION;
mkdirSync(socketsDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

const run = (session, ...commandArgs) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      pwcli,
      ["--session", session, "--raw", ...commandArgs],
      {
        cwd: process.cwd(),
        env: commandEnv,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            [
              `${path.basename(pwcli)} ${commandArgs.join(" ")} failed with exit code ${code}.`,
              stdout,
              stderr,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        );
        return;
      }
      resolve(stdout.trim());
    });
  });

const evaluate = async (session, expression) =>
  JSON.parse(await run(session, "eval", expression));

const waitFor = async (session, expression, label) => {
  const timeoutAt = Date.now() + 30_000;
  let state = {};

  while (Date.now() < timeoutAt) {
    state = await evaluate(session, expression);
    if (state.ready) return state;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${label}. Last state: ${JSON.stringify(state)}`);
};

const pageUrl = (token) =>
  new URL(`/training-confirmation/${token}`, baseUrl).toString();

const withSession = async (name, task) => {
  const session = `training-${name}-${process.pid}`;
  try {
    await task(session);
  } finally {
    await run(session, "close").catch(() => undefined);
  }
};

const openAt = async (session, token, width = 1920, height = 1200) => {
  await run(session, "open", pageUrl(token));
  await run(session, "resize", String(width), String(height));
};

const click = (session, selector) =>
  evaluate(
    session,
    `() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error('Missing element: ${selector}');
      element.click();
      return true;
    }`,
  );

const dispatchVideoEnded = (session) =>
  evaluate(
    session,
    `() => {
      const video = document.querySelector('.training-confirmation__video');
      if (!video) throw new Error('Missing training video');
      video.dispatchEvent(new Event('ended'));
      return true;
    }`,
  );

const latestRequestIndex = async (session, method, suffix) => {
  const requests = await run(session, "requests");
  const pattern = new RegExp(
    `^(\\d+)\\. \\[${method}\\] .*${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "gm",
  );
  const matches = [...requests.matchAll(pattern)];
  assert(matches.length > 0, `Request was not captured: ${method} ${suffix}\n${requests}`);
  return matches.at(-1)[1];
};

const verifyStaticState = (name, token, expectedText) =>
  withSession(name, async (session) => {
    await openAt(session, token);
    const state = await waitFor(
      session,
      `() => ({
        ready: document.body.innerText.includes(${JSON.stringify(expectedText)}),
        pathname: window.location.pathname,
        hasStandaloneRoot: Boolean(document.getElementById('training-confirmation-root')),
        hasPortalRoot: Boolean(document.getElementById('root')),
        successToast: document.body.innerText.includes('Declaration Submitted'),
      })`,
      `${name} state`,
    );
    assert.equal(state.pathname, `/training-confirmation/${token}`);
    assert.equal(state.hasStandaloneRoot, true);
    assert.equal(state.hasPortalRoot, false);
    assert.equal(state.successToast, false);
    await run(
      session,
      "screenshot",
      "--filename",
      path.join(outputDir, `${name}.png`),
      "--full-page",
    );
  });

const verifyPendingInteraction = () =>
  withSession("pending", async (session) => {
    await openAt(session, "mock-pending-confirm");
    await waitFor(
      session,
      `() => ({
        ready: Boolean(document.querySelector('.training-confirmation__submit')) &&
          document.body.innerText.includes('sara.almansoori@example.com') &&
          document.querySelector('.training-confirmation__video')?.duration > 0.75,
      })`,
      "pending page",
    );

    const playbackRestrictions = await evaluate(
      session,
      `() => {
        const video = document.querySelector('.training-confirmation__video');
        if (!video) throw new Error('Missing training video');

        let currentTime = 0.25;
        Object.defineProperty(video, 'currentTime', {
          configurable: true,
          get: () => currentTime,
          set: (value) => {
            currentTime = value;
          },
        });
        video.dispatchEvent(new Event('timeupdate'));
        video.currentTime = 0.75;
        video.dispatchEvent(new Event('seeking'));
        const forwardSeekTime = video.currentTime;

        video.currentTime = 0.1;
        video.dispatchEvent(new Event('seeking'));
        const backwardSeekTime = video.currentTime;
        delete video.currentTime;

        let pauseCalls = 0;
        const originalPause = video.pause.bind(video);
        video.pause = () => {
          pauseCalls += 1;
          originalPause();
        };
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        delete document.hidden;

        return {
          backwardSeekTime,
          disablePictureInPicture: video.disablePictureInPicture,
          forwardSeekTime,
          hasNoDownload: video.controlsList.contains('nodownload'),
          pauseCalls,
        };
      }`,
    );
    assert(playbackRestrictions.forwardSeekTime <= 0.25);
    assert.equal(playbackRestrictions.backwardSeekTime, 0.1);
    assert.equal(playbackRestrictions.pauseCalls, 1);
    assert.equal(playbackRestrictions.hasNoDownload, true);
    assert.equal(playbackRestrictions.disablePictureInPicture, true);

    const sentinel = JSON.stringify({
      value: "customer-portal-token-sentinel",
      timestamp: Date.now(),
    });
    await run(session, "localstorage-set", "NMA_SERVICES_AUTH_TOKEN", sentinel);
    await run(session, "reload");
    await waitFor(
      session,
      `() => ({ ready: Boolean(document.querySelector('.training-confirmation__submit')) })`,
      "pending page after reload",
    );

    const getIndex = await latestRequestIndex(
      session,
      "GET",
      "/api/public/training-confirmation/mock-pending-confirm",
    );
    const getHeaders = await run(session, "request-headers", getIndex);
    assert.doesNotMatch(getHeaders, /^authorization:/im);
    assert.match(getHeaders, /^language: en$/im);
    assert.equal(
      await evaluate(session, `() => localStorage.getItem('NMA_SERVICES_AUTH_TOKEN')`),
      sentinel,
    );

    const getSubmitState = () =>
      evaluate(
        session,
        `() => {
          const submit = document.querySelector('.training-confirmation__submit');
          return {
            ariaDisabled: submit?.getAttribute('aria-disabled'),
            disabled: submit?.disabled,
          };
        }`,
      );
    assert.deepEqual(await getSubmitState(), {
      ariaDisabled: "true",
      disabled: false,
    });
    await click(session, ".training-confirmation__submit");
    await waitFor(
      session,
      `() => ({
        ready: document.body.innerText.includes('Please watch the training video in full before submitting.'),
      })`,
      "watch-video validation toast",
    );
    assert.equal(
      (
        await evaluate(
          session,
          `() => ({ value: document.querySelector('meta[name="referrer"]')?.content })`,
        )
      ).value,
      "no-referrer",
    );
    await click(session, ".training-confirmation__acknowledgement input");
    assert.deepEqual(await getSubmitState(), {
      ariaDisabled: "true",
      disabled: false,
    });
    await click(session, ".training-confirmation__acknowledgement input");
    await dispatchVideoEnded(session);
    await click(session, ".training-confirmation__submit");
    await waitFor(
      session,
      `() => ({
        ready: document.body.innerText.includes('Please confirm the Declaration and Acknowledgement before submitting.'),
      })`,
      "acknowledgement validation toast",
    );
    await click(session, ".training-confirmation__acknowledgement input");
    assert.deepEqual(await getSubmitState(), {
      ariaDisabled: "false",
      disabled: false,
    });

    await click(session, ".training-confirmation__submit");
    const completed = await waitFor(
      session,
      `() => ({
        ready: document.body.innerText.includes('Declaration Already Submitted'),
        successToast: document.body.innerText.includes('Declaration Submitted'),
        pathname: window.location.pathname,
      })`,
      "confirmed state",
    );
    assert.equal(completed.successToast, true);
    assert.equal(completed.pathname, "/training-confirmation/mock-pending-confirm");

    const postIndex = await latestRequestIndex(
      session,
      "POST",
      "/api/public/training-confirmation/mock-pending-confirm/confirm",
    );
    assert.deepEqual(JSON.parse(await run(session, "request-body", postIndex)), {
      confirmed: true,
    });
  });

const verifyFailureStates = () =>
  Promise.all([
    withSession("video-missing", async (session) => {
      await openAt(session, "mock-video-missing");
      const state = await waitFor(
        session,
        `() => ({
          ready: document.body.innerText.includes('The training video is currently unavailable'),
          hasVideo: Boolean(document.querySelector('.training-confirmation__video')),
          ariaDisabled: document.querySelector('.training-confirmation__submit')?.getAttribute('aria-disabled'),
          disabled: document.querySelector('.training-confirmation__submit')?.disabled,
        })`,
        "video-missing state",
      );
      assert.equal(state.hasVideo, false);
      assert.equal(state.ariaDisabled, "true");
      assert.equal(state.disabled, false);
      await click(session, ".training-confirmation__submit");
      await waitFor(
        session,
        `() => ({
          ready: document.body.innerText.includes('The training video is currently unavailable. Please try again later.'),
        })`,
        "video-missing validation toast",
      );
    }),
    withSession("video-refresh", async (session) => {
      await openAt(session, "mock-video-refresh");
      const state = await waitFor(
        session,
        `() => {
          const video = document.querySelector('.training-confirmation__video');
          return {
            ready: Boolean(video?.src.includes('training-confirmation-mock-video.mp4')),
            unavailable: document.body.innerText.includes('The training video is currently unavailable'),
          };
        }`,
        "refreshed video URL",
      );
      assert.equal(state.unavailable, false);
    }),
    withSession("get-error", async (session) => {
      await openAt(session, "mock-get-error");
      await waitFor(
        session,
        `() => ({ ready: document.body.innerText.includes('Unable to load this page') })`,
        "load-error state",
      );
      const consoleMessages = await run(session, "console", "error");
      const applicationLogs = consoleMessages
        .split("\n")
        .filter((line) => /src\/(?:utils\/request|training-confirmation\/index)\.tsx?/.test(line))
        .join("\n");
      assert.doesNotMatch(applicationLogs, /mock-get-error/);
      if (applicationLogs.includes("Request failed:")) {
        assert.match(applicationLogs, /url: \[REDACTED\]/);
      }
    }),
    withSession("invalid-payload", async (session) => {
      await openAt(session, "mock-invalid-payload");
      await waitFor(
        session,
        `() => ({ ready: document.body.innerText.includes('Unable to load this page') })`,
        "invalid Pending payload state",
      );
    }),
    withSession("null-name", async (session) => {
      await openAt(session, "mock-null-name");
      const state = await waitFor(
        session,
        `() => ({
          ready: Boolean(document.querySelector('.training-confirmation__submit')),
          text: document.body.innerText,
        })`,
        "nullable recipientName Pending state",
      );
      assert.doesNotMatch(state.text, /undefined|null/);
    }),
    withSession("confirm-error", async (session) => {
      await openAt(session, "mock-confirm-error");
      await waitFor(
        session,
        `() => ({ ready: Boolean(document.querySelector('.training-confirmation__submit')) })`,
        "confirm-error pending page",
      );
      await click(session, ".training-confirmation__acknowledgement input");
      await dispatchVideoEnded(session);
      await click(session, ".training-confirmation__submit");
      const state = await waitFor(
        session,
        `() => ({
          ready: document.body.innerText.includes('Submission failed. Please try again.'),
          stillPending: Boolean(document.querySelector('.training-confirmation__submit')),
        })`,
        "confirm-error toast",
      );
      assert.equal(state.stillPending, true);
    }),
  ]);

const verifyArabic = () =>
  withSession("arabic", async (session) => {
    await openAt(session, "mock-pending-ar");
    await run(session, "localstorage-set", "language", "ar");
    await run(session, "reload");
    const state = await waitFor(
      session,
      `() => ({
        ready: document.body.innerText.includes('تدريب إرشادات المحتوى الإعلاني'),
        dir: document.documentElement.dir,
        lang: document.documentElement.lang,
      })`,
      "Arabic page",
    );
    assert.equal(state.dir, "rtl");
    assert.equal(state.lang, "ar");
    await click(session, ".training-confirmation__submit");
    await waitFor(
      session,
      `() => ({
        ready: document.body.innerText.includes('يُرجى مشاهدة فيديو التدريب بالكامل قبل الإرسال.'),
      })`,
      "Arabic watch-video validation toast",
    );
  });

const verifyViewport = (width) =>
  withSession(`viewport-${width}`, async (session) => {
    await openAt(session, `mock-pending-${width}`, width, 1200);
    const state = await waitFor(
      session,
      `() => {
        const shell = document.querySelector('.training-confirmation__shell');
        const video = document.querySelector('.training-confirmation__video');
        const rect = shell?.getBoundingClientRect();
        return {
          ready: Boolean(shell && video),
          shellWidth: rect?.width,
          left: rect?.left,
          right: window.innerWidth - rect?.right,
          viewportWidth: window.innerWidth,
          videoWidth: video?.getBoundingClientRect().width,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      }`,
      `${width}px layout`,
    );
    assert.equal(state.scrollWidth, state.clientWidth, `${width}px must not scroll horizontally`);
    assert(Math.abs(state.left - state.right) <= 1, `${width}px shell must be centered`);
    const expectedWidth = width >= 1184 ? 1136 : width <= 768 ? width : width - 48;
    assert(Math.abs(state.shellWidth - expectedWidth) <= 1, `${width}px shell width`);
    assert(state.videoWidth > 0 && state.videoWidth <= state.shellWidth);
    await run(
      session,
      "screenshot",
      "--filename",
      path.join(outputDir, `pending-${width}.png`),
      "--full-page",
    );
  });

await Promise.all([
  verifyPendingInteraction(),
  verifyStaticState("completed", "mock-completed", "Declaration Already Submitted"),
  verifyStaticState("expired", "mock-expired", "This link has expired"),
  verifyStaticState("cancelled", "mock-cancelled", "Application cancelled"),
  verifyStaticState("not-found", "mock-not-found", "This link is invalid"),
  verifyArabic(),
]);
await verifyFailureStates();
await Promise.all([1920, 1280, 1024, 768, 375].map(verifyViewport));

if (runLiveChecks) {
  const liveTokens = {
    pending: "5rCKaNb6zAEcwwEq49UZK7YgE6ffhbuoh2ipRvthS6g",
    completed: "Fb_WgQBdz6DewEeHZFhqycjyQHP6-nrWTZUycsI59Qs",
    expired: "XOkJE2tPIT8ujChwMJVHdnWc-XMd9N8NcNQORCysyhg",
    cancelled: "LXGEd2SKWax_A3DvCpUK0OJBJ0UaSz_qPmDjI-ongEk",
    arabicName: "bl3Se1YxLCX7yB3YNs18izlAp_Q3FBcm3gJSpXZurew",
    longName: "he7QWS7ptslkZE73ey6X853NCiFY5-20Xk__ldaqnQ8",
    nullName: "To-NgmU3aCAERZ_H6YF3i_RJg0AwOsr3cWebsWwMOk8",
    nearExpiry: "g1XRzTwT-N6nxU1UcnbNVwiWtL3xd_TZZ-1iuIeFIQ4",
    notFound: "garbage-token-xxx",
  };

  await Promise.all([
    verifyStaticState(
      "live-completed",
      liveTokens.completed,
      "Declaration Already Submitted",
    ),
    verifyStaticState("live-expired", liveTokens.expired, "This link has expired"),
    verifyStaticState("live-cancelled", liveTokens.cancelled, "Application cancelled"),
    verifyStaticState("live-not-found", liveTokens.notFound, "This link is invalid"),
    verifyStaticState("live-arabic-name", liveTokens.arabicName, "محمد عبدالله الشامسي"),
    verifyStaticState(
      "live-near-expiry",
      liveTokens.nearExpiry,
      "Expiring Soon",
    ),
    withSession("live-long-name", async (session) => {
      await openAt(session, liveTokens.longName, 375, 1200);
      const state = await waitFor(
        session,
        `() => ({
          ready: document.body.innerText.includes('Abdulrahman Mohammed Abdullah Al Shamsi Al Maktoum Bin Rashid Al Nuaimi'),
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        })`,
        "live long recipientName layout",
      );
      assert.equal(state.scrollWidth, state.clientWidth);
    }),
    withSession("live-null-name", async (session) => {
      await openAt(session, liveTokens.nullName);
      const state = await waitFor(
        session,
        `() => ({
          ready: document.body.innerText.includes('fe-noname@example.com'),
          text: document.body.innerText,
        })`,
        "live nullable recipientName",
      );
      assert.doesNotMatch(state.text, /undefined|null/);
    }),
  ]);

  await withSession("live-pending-confirm", async (session) => {
    await openAt(session, liveTokens.pending);
    const pending = await waitFor(
      session,
      `() => {
        const video = document.querySelector('.training-confirmation__video');
        return {
        ready: document.body.innerText.includes('FE Test - Pending') &&
          document.body.innerText.includes('fe-pending@example.com') &&
          video?.readyState >= 1,
          videoWidth: video?.videoWidth,
          videoHeight: video?.videoHeight,
        };
      }`,
      "live Pending page and video metadata",
    );
    assert(pending.videoWidth > 0 && pending.videoHeight > 0);

    await run(session, "localstorage-set", "language", "ar");
    await run(session, "reload");
    const arabic = await waitFor(
      session,
      `() => ({
        ready: document.body.innerText.includes('تدريب إرشادات المحتوى الإعلاني'),
        hasArabicService: document.body.innerText.includes('تصريح الأفراد الزائرين'),
        dir: document.documentElement.dir,
      })`,
      "live Arabic response",
    );
    assert.equal(arabic.hasArabicService, true);
    assert.equal(arabic.dir, "rtl");

    if (confirmLivePending) {
      await run(session, "localstorage-set", "language", "en");
      await run(session, "reload");
      await waitFor(
        session,
        `() => ({ ready: Boolean(document.querySelector('.training-confirmation__submit')) })`,
        "live Pending confirmation controls",
      );
      await click(session, ".training-confirmation__acknowledgement input");
      await dispatchVideoEnded(session);
      await click(session, ".training-confirmation__submit");
      const confirmed = await waitFor(
        session,
        `() => ({
          ready: document.body.innerText.includes('Declaration Already Submitted'),
          successToast: document.body.innerText.includes('Declaration Submitted'),
        })`,
        "live Pending to Completed confirmation",
      );
      assert.equal(confirmed.successToast, true);

      const postIndex = await latestRequestIndex(
        session,
        "POST",
        `/api/public/training-confirmation/${liveTokens.pending}/confirm`,
      );
      assert.deepEqual(JSON.parse(await run(session, "request-body", postIndex)), {
        confirmed: true,
      });
    }
  });
}

console.log("Training confirmation checks passed.");
