"""Synthetic parser contracts only; not business acceptance evidence."""
import app


def cell(text):
    return {'text': text, 'visible': True, 'colSpan': 1, 'rowSpan': 1}


def test_ten_business_rows_survive_blank_measurement_row_and_exclude_actions():
    rows = [{'text': '', 'cells': [cell(''), cell(''), cell('')]}]
    rows.extend({'text': f'EXAMPLE-{i} Owner Reassign',
                 'cells': [cell(f'EXAMPLE-{i}'), cell('Owner'), cell('Reassign')]}
                for i in range(12))
    snapshot = {'format': 'reader_table_v1', 'tag': 'table',
                'headers': [cell('Task No.'), cell('Assigned To'), cell('Actions')],
                'rows': rows, 'empty': []}
    headers, summaries, fields, empty = app._reader_table_snapshot_values(snapshot, 10)
    assert len(summaries) == len(fields) == 10
    assert fields[-1]['Task No.'] == 'EXAMPLE-9'
    assert headers == ['Task No.', 'Assigned To'] and not empty
    assert all('Actions' not in row for row in fields)


def test_dom_capture_has_bounded_overscan_and_skips_blank_layout_rows():
    script = app.READER_TABLE_SNAPSHOT_SCRIPT
    assert ".filter(row => visible(row) && (row.innerText || '').trim()).slice(0, 20)" in script
    assert app.READER_STRUCTURED_ROW_LIMIT == 10
