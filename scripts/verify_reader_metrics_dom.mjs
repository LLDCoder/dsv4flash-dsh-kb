import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source=await readFile(new URL('../platform-gateway/app.py',import.meta.url),'utf8');
const script=source.match(/READER_LABELED_METRICS_SCRIPT = """([\s\S]+?)"""/)[1].replaceAll('\\\\','\\');
const evaluateMetrics=new Function(`return (${script});`)();
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
const metric=(value,label,extra='')=>`<div class="record-statistics-item"><span>${value}</span><span>${label}</span>${extra}</div>`;
for(const [name,html,expected] of [
  ['native numeric then label',metric('40','Total'),[{heading:'',summaries:['Total 40']}]],
  ['native label then numeric',metric('Total','40'),[{heading:'',summaries:['Total 40']}]],
  ['zero',metric('0','Total'),[{heading:'',summaries:['Total 0']}]],
  ['comma number',metric('1,234','Total'),[{heading:'',summaries:['Total 1,234']}]],
  ['percentage',metric('87.5%','Approval Rate'),[{heading:'',summaries:['Approval Rate 87.5%']}]],
  ['no numeric',metric('Unknown','Total'),[]],
  ['two numbers',metric('40','17'),[]],
  ['extra text is ambiguous',metric('40','Total','<span>Archived</span>'),[]],
  ['hidden value',metric('<span hidden>40</span>','Total'),[]],
  ['hidden collection',`<div hidden>${metric('40','Total')}</div>`,[]],
  ['busy collection',`<div aria-busy="true">${metric('40','Total')}</div>`,[]],
  ['skeleton',metric('40','Total','<span class="skeleton"></span>'),[]],
  ['click action excluded',metric('40','Total','<button>Delete</button>'),[]],
  ['table values cannot be metrics',`<table><tr><td>${metric('40','Total')}</td></tr></table>`,[]],
  ['scoped independent values',`<section aria-label="Category"><div>${metric('40','Total')}${metric('17','Approved')}</div></section>`,[{heading:'Category',summaries:['Total 40','Approved 17']}]],
])test(name,async()=>{await page.setContent(html);assert.deepEqual(await page.evaluate(evaluateMetrics),expected);});
test.after(async()=>{await browser.close();});
