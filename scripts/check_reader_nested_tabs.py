"""Offline browser regression: nested sibling tab bars and source isolation."""
import asyncio
import app
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        page=await browser.new_page()
        tabs=lambda name: f'<div role="tablist"><button role="tab" aria-selected="true">{name}</button></div>'
        table='<table><thead><tr><th>Reference</th></tr></thead><tbody><tr><td>REF-100</td></tr></tbody></table>'
        await page.set_content('<section>'+tabs('Team Work')+'<div>'+tabs('To Do')+table+'</div></section>')
        state=await page.locator('table').evaluate(app.READER_TABLE_TAB_PATH_SCRIPT)
        assert state==['To Do','Team Work'],state
        obs=await app._observe_semantics(page,20)
        assert obs['sectionSummaries'][0]['selectedTabPath']==['Team Work','To Do'],obs
        await page.set_content('<section>'+tabs('Unrelated chart')+tabs('Other chart')+'<div>'+tabs('Team Performance')+table+'</div></section>')
        assert await page.locator('table').evaluate(app.READER_TABLE_TAB_PATH_SCRIPT)==['Team Performance']
        await page.set_content('<section>'+tabs('Team Work')+table+table+'</section>')
        assert await page.locator('table').first.evaluate(app.READER_TABLE_TAB_PATH_SCRIPT)==[]
        await page.set_content('<section><div role="tablist"><button role="tab" aria-selected="true">A</button><button role="tab" aria-selected="true">B</button></div>'+table+'</section>')
        assert await page.locator('table').evaluate(app.READER_TABLE_TAB_PATH_SCRIPT)==[]
        await browser.close()
    print('Nested tab/view isolation: 4 browser scenarios passed')

asyncio.run(main())
