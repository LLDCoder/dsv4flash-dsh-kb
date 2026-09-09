import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const source = await readFile(new URL('../platform-gateway/app.py', import.meta.url), 'utf8');
const script = source.match(/READER_TABLE_PAGINATION_SCRIPT = """([\s\S]+?)"""/)[1].replaceAll('\\\\','\\');
const evaluatePagination = new Function(`return (${script});`)();
const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
const table = '<table><tbody><tr><td>REF-4</td></tr></tbody></table>';
const total = value => `<ul class="ant-pagination"><li class="ant-pagination-total-text"><div>Total ${value}</div><div>1/4</div></li></ul>`;

for(const count of [0,1,2,9,10,11,36,99,100,1001,100000]) {
  test(`unique table pagination total ${count}`, async()=>{
    await page.setContent(`<div class="ant-table-wrapper">${table}${total(count)}</div>`);
    assert.deepEqual(await page.locator('table').evaluate(evaluatePagination), [`Total ${count}`]);
  });
}
for(const [name, html, expected] of [
  ['missing total',`<div class="ant-table-wrapper">${table}</div>`,[]],
  ['hidden total',`<div class="ant-table-wrapper">${table}<div hidden>${total(36)}</div></div>`,[]],
  ['hidden old table',`<div class="ant-table-wrapper"><div hidden>${table}</div>${table}${total(36)}</div>`,['Total 36']],
  ['multiple tables',`<div class="ant-table-wrapper">${table}${table}${total(36)}</div>`,[]],
  ['duplicate total',`<div class="ant-table-wrapper">${table}${total(36)}${total(91)}</div>`,[]],
  ['busy table',`<div class="ant-table-wrapper" aria-busy="true">${table}${total(36)}</div>`,[]],
  ['ancestor busy',`<div aria-busy="true"><div class="ant-table-wrapper">${table}${total(36)}</div></div>`,[]],
  ['spinner',`<div class="ant-table-wrapper">${table}${total(36)}<div class="ant-spin-spinning"></div></div>`,[]],
  ['neighbor total',`<section>${table}</section><section>${total(91)}</section>`,[]],
  ['outside semantic scope',`${table}${total(91)}`,[]],
  ['separate sibling wrapper',`<div class="ant-table-wrapper">${table}${total(36)}</div><div class="ant-table-wrapper">${table}${total(91)}</div>`,['Total 36']],
  ['page fraction only',`<section>${table}<li class="ant-pagination-total-text">1/4</li></section>`,[]],
]) {
  test(name,async()=>{
    await page.setContent(html);
    assert.deepEqual(await page.locator('table:visible').first().evaluate(evaluatePagination),expected);
  });
}
test.after(async()=>{await browser.close();});
