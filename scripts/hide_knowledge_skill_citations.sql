-- Hide citations in customer-facing knowledge answers while preserving the
-- retrieved evidence and audit events stored by the DSH runtime.
BEGIN;

UPDATE skill
SET
  content = regexp_replace(
    regexp_replace(
      regexp_replace(content, 'cite the retrieved source,?[[:space:]]*', '', 'gi'),
      'cite the source,?[[:space:]]*', '', 'gi'
    ),
    'identify the source and date,?[[:space:]]*', '', 'gi'
  ) || CASE
    WHEN position(
      'Do not display sources, references, citations, source/reference sections, retrieved-document links, or locators in the customer-facing answer.'
      IN content
    ) = 0
      THEN E'\n\nCUSTOMER-FACING EVIDENCE POLICY: Use retrieved knowledge only as internal evidence. Do not display sources, references, citations, source/reference sections, retrieved-document links, or locators in the customer-facing answer.'
    ELSE ''
  END,
  updated_by = 'codex',
  updated_at = NOW()
WHERE
  scope = 'system'
  AND status = 'PUBLISHED'
  AND enabled = TRUE
  AND allowed_tools ? 'knowledge.search';

COMMIT;
