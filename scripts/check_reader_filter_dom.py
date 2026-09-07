"""Run inside the Admin platform-gateway image; no Portal or database access."""

import asyncio

import app
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True, args=["--no-sandbox"])
        page = await browser.new_page()
        await page.set_content('''
            <div><div>13</div><div>Awaiting Documents</div></div>
            <div><div>0</div><div>Completed</div></div>
            <div hidden><div>99</div><div>Hidden status</div></div>
            <div class="ant-select filters-select">
              <span class="ant-select-selection-placeholder">All Statuses</span>
              <input role="combobox" readonly aria-controls="choices"
                onkeydown="if(event.key==='Escape')document.getElementById('popup').hidden=true"
                onclick="document.getElementById('popup').hidden=false">
            </div>
            <div id="popup" class="ant-select-dropdown" hidden>
              <div id="choices" role="listbox"></div>
              <div class="ant-select-item-option" onclick="
                document.querySelector('.ant-select-selection-placeholder').outerHTML=
                  '<span class=ant-select-selection-item>Awaiting Documents</span>';
                document.getElementById('popup').hidden=true">Awaiting Documents</div>
            </div>
            <button onclick="document.querySelector('#rows').textContent='Matching records'">Filter</button>
            <div id="rows">Default records</div>
        ''')
        observed = await app._observe_filter_surface(page, 20)
        assert observed["metrics"] == [
            {"label": "Awaiting Documents", "value": "13"},
            {"label": "Completed", "value": "0"},
        ], observed
        control = observed["filterControls"][0]
        assert control["options"] == ["Awaiting Documents"]
        assert control["selected"] == []
        assert not await page.locator("#popup").is_visible()
        action = app.PortalReadAction(type="filter", selector=control["selector"], value="Awaiting Documents")
        app._validate_reader_request(app.AdminPortalReadRequest(startPath="/records", actions=[action]))
        await app._set_filter_value(page, action)
        await app._safe_click(page, app.PortalReadAction(type="apply_filter", role="button", name="Filter"))
        assert await page.locator("#rows").inner_text() == "Matching records"
        assert (await app._observe_filter_surface(page, 20))["filterControls"][0]["selected"] == ["Awaiting Documents"]
        await browser.close()
        print("PASS: paired metrics, hidden exclusions, virtual input combobox, selection readback, inline Filter")


if __name__ == "__main__":
    asyncio.run(main())
