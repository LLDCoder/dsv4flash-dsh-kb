import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const DEFAULT_BASE_URL = "http://localhost:5174";
const DEFAULT_VIEWPORT_HEIGHT = 1200;
const args = process.argv.slice(2);
const readArg = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const email = readArg("--email") || process.env.UMC_LOGIN_EMAIL;
const password = readArg("--password") || process.env.UMC_LOGIN_PASSWORD;
const baseUrl = readArg("--base-url") || process.env.UMC_BASE_URL || DEFAULT_BASE_URL;
const viewportWidth = Number(readArg("--width") || process.env.UMC_VIEWPORT_WIDTH);
const viewportHeight = Number(
  readArg("--height") || process.env.UMC_VIEWPORT_HEIGHT || DEFAULT_VIEWPORT_HEIGHT,
);
const language = readArg("--language") || "en";
const targetPath = readArg("--target-path") || "/";
const capture = args.includes("--capture");
const telemetry = args.includes("--telemetry");
const verifyResizeSequence = args.includes("--verify-resize-sequence");
const openPendingModification = args.includes("--open-pending-modification");
const outputDir = path.resolve(
  readArg("--output-dir") || "output/playwright/responsive-layout",
);
const codexHome = process.env.CODEX_HOME || path.join(homedir(), ".codex");
const pwcli = process.env.PWCLI || path.join(codexHome, "skills/playwright/scripts/playwright_cli.sh");
const loginHelper = path.join(
  codexHome,
  "skills/umc-customer-browser-test/scripts/login_and_prepare_session.sh",
);
const socketsDir = path.join(tmpdir(), `umc-responsive-layout-${process.pid}`);

assert(email, "Pass --email or set UMC_LOGIN_EMAIL.");
assert(password, "Pass --password or set UMC_LOGIN_PASSWORD.");
assert(Number.isFinite(viewportWidth) && viewportWidth > 0, "Pass a positive --width.");
assert(Number.isFinite(viewportHeight) && viewportHeight > 0, "Viewport height must be positive.");
assert(["en", "ar"].includes(language), "Language must be en or ar.");

mkdirSync(socketsDir, { recursive: true });
if (capture) mkdirSync(outputDir, { recursive: true });

const commandEnv = {
  ...process.env,
  PLAYWRIGHT_SOCKETS_DIR: socketsDir,
  UMC_PLAYWRIGHT_SOCKETS_DIR: socketsDir,
  UMC_PLAYWRIGHT_OUTPUT_DIR: path.join(socketsDir, "output"),
};
delete commandEnv.PLAYWRIGHT_CLI_SESSION;
delete commandEnv.UMC_PLAYWRIGHT_SESSION;

