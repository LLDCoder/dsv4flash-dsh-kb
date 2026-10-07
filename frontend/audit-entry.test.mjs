import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const directory = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(directory, 'index.html'), 'utf8');
const audit = readFileSync(resolve(directory, 'audit-app.js'), 'utf8');
const boot = html.match(/<script>([\s\S]*?)<\/script>/)[1];

test('only the audit entry selects the audit frontend before rendering', () => {
  for (const pathname of ['/dsh-audit', '/dsh-audit/', '/dsh-audit/conversations']) {
    const classes = [];
    const context = { window: { location: { pathname } }, document: { documentElement: { classList: { add: (name) => classes.push(name) } } } };
    vm.runInNewContext(boot, context);
    assert.equal(context.window.__DSH_AUDIT_MODE__, true);
    assert.equal(context.document.title, 'NMA Audit · Admin Portal');
    assert.deepEqual(classes, ['dsh-audit-boot']);
  }
  for (const pathname of ['/', '/dsh-auditor/', '/other']) {
    const context = { window: { location: { pathname } }, document: {} };
    vm.runInNewContext(boot, context);
    assert.equal(context.window.__DSH_AUDIT_MODE__, undefined);
  }
  assert.ok(html.includes('window.__DSH_AUDIT_MODE__ ? "audit-app.js" : "app.js"'));
});

test('stylesheet and module cache versions change together', () => {
  const css = [...html.matchAll(/href="(?:audit-)?styles\.css\?v=([^"]+)"/g)].map((match) => match[1]);
  const moduleVersion = html.match(/import\(`\.\/\$\{entry\}\?v=([^`]+)`\)/)[1];
  assert.equal(css.length, 2);
  assert.ok(css.every((version) => version === moduleVersion));
});

test('audit login uses the prefixed audit session APIs, never UMC auto-login', () => {
  const baseAndUrl = audit.slice(audit.indexOf('const auditBasePath'), audit.indexOf('function auditAssetUrl'));
  for (const [pathname, expected] of [['/dsh-audit/', '/dsh-audit/api/v1/audit-auth/session'], ['/dsh-audit', '/dsh-audit/api/v1/audit-auth/session'], ['/', '/api/v1/audit-auth/session']]) {
    const context = { window: { location: { pathname } } };
    vm.runInNewContext(baseAndUrl + '\nresult = auditApiUrl("/api/v1/audit-auth/session");', context);
    assert.equal(context.result, expected);
  }
  for (const endpoint of ['login', 'session', 'logout']) assert.ok(audit.includes(`/api/v1/audit-auth/${endpoint}`));
  assert.ok(!audit.includes('/api/v1/umc/session'));
  assert.ok(!audit.includes('loadUmcToken'));
  assert.ok(audit.includes('credentials: "same-origin"'));
});

test('container ships the audit module, styles, and existing branding assets', () => {
  const dockerfile = readFileSync(resolve(directory, 'Dockerfile'), 'utf8');
  for (const file of ['index.html', 'app.js', 'audit-app.js', 'styles.css', 'audit-styles.css', 'favicon.svg']) {
    assert.ok(dockerfile.includes(file));
    assert.ok(existsSync(resolve(directory, file)));
  }
  assert.ok(dockerfile.includes('COPY assets'));
  assert.ok(dockerfile.includes('chmod -R a+rX /usr/share/nginx/html'));
  for (const file of ['assets/login-logo.png', 'assets/login-bg.png', 'assets/logo.svg']) assert.ok(existsSync(resolve(directory, file)));
  const nginx = readFileSync(resolve(directory, 'nginx.conf'), 'utf8');
  assert.ok(nginx.includes('Cache-Control "no-store"'));
  assert.ok(nginx.includes('try_files $uri =404;'));
});
