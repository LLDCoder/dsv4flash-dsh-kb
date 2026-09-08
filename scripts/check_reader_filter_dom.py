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
        await page.set_content('''
          <div class="filter-controls"><input placeholder="Search"><button>Reset</button></div>
          <button>Apply</button>
          <table><thead>
            <tr><th rowspan="2">Reference</th><th colspan="2">Distribution</th><th rowspan="2">Actions</th></tr>
            <tr><th>North</th><th>South</th></tr>
          </thead><tbody><tr><td>R-1</td><td>40%</td><td>60%</td><td>Delete</td></tr></tbody></table>
        ''')
        surface = await app._observe_filter_surface(page, 20)
        assert surface['filterControls'][0]['commands'] == ['Reset']
        grouped = await app._observe_semantics(page, 20)
        assert grouped['sectionSummaries'][0]['rowFields'] == [
            {'Reference': 'R-1', 'Distribution / North': '40%', 'Distribution / South': '60%'}]
        assert 'Delete' not in str(grouped['sectionSummaries'][0])
        await page.set_content('''
          <div role="tablist"><button role="tab" id="parent" aria-selected="true" aria-controls="parent-panel">Team Tasks</button></div>
          <div role="tabpanel" id="parent-panel" aria-labelledby="parent">
            <div role="tablist">
              <button role="tab" aria-selected="false">To Do</button>
              <button role="tab" id="leaf" aria-selected="true" aria-controls="leaf-panel">Completed</button>
            </div>
            <div role="tabpanel" id="leaf-panel" aria-labelledby="leaf">
              <table><thead><tr><th>Reference</th><th>Status</th></tr></thead>
              <tbody><tr><td>R-2</td><td>Cancelled</td></tr></tbody></table>
            </div>
          </div>
        ''')
        nested = await app._observe_semantics(page, 20)
        table = next(section for section in nested['sectionSummaries'] if section['kind'] == 'table')
        assert table['selectedState'] == 'Completed'
        assert table['selectedTabPath'] == ['Team Tasks', 'Completed']
        assert table['rowFields'][0]['Status'] == 'Cancelled'
        await page.locator('#leaf').evaluate("element => element.setAttribute('aria-controls', 'unrelated')")
        unbound = await app._observe_semantics(page, 20)
        table = next(section for section in unbound['sectionSummaries'] if section['kind'] == 'table')
        assert table.get('selectedState') != 'Completed'
        await page.set_content('''
          <table><thead><tr><th>Reference</th><th>Status</th><th>Actions</th><th>Secret</th></tr></thead>
            <tbody><tr><td>R-0</td><td>S-0</td><td>Delete</td><td>hidden-value</td></tr></tbody>
          </table>
        ''')
        await page.evaluate("""() => {
            let counter = 0;
            window.readerTick = setInterval(() => {
                counter++;
                document.querySelector('tbody').innerHTML = '<tr><td>R-' + counter +
                    '</td><td>S-' + counter + '</td><td>Delete</td><td>hidden-value</td></tr>';
            }, 1);
        }""")
        for _ in range(6):
            snapshot = await page.locator('table').evaluate(app.READER_TABLE_SNAPSHOT_SCRIPT)
            parsed = app._reader_table_snapshot_values(snapshot, 4)
            values = parsed[2][0]
            assert values['Reference'][2:] == values['Status'][2:]
            assert set(values) == {'Reference', 'Status'}
            assert 'hidden-value' not in str(parsed) and 'Delete' not in str(parsed)
        changing = await app._observe_semantics(page, 20)
        if not changing['sectionSummaries']:
            assert changing['readHealth']['healthy'] is False
            assert changing['readHealth']['pending'] == ['table_updated_during_observation']
        await page.evaluate('clearInterval(window.readerTick)')
        stable = await app._observe_semantics(page, 20)
        table = next(section for section in stable['sectionSummaries'] if section['kind'] == 'table')
        assert table['rowFields'][0]['Reference'][2:] == table['rowFields'][0]['Status'][2:]
        await browser.close()
        print("PASS: metrics, hidden exclusions, combobox readback, bound commands, grouped headers, nested tabs, atomic changing rows")


if __name__ == "__main__":
    asyncio.run(main())