const run = (file, commandArgs) => {
  const result = spawnSync(file, commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: commandEnv,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const safeArgs = commandArgs.map((argument, index) =>
      commandArgs[index - 1] === "--password" ? "[REDACTED]" : argument,
    );
    throw new Error(
      [
        `${path.basename(file)} ${safeArgs.join(" ")} failed with exit code ${result.status}.`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout.trim();
};

const loginViewportWidth = viewportWidth <= 768 ? 1920 : viewportWidth;
const loginOutput = run(loginHelper, [
  "--base-url",
  baseUrl,
  "--email",
  email,
  "--password",
  password,
  "--width",
  String(loginViewportWidth),
  "--height",
  String(viewportHeight),
  "--target-path",
  targetPath,
  "--headless",
]);
const sessionMatch = loginOutput.match(/Playwright session '([^']+)' is ready\./);
assert(sessionMatch, `Unable to read the Playwright session name.\n${loginOutput}`);
const session = sessionMatch[1];
const cli = (...commandArgs) => run(pwcli, ["--session", session, "--raw", ...commandArgs]);
const evaluateJson = (expression) => JSON.parse(cli("eval", expression));

const waitForLayout = () => {
  const timeoutAt = Date.now() + 30_000;
  let state = {};

  while (Date.now() < timeoutAt) {
    state = evaluateJson(
      "() => ({ ready: Boolean(document.querySelector('.header') && document.querySelector('.layout-content') && document.querySelector('.footer')), path: location.pathname })",
    );
    if (state.ready) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }

  throw new Error(`Timed out waiting for the layout. Last state: ${JSON.stringify(state)}`);
};

const closeLoginAsModal = () => {
  evaluateJson(`() => {
    const close = document.querySelector('.loginas-modal .ant-modal-close');
    if (close) close.click();
    return { closed: Boolean(close) };
  }`);
};

const waitForMediaLicense = () => {
  const timeoutAt = Date.now() + 30_000;
  while (Date.now() < timeoutAt) {
    const state = evaluateJson(
      "() => ({ ready: Boolean(document.querySelector('.media-license-content .right-section')), path: location.pathname })",
    );
    if (state.ready) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  throw new Error("Timed out waiting for the real Pending Modification page.");
};

const openRealPendingModification = () => {
  const result = evaluateJson(`() => {
    const modal = document.querySelector('.loginas-modal');
    if (!modal) return { clicked: false, reason: 'Sign In As modal is not visible' };
    const actions = [...modal.querySelectorAll('button, [role="button"], a')];
    const action = actions.find((candidate) => {
      if (!/edit|modify|continue/i.test(candidate.textContent || '')) return false;
      let parent = candidate;
      for (let depth = 0; depth < 6 && parent; depth += 1, parent = parent.parentElement) {
        if (/pending modification/i.test(parent.textContent || '')) return true;
      }
      return false;
    });
    if (!action) return { clicked: false, reason: 'No real Pending Modification action was found' };
    action.click();
    return { clicked: true };
  }`);
  assert(result.clicked, result.reason);
  waitForMediaLicense();
};

const verifyMobileDrawer = () => {
  const opened = evaluateJson(`() => {
    const trigger = document.querySelector('.header:not(.GlobalSearch) .actions > span');
    if (!trigger) return { clicked: false };
    trigger.click();
    return { clicked: true };
  }`);
  assert(opened.clicked, "Mobile drawer trigger must exist.");

  const timeoutAt = Date.now() + 10_000;
  let drawerState = {};
  while (Date.now() < timeoutAt) {
    drawerState = evaluateJson(`() => {
      const drawer = document.querySelector('.mobile-menu-drawer-content');
      const visible = Boolean(drawer && drawer.getBoundingClientRect().height > 0);
      const list = drawer?.querySelector('.mobile-menu-drawer-list');
      const items = [...(list?.querySelectorAll('.mobile-menu-drawer-li') || [])];
      const firstItem = items[0];
      const secondItem = items[1];
      const firstIcon = firstItem?.querySelector('.mobile-menu-drawer-li-icon');
      const firstIconGraphic = firstIcon?.querySelector('svg, img');
      const firstTitle = firstItem?.querySelector('.mobile-menu-drawer-li-title');
      const secondTitle = secondItem?.querySelector('.mobile-menu-drawer-li-title');
      const userSection = drawer?.querySelector('.mobile-menu-drawer-user');
      const firstUserIcon = userSection?.querySelector('.mobile-menu-drawer-user-icon');
      const firstUserIconGraphic = firstUserIcon?.querySelector('svg, img');
      const firstUserText = userSection?.querySelector('.mobile-menu-drawer-user-text');
      const languageSwitcher = drawer?.querySelector('.mobile-menu-drawer-footer-btns');
      const languageFlag = languageSwitcher?.querySelector('img');
      const rect = (element) => {
        if (!element) return null;
        const value = element.getBoundingClientRect();
        return { left: value.left, right: value.right, width: value.width };
      };
      const inlineStart = (element) => {
        const value = rect(element);
        if (!value) return null;
        return document.documentElement.dir === 'rtl'
          ? innerWidth - value.right
          : value.left;
      };
      const dividerStyle = secondItem ? getComputedStyle(secondItem, '::before') : null;
      const userDividerStyle = userSection ? getComputedStyle(userSection, '::before') : null;
      return {
        visible,
        direction: drawer ? getComputedStyle(drawer).direction : '',
        list: rect(list),
        firstItem: rect(firstItem),
        firstIconInlineStart: inlineStart(firstIcon),
        firstIconTransform: firstIconGraphic ? getComputedStyle(firstIconGraphic).transform : null,
        firstTitleInlineStart: inlineStart(firstTitle),
        secondTitleInlineStart: inlineStart(secondTitle),
        titleFontSize: firstTitle ? Number.parseFloat(getComputedStyle(firstTitle).fontSize) : null,
        dividerInlineStart: dividerStyle ? Number.parseFloat(dividerStyle.insetInlineStart) : null,
        dividerInlineEnd: dividerStyle ? Number.parseFloat(dividerStyle.insetInlineEnd) : null,
        firstUserIconInlineStart: inlineStart(firstUserIcon),
        firstUserIconTransform: firstUserIconGraphic ? getComputedStyle(firstUserIconGraphic).transform : null,
        firstUserTextInlineStart: inlineStart(firstUserText),
        userDividerInlineStart: userDividerStyle ? Number.parseFloat(userDividerStyle.insetInlineStart) : null,
        userDividerInlineEnd: userDividerStyle ? Number.parseFloat(userDividerStyle.insetInlineEnd) : null,
        languageSwitcher: rect(languageSwitcher),
        languageFlagTransform: languageFlag ? getComputedStyle(languageFlag).transform : null,
        languageSwitcherBottom: languageSwitcher?.getBoundingClientRect().bottom ?? null,
      };
    }`);
    if (drawerState.visible) break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }

  assert(drawerState.visible, "Mobile drawer must open.");
  assert.equal(drawerState.direction, language === "ar" ? "rtl" : "ltr", "Mobile drawer direction is incorrect.");
  assert.equal(drawerState.list.left, 0, "Mobile drawer menu rows must span the viewport.");
  assert.equal(drawerState.list.width, viewportWidth, "Mobile drawer list width must match the viewport.");
  assert.equal(drawerState.firstItem.left, 0, "Mobile drawer menu item must start at the viewport edge.");
  assert.equal(drawerState.firstItem.width, viewportWidth, "Mobile drawer menu item must span the viewport.");
  assert.equal(drawerState.firstIconInlineStart, 20, "Mobile drawer menu icons must start 20px from the inline edge.");
  assert.equal(drawerState.firstTitleInlineStart, 56, "Active Home title must start 56px from the inline edge.");
  assert.equal(drawerState.secondTitleInlineStart, 60, "Mobile drawer menu titles must start 60px from the inline edge.");
  assert.equal(drawerState.titleFontSize, 18, "Mobile drawer menu title size must be 18px.");
  assert.equal(drawerState.dividerInlineStart, 16, "Mobile drawer dividers must preserve the 16px inline start inset.");
  assert.equal(drawerState.dividerInlineEnd, 16, "Mobile drawer dividers must preserve the 16px inline end inset.");
  assert.equal(drawerState.firstUserIconInlineStart, 24, "Mobile account icons must start 24px from the inline edge.");
  assert.equal(drawerState.firstUserTextInlineStart, 60, "Mobile account labels must start 60px from the inline edge.");
  const expectedIconTransform = language === "ar" ? "matrix(-1, 0, 0, 1, 0, 0)" : "none";
  assert.equal(drawerState.firstIconTransform, expectedIconTransform, "Mobile menu icons must mirror only in RTL.");
  assert.equal(drawerState.firstUserIconTransform, expectedIconTransform, "Mobile account icons must mirror only in RTL.");
  assert.equal(drawerState.languageFlagTransform, "none", "Language flags must never be mirrored.");
  assert.equal(drawerState.userDividerInlineStart, 16, "Mobile account dividers must preserve the 16px inline start inset.");
  assert.equal(drawerState.userDividerInlineEnd, 16, "Mobile account dividers must preserve the 16px inline end inset.");
  assert.equal(drawerState.languageSwitcher.left, 16, "Mobile language switcher must preserve 16px left spacing.");
  assert.equal(drawerState.languageSwitcher.width, viewportWidth - 32, "Mobile language switcher must preserve 16px side spacing.");
  assert(
    drawerState.languageSwitcherBottom <= viewportHeight - 38,
    `Mobile language switcher must preserve the 38px design bottom spacing; received bottom ${drawerState.languageSwitcherBottom}px.`,
  );

  if (capture) {
    evaluateJson(`() => {
      const list = document.querySelector('.mobile-menu-drawer-list');
      const languageSwitcher = document.querySelector('.mobile-menu-drawer-footer-btns');
      if (list) list.style.outline = '2px solid #e53935';
      if (languageSwitcher) languageSwitcher.style.outline = '2px solid #16a34a';
      return true;
    }`);
    const screenshotOutput = cli("screenshot");
    const generatedPath =
      screenshotOutput.match(/\(([^)]+\.png)\)/)?.[1] || screenshotOutput.trim();
    assert(generatedPath.endsWith(".png"), `Unable to read drawer screenshot path.\n${screenshotOutput}`);
    copyFileSync(
      path.resolve(generatedPath),
      path.join(outputDir, `${viewportWidth}x${viewportHeight}-${language}-drawer-annotated.png`),
    );
  }
  const closed = evaluateJson(`() => {
    const close = document.querySelector('.mobile-menu-drawer-header-close');
    if (!close) return { clicked: false };
    close.click();
    return { clicked: true };
  }`);
  assert(closed.clicked, "Mobile drawer close control must exist.");

  const closeTimeoutAt = Date.now() + 10_000;
  while (Date.now() < closeTimeoutAt) {
    const visible = evaluateJson(
      "() => { const drawer = document.querySelector('.mobile-menu-drawer-content'); return Boolean(drawer && drawer.getBoundingClientRect().height > 0); }",
    );
    if (!visible) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  throw new Error("Mobile drawer did not close.");
};

const verifyHistoricalMenuHover = () => {
  if (viewportWidth <= 1024 || viewportWidth >= 1680) return;

  const probe = evaluateJson(`() => {
    const item = document.querySelector('.menu-item:not(.menu-item-active)');
    if (item) item.setAttribute('aria-label', 'Menu hover probe');
    return { found: Boolean(item) };
  }`);
  assert(probe.found, "Menu hover probe must exist.");

  const snapshot = cli("snapshot");
  const ref = snapshot.match(/link "Menu hover probe" \[ref=([^\]]+)\]/)?.[1];
  assert(ref, `Unable to locate menu hover probe in snapshot.\n${snapshot}`);
  cli("hover", ref);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);

  const hoverState = evaluateJson(`() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { width: value.width, height: value.height };
    };
    const probeItem = document.querySelector('[aria-label="Menu hover probe"]');
    const activeItem = document.querySelector('.menu-item-active');
    const menu = document.querySelector('.header:not(.GlobalSearch) .menu');
    const actions = document.querySelector('.header:not(.GlobalSearch) .actions');
    const probeStyle = probeItem ? getComputedStyle(probeItem) : null;
    const activeStyle = activeItem ? getComputedStyle(activeItem) : null;
    const overlaps = (first, second) => Boolean(
      first && second && first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top
    );
    return {
      probe: rect('[aria-label="Menu hover probe"]'),
      active: rect('.menu-item-active'),
      probeLabelVisible: Boolean(
        probeItem?.querySelector('span') &&
        getComputedStyle(probeItem.querySelector('span')).display !== 'none' &&
        Number.parseFloat(getComputedStyle(probeItem.querySelector('span')).opacity) > 0 &&
        probeItem.querySelector('span').getBoundingClientRect().width > 0
      ),
      documentFitsViewport:
        document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      activeFound: Boolean(activeItem),
      menuActionsOverlap: overlaps(menu?.getBoundingClientRect(), actions?.getBoundingClientRect()),
      probeBackground: probeStyle?.backgroundImage,
      activeBackground: activeStyle?.backgroundImage,
      probePadding: probeStyle ? [probeStyle.paddingTop, probeStyle.paddingRight, probeStyle.paddingBottom, probeStyle.paddingLeft] : null,
      activePadding: activeStyle ? [activeStyle.paddingTop, activeStyle.paddingRight, activeStyle.paddingBottom, activeStyle.paddingLeft] : null,
      probeGap: probeStyle?.columnGap,
      activeGap: activeStyle?.columnGap,
    };
  }`);

  assert(hoverState.activeFound, "Menu active item must exist.");
  assert.equal(hoverState.probe?.height, hoverState.active?.height, "Menu hover and active states must have the same height.");
  assert.equal(hoverState.probeBackground, hoverState.activeBackground, "Menu hover and active states must use the same background.");
  assert.deepEqual(hoverState.probePadding, hoverState.activePadding, "Menu hover and active states must use the same padding.");
  assert.equal(hoverState.probeGap, hoverState.activeGap, "Menu hover and active states must use the same icon-label gap.");
  if (viewportWidth <= 1440) {
    assert.equal(hoverState.probe?.width, 47, "Historical compact menu hover must remain 47px wide.");
    assert.equal(hoverState.active?.width, 47, "Historical compact active item must remain 47px wide.");
    assert.equal(hoverState.probeLabelVisible, false, "Historical compact menu hover must keep its label hidden.");
  } else {
    assert(hoverState.probe.width > 47, "Historical desktop menu hover must expand beyond the icon width.");
    assert(hoverState.active.width > 47, "Historical desktop active item must expand beyond the icon width.");
    assert.equal(hoverState.probeLabelVisible, true, "Historical desktop menu hover must reveal its label.");
  }
  assert(hoverState.documentFitsViewport, "Menu hover must not cause horizontal overflow.");
  assert(!hoverState.menuActionsOverlap, "Menu hover must not overlap the header actions.");
};

const getState = () =>
  evaluateJson(`() => {
    const visible = (element) => Boolean(
      element &&
      getComputedStyle(element).display !== 'none' &&
      getComputedStyle(element).visibility !== 'hidden' &&
      element.getBoundingClientRect().width > 0 &&
      element.getBoundingClientRect().height > 0
    );
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
    };
    const overlaps = (first, second) => Boolean(
      first && second && first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top
    );
    const px = (value) => Number.parseFloat(value) || 0;
    const header = document.querySelector('.header:not(.GlobalSearch)');
    const footer = document.querySelector('.footer');
    const footerLinks = footer?.querySelector('.links');
    const footerCopyright = footer?.querySelector('.copyright');
    const footerSocial = footer?.querySelector('.footer__social-links');
    const content = document.querySelector('.layout-content');
    const menu = header?.querySelector('.menu');
    const actions = header?.querySelector('.actions');
    const logo = header?.querySelector('.logo');
    const logoSvg = logo?.querySelector('svg');
    const name = header?.querySelector('.users .name');
    const caret = header?.querySelector('.users .caret-down');
    const searchAction = header?.querySelector('.header__action--search');
    const notificationAction = header?.querySelector('.header__action--notification');
    const userMenuAction = header?.querySelector('.actions > span');
    const identityAction = header?.querySelector('.actions > .users');
    const inactiveMenuItem = menu?.querySelector(
      '.menu-item:not(.menu-item-active):not([aria-label="Menu hover probe"])',
    );
    const activeMenuItem = menu?.querySelector('.menu-item-active');
    const actionItems = [...(actions?.children || [])].filter(visible);
    const activeMenuLabel = menu?.querySelector('.menu-item-active span');
    const sidebar = document.querySelector('.media-license-content .right-section');
    const mediaContent = document.querySelector('.media-license-content');
    const mediaMain = mediaContent?.querySelector('.left-section');
    const mobileContentHeader = document.querySelector('.breadcrumbs, .page-name');
    const styles = {
      header: getComputedStyle(header),
      footer: getComputedStyle(footer),
      content: getComputedStyle(content),
    };

    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      viewportWidth: innerWidth,
      documentFitsViewport: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      headerPaddingLeft: px(styles.header.paddingLeft),
      headerPaddingRight: px(styles.header.paddingRight),
      footerPaddingLeft: px(styles.footer.paddingLeft),
      footerPaddingRight: px(styles.footer.paddingRight),
      footerDirection: styles.footer.flexDirection,
      footerHeight: rect(footer)?.height,
      footerChildrenOverlap: overlaps(rect(footerLinks), rect(footerCopyright)) || overlaps(rect(footerLinks), rect(footerSocial)) || overlaps(rect(footerCopyright), rect(footerSocial)),
      footerHasClippedContent: [footerLinks, footerCopyright, footerSocial].some((element) => element && (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)),
      contentPaddingLeft: px(styles.content.paddingLeft),
      contentPaddingRight: px(styles.content.paddingRight),
      menuVisible: visible(menu),
      menuGap: menu ? px(getComputedStyle(menu).columnGap) : null,
      actionGap: actions ? px(getComputedStyle(actions).columnGap) : null,
      inactiveMenuItemWidth: rect(inactiveMenuItem)?.width ?? null,
      activeMenuItemWidth: rect(activeMenuItem)?.width ?? null,
      searchActionWidth: searchAction ? px(getComputedStyle(searchAction).width) : null,
      notificationActionWidth: notificationAction ? px(getComputedStyle(notificationAction).width) : null,
      userMenuActionWidth: userMenuAction ? px(getComputedStyle(userMenuAction).width) : null,
      logoIsCompact: logo?.tagName === 'DIV',
      logoHeight: rect(logo)?.height ?? null,
      logoSvgWidth: rect(logoSvg)?.width ?? null,
      logoSvgHeight: rect(logoSvg)?.height ?? null,
      profileNameVisible: visible(name),
      profileCaretVisible: visible(caret),
      activeMenuLabelVisible: visible(activeMenuLabel),
      visibleActionCount: actionItems.length,
      searchActionVisible: visible(searchAction),
      notificationActionVisible: visible(notificationAction),
      userMenuActionVisible: visible(userMenuAction),
      identityActionVisible: visible(identityAction),
      menuActionsOverlap: overlaps(rect(menu), rect(actions)),
      menuActionsClearance: menu && actions
        ? (document.documentElement.dir === 'rtl'
            ? rect(menu).left - rect(actions).right
            : rect(actions).left - rect(menu).right)
        : null,
      logoMenuOverlap: overlaps(rect(logo), rect(menu)),
      sidebarWidth: sidebar ? rect(sidebar).width : null,
      mediaContentWidth: mediaContent ? rect(mediaContent).width : null,
      mediaMainWidth: mediaMain ? rect(mediaMain).width : null,
      mediaColumnGap:
        mediaMain && sidebar
          ? Math.max(rect(mediaMain).left, rect(sidebar).left) -
            Math.min(rect(mediaMain).right, rect(sidebar).right)
          : null,
      mediaDirection: mediaContent ? getComputedStyle(mediaContent).flexDirection : null,
      sidebarBeforeMain: sidebar && mediaMain ? rect(sidebar).top <= rect(mediaMain).top : null,
      mobileContentPaddingLeft: mobileContentHeader ? px(getComputedStyle(mobileContentHeader).paddingLeft) : null,
      mobileContentPaddingRight: mobileContentHeader ? px(getComputedStyle(mobileContentHeader).paddingRight) : null,
      consoleMarker: 'responsive-layout',
    };
  }`);

const getBottomState = () => {
  evaluateJson(`() => {
    const scrollWrapper = document.querySelector('.layout-scroll .simplebar-content-wrapper');
    if (scrollWrapper) scrollWrapper.scrollTop = scrollWrapper.scrollHeight;
    return true;
  }`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);

  return evaluateJson(`() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { top: value.top, bottom: value.bottom, height: value.height };
    };
    const footer = rect('.footer');
    const actionFooter = rect('.action-footer');
    const sidebarSixteenPixelTexts = [
      ...document.querySelectorAll('.media-license-content .right-section *'),
    ].filter((element) => {
      const style = getComputedStyle(element);
      const directText = [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
      );
      return directText && style.display !== 'none' && Number.parseFloat(style.fontSize) === 16;
    }).map((element) => ({
      className: element.className,
      text: (element.textContent || '').trim().slice(0, 80),
    }));

    return {
      footer,
      actionFooter,
      footerFullyVisible: Boolean(
        footer && footer.top >= 0 && footer.bottom <= innerHeight + 1
      ),
      actionFooterAboveFooter: Boolean(
        !actionFooter || !footer || actionFooter.bottom <= footer.top + 1
      ),
      sidebarSixteenPixelTexts,
    };
  }`);
};

const captureRegion = (region) => {
  const filename = `${viewportWidth}x${viewportHeight}-${language}-${region}-annotated.png`;
  const targetPathname = path.join(outputDir, filename);
  const selectors =
    region === "footer"
      ? [[
          ".footer",
          `Footer: ${viewportWidth <= 768 ? 24 : 40}px padding; ${viewportWidth <= 1439 ? "stacked" : "single row"}`,
        ]]
      : [
          [
            ".header:not(.GlobalSearch)",
            viewportWidth <= 1024
              ? `${viewportWidth <= 768 ? 24 : 40}px padding; menu hidden; 4 actions visible`
              : `Header padding: ${viewportWidth <= 768 ? 24 : 40}px`,
          ],
          ...(viewportWidth > 1024 ? [[".menu", "Responsive menu state"]] : []),
          ...(viewportWidth > 1024 && viewportWidth < 1680
            ? [[
                ".menu-item-active",
                viewportWidth <= 1440
                  ? "Historical compact active state: 47 x 47px"
                  : "Historical active state: expanded label",
              ]]
            : []),
          ...(viewportWidth > 1024 ? [[".actions", "Collision-safe actions"]] : []),
          [
            ".layout-content",
            `Content boundary: ${viewportWidth >= 1920 ? (viewportWidth - 1680) / 2 : viewportWidth >= 1281 ? 64 : viewportWidth >= 1024 ? 40 : 0}px side padding`,
          ],
          [".media-license-content .left-section", "Fluid Services main column; 16px column gap"],
          [
            ".media-license-content .right-section",
            `Services sidebar: ${viewportWidth >= 1920 ? "500px" : viewportWidth >= 1024 ? "380px" : "100%"}`,
          ],
        ];

  cli(
    "eval",
    `() => {
      document.querySelectorAll('[data-responsive-annotation]').forEach((node) => node.remove());
      document.querySelectorAll('[data-responsive-outline]').forEach((node) => {
        node.style.outline = node.dataset.previousOutline || '';
        node.removeAttribute('data-responsive-outline');
        node.removeAttribute('data-previous-outline');
      });
      const focus = document.querySelector(${JSON.stringify(region === "footer" ? ".footer" : ".header:not(.GlobalSearch)")});
      focus?.scrollIntoView({ block: ${JSON.stringify(region === "footer" ? "end" : "start")}, inline: 'nearest' });
      const selectors = ${JSON.stringify(selectors)};
      for (const [selector, text] of selectors) {
        const target = document.querySelector(selector);
        if (!target || getComputedStyle(target).display === 'none') continue;
        target.dataset.responsiveOutline = 'true';
        target.dataset.previousOutline = target.style.outline;
        target.style.outline = '3px solid #e53935';
        const label = document.createElement('div');
        label.dataset.responsiveAnnotation = 'true';
        label.textContent = text;
        label.style.cssText = 'background:#e53935;color:#fff;font:600 13px/18px Arial;padding:4px 8px;border-radius:4px;position:absolute;z-index:99999;pointer-events:none;max-width:260px;';
        const box = target.getBoundingClientRect();
        label.style.left = Math.max(8, Math.min(innerWidth - 268, box.left)) + scrollX + 'px';
        label.style.top = Math.max(8, box.top - 28) + scrollY + 'px';
        document.body.appendChild(label);
      }
      return true;
    }`,
  );
  const output = cli("screenshot");
  const generatedPath = output.match(/\(([^)]+\.png)\)/)?.[1] || output.trim();
  assert(generatedPath.endsWith(".png"), `Unable to read screenshot path.\n${output}`);
  copyFileSync(path.resolve(generatedPath), targetPathname);
};

