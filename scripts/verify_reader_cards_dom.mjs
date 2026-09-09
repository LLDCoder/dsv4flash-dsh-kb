import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = await readFile(new URL('../platform-gateway/app.py', import.meta.url), 'utf8');
const script = source.match(/READER_CARD_COLLECTION_SCRIPT = """([\s\S]+?)"""/)[1].replaceAll('\\\\', '\\');
const evaluateCards = new Function(`return (${script});`)();
const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
const card = (name, extra='') => `<div class="person-card"><h3>${name}</h3><div><span>Completed</span><strong>7</strong></div>${extra}</div>`;

for (const [name, html, expected] of [
  ['one card', card('Person A'), [{heading:'',cardSummaries:['Person A | Completed | 7']}]],
  ['scoped cards', `<section aria-label="Members"><div>${card('Person A')}${card('Person B')}</div></section>`,
    [{heading:'Members',cardSummaries:['Person A | Completed | 7','Person B | Completed | 7']}]],
  ['no heading is not a record', '<div class="other-card">random text</div>', []],
  ['hidden card', `<div hidden>${card('Person A')}</div>`, []],
  ['aria-hidden card', `<div aria-hidden="true">${card('Person A')}</div>`, []],
  ['busy collection', `<section aria-busy="true">${card('Person A')}</section>`, []],
  ['skeleton', card('Person A','<div class="skeleton">loading</div>'), []],
  ['loading spinner', card('Person A','<div class="ant-spin-spinning">loading</div>'), []],
  ['stat card excluded', '<div class="stat-card"><h3>Total</h3>70</div>', []],
  ['table wrapper excluded', card('Person A','<table><tr><td>Not a card</td></tr></table>'), []],
  ['nested card frame', `<div class="frame-card">${card('Person A')}</div>`, [{heading:'',cardSummaries:['Person A | Completed | 7']}]],
  ['ignore action and contact text', card('Person A','<button>Assign 9</button><a href="mailto:private@example.com">private@example.com</a><span class="phone">+971123456789</span><div hidden>Hidden secret</div><span>other@example.com</span>'), [{heading:'',cardSummaries:['Person A | Completed | 7']}]],
  ['hidden inner field', card('Person A','<div style="visibility:hidden">Secret</div>'), [{heading:'',cardSummaries:['Person A | Completed | 7']}]],
]) {
  test(name, async()=>{
    await page.setContent(html);
    assert.deepEqual(await page.evaluate(evaluateCards),expected);
  });
}
test('bounded cards and text',async()=>{
  await page.setContent('<div>'+Array.from({length:20},(_,i)=>card('Person '+i,'<span>'+ 'x'.repeat(1000)+'</span>')).join('')+'</div>');
  const result = await page.evaluate(evaluateCards);
  assert.equal(result.length,1);
  assert.equal(result[0].cardSummaries.length,4);
  assert.ok(result[0].cardSummaries.every(x=>x.length<=300));
});
test.after(async()=>{await browser.close();});