try {
  if (viewportWidth !== loginViewportWidth) cli("resize", String(viewportWidth), String(viewportHeight));
  cli("localstorage-set", "language", openPendingModification ? "en" : language);
  cli("reload");
  waitForLayout();

  if (openPendingModification) {
    openRealPendingModification();
    if (language !== "en") {
      cli("localstorage-set", "language", language);
      cli("reload");
    }
  } else closeLoginAsModal();

  waitForLayout();
  if (openPendingModification) waitForMediaLicense();
  if (viewportWidth <= 1024) verifyMobileDrawer();
  verifyHistoricalMenuHover();
  const state = getState();
  const bottomState = getBottomState();
  const expectedOuterPadding = viewportWidth <= 768 ? 24 : 40;
  const expectedContentPadding =
    viewportWidth >= 1920
      ? (viewportWidth - 1680) / 2
      : viewportWidth >= 1281
        ? 64
        : viewportWidth >= 1024
          ? 40
          : 0;
  const expectedMediaGeometry = new Map([
    [1280, { content: 1200, main: 804, sidebar: 380, gap: 16 }],
    [1281, { content: 1153, main: 757, sidebar: 380, gap: 16 }],
    [1440, { content: 1312, main: 916, sidebar: 380, gap: 16 }],
    [1680, { content: 1552, main: 1156, sidebar: 380, gap: 16 }],
    [1919, { content: 1791, main: 1395, sidebar: 380, gap: 16 }],
    [1920, { content: 1680, main: 1164, sidebar: 500, gap: 16 }],
  ]).get(viewportWidth);

  if (capture) {
    captureRegion("header");
    captureRegion("footer");
  }
  if (telemetry) {
    const suffix = `${viewportWidth}x${viewportHeight}-${language}`;
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(outputDir, `${suffix}-console.txt`), cli("console", "warning"));
    writeFileSync(path.join(outputDir, `${suffix}-network.txt`), cli("requests"));
  }

  assert.equal(state.lang, language, "The requested language must be active.");
  assert.equal(state.dir, language === "ar" ? "rtl" : "ltr", "Document direction must match the language.");
  assert.equal(state.viewportWidth, viewportWidth, "Viewport width must match the requested width.");
  assert(state.documentFitsViewport, "The page must not overflow horizontally.");
  assert.equal(state.headerPaddingLeft, expectedOuterPadding, "Header left padding is incorrect.");
  assert.equal(state.headerPaddingRight, expectedOuterPadding, "Header right padding is incorrect.");
  assert.equal(state.footerPaddingLeft, expectedOuterPadding, "Footer left padding is incorrect.");
  assert.equal(state.footerPaddingRight, expectedOuterPadding, "Footer right padding is incorrect.");
  assert(!state.footerChildrenOverlap, "Footer sections must not overlap after localization wraps.");
  assert(!state.footerHasClippedContent, "Footer sections must expand instead of clipping localized content.");
  assert.equal(state.footerDirection, viewportWidth <= 1439 ? "column-reverse" : "row", "Footer layout mode is incorrect.");
  if (viewportWidth >= 769 && viewportWidth <= 1439) {
    assert(state.footerHeight >= 172, "Tablet and compact desktop footer must preserve the 172px design height.");
  } else if (viewportWidth <= 768) {
    assert(state.footerHeight >= 204, "Mobile footer must preserve the 204px design height and expand for wrapped localization.");
  }
  assert.equal(state.contentPaddingLeft, expectedContentPadding, "Content left padding is incorrect.");
  assert.equal(state.contentPaddingRight, expectedContentPadding, "Content right padding is incorrect.");
  assert.equal(state.menuVisible, viewportWidth > 1024, "Main menu breakpoint is incorrect.");
  assert.equal(state.actionGap, 24, "Header action spacing must be 24px.");
  if (viewportWidth > 1024) {
    assert.equal(state.menuGap, viewportWidth <= 1440 ? 16 : 36, "Historical menu spacing breakpoint is incorrect.");
    assert.equal(state.inactiveMenuItemWidth, 47, "Historical inactive menu items must be 47px wide.");
    if (viewportWidth <= 1440) {
      assert.equal(state.activeMenuItemWidth, 47, "Historical compact active item must be 47px wide.");
    } else {
      assert(state.activeMenuItemWidth > 47, "Historical desktop active item must expand to reveal its label.");
    }
  }
  if (viewportWidth < 1680) {
    assert.equal(state.searchActionWidth, 26, "Compact search action must be 26px wide.");
    assert.equal(state.notificationActionWidth, 26, "Compact notification action must be 26px wide.");
    assert.equal(state.userMenuActionWidth, 26, "Compact user menu action must be 26px wide.");
  }
  assert.equal(state.logoIsCompact, viewportWidth < 1680, "Logo breakpoint is incorrect.");
  if (viewportWidth <= 768) {
    const expectedMobileLogoHeight = viewportWidth <= 376 ? 30 : 36;
    assert.equal(state.logoHeight, expectedMobileLogoHeight, "Mobile logo container height is incorrect.");
    assert.equal(state.logoSvgHeight, expectedMobileLogoHeight, "Mobile logo SVG must fit its container height.");
    assert(
      Math.abs(state.logoSvgWidth - expectedMobileLogoHeight * (48 / 68)) < 1,
      "Mobile logo SVG must preserve its intrinsic aspect ratio.",
    );
  }
  assert.equal(state.profileNameVisible, viewportWidth >= 1680, "Profile name breakpoint is incorrect.");
  assert.equal(state.profileCaretVisible, viewportWidth > 1024, "Profile caret breakpoint is incorrect.");
  assert.equal(state.activeMenuLabelVisible, viewportWidth > 1440, "Historical active menu label breakpoint is incorrect.");
  if (viewportWidth <= 1024) assert.equal(state.visibleActionCount, 4, "All four actions must be visible at pad/mobile widths.");
  if (viewportWidth === 1280) assert.equal(state.visibleActionCount, 4, "The 1280px design must keep all four header actions visible.");
  assert(state.userMenuActionVisible, "User menu action must always remain visible.");
  assert(state.identityActionVisible, "Identity action must always remain visible.");
  if (!state.notificationActionVisible) assert(!state.searchActionVisible, "Search must hide before notifications.");
  assert(!state.menuActionsOverlap, "Menu and actions must not overlap.");
  if (state.menuActionsClearance !== null) {
    assert(state.menuActionsClearance >= 24, "Menu and actions must preserve the 24px collision clearance.");
  }
  assert(!state.logoMenuOverlap, "Logo and menu must not overlap.");
  assert(bottomState.footerFullyVisible, "Footer must be fully visible at the bottom of the page.");
  assert(bottomState.actionFooterAboveFooter, "Action footer must stop above the global footer instead of covering it.");

  if (state.sidebarWidth !== null) {
    assert.deepEqual(
      bottomState.sidebarSixteenPixelTexts,
      [],
      "Services sidebar text that was 16px must be 14px at every viewport size.",
    );
    if (viewportWidth >= 1920) assert(Math.abs(state.sidebarWidth - 500) < 1, "Services sidebar must be 500px at 1920px and above.");
    else if (viewportWidth >= 1024) assert(Math.abs(state.sidebarWidth - 380) < 1, "Services sidebar must be 380px from 1024px to 1919px.");
    else {
      assert.equal(state.mediaDirection, "column", "Services columns must stack below 1024px.");
      assert(state.sidebarBeforeMain, "Services sidebar must be stacked before the main form.");
      assert(Math.abs(state.sidebarWidth - state.mediaContentWidth) < 1, "Stacked Services sidebar must fill the content width.");
    }
    if (viewportWidth >= 1024) {
      assert(Math.abs(state.mediaColumnGap - 16) < 1, "Services columns must preserve the 16px design gap.");
      assert(
        Math.abs(state.mediaMainWidth + state.sidebarWidth + state.mediaColumnGap - state.mediaContentWidth) < 1,
        "The fluid Services main column must fill the space left by the fixed sidebar and design gap.",
      );
    }
    if (expectedMediaGeometry) {
      assert(Math.abs(state.mediaContentWidth - expectedMediaGeometry.content) < 1, "Services content width is incorrect at a boundary viewport.");
      assert(Math.abs(state.mediaMainWidth - expectedMediaGeometry.main) < 1, "Services main width is incorrect at a boundary viewport.");
      assert(Math.abs(state.sidebarWidth - expectedMediaGeometry.sidebar) < 1, "Services sidebar width is incorrect at a boundary viewport.");
      assert(Math.abs(state.mediaColumnGap - expectedMediaGeometry.gap) < 1, "Services column gap is incorrect at a boundary viewport.");
    }
  }

  if (viewportWidth <= 768 && state.mobileContentPaddingLeft !== null) {
    assert.equal(state.mobileContentPaddingLeft, 16, "Mobile page content left padding must be 16px.");
    assert.equal(state.mobileContentPaddingRight, 16, "Mobile page content right padding must be 16px.");
  }

  if (verifyResizeSequence) {
    assert(viewportWidth >= 1280, "Resize sequence must start at 1280px or wider.");
    const initialVisibleActionCount = getState().visibleActionCount;
    const searchOpened = evaluateJson(`() => {
      const search = document.querySelector('.header:not(.GlobalSearch) .header__action--search');
      search?.click();
      return { clicked: Boolean(search) };
    }`);
    assert(searchOpened.clicked, "Search action must be available before testing header remount.");
    cli("resize", "1100", String(viewportHeight));
    const searchTimeoutAt = Date.now() + 5_000;
    let searchClosed = false;
    while (Date.now() < searchTimeoutAt) {
      searchClosed = evaluateJson(`() => {
        const cancel = document.querySelector('.header.GlobalSearch .Headercancel');
        cancel?.click();
        return Boolean(cancel);
      }`);
      if (searchClosed) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
    assert(searchClosed, "Global search cancel action must become available.");
    waitForLayout();
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    const remountedHeader = getState();
    assert(!remountedHeader.menuActionsOverlap, "Header must remeasure collisions after closing global search.");
    assert(remountedHeader.menuActionsClearance >= 24, "Header remount must restore the 24px collision clearance.");
    assert(remountedHeader.userMenuActionVisible && remountedHeader.identityActionVisible, "Protected actions must survive header remount.");
    cli("resize", String(viewportWidth), String(viewportHeight));
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);

    const sequence = [];
    for (let width = viewportWidth; width >= 1025; width -= 10) {
      cli("resize", String(width), String(viewportHeight));
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 80);
      const current = getState();
      sequence.push({
        width,
        count: current.visibleActionCount,
        search: current.searchActionVisible,
        notification: current.notificationActionVisible,
        userMenu: current.userMenuActionVisible,
        identity: current.identityActionVisible,
        overlap: current.menuActionsOverlap,
      });
    }
    const transitionCounts = sequence
      .filter((item, index) => index === 0 || item.count !== sequence[index - 1].count)
      .map((item) => item.count);
    for (let index = 1; index < transitionCounts.length; index += 1) {
      assert(transitionCounts[index] < transitionCounts[index - 1], "Visible actions must decrease monotonically as the viewport narrows.");
      assert.equal(transitionCounts[index - 1] - transitionCounts[index], 1, "Collision handling must hide one action at a time.");
    }
    for (const item of sequence) {
      assert(item.userMenu && item.identity, `Protected actions must remain visible at ${item.width}px.`);
      assert(!item.overlap, `Menu and actions must not overlap at ${item.width}px.`);
      if (!item.notification) assert(!item.search, `Search must hide before notifications at ${item.width}px.`);
    }
    cli("resize", String(viewportWidth), String(viewportHeight));
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    assert.equal(getState().visibleActionCount, initialVisibleActionCount, "Expanding the viewport must restore the initial collision state.");
    console.log(JSON.stringify({ resizeSequence: sequence.filter((item, index) => index === 0 || item.count !== sequence[index - 1].count) }));
  }

  console.log(JSON.stringify({ status: "PASS", width: viewportWidth, language, state }, null, 2));
} finally {
  try {
    cli("close");
  } catch (error) {
    console.error(`Failed to close Playwright session ${session}:`, error.message);
  }
}
