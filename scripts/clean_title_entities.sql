-- Decodes the HTML entities that came in with some titles ("Report:&nbsp;
-- Rationale", "R&amp;D") and tidies the whitespace. New imports are cleaned
-- as they arrive; this fixes the ones already stored. Only touches titles that
-- contain an entity.
BEGIN;

SELECT id, left(title, 90) AS before FROM "Paper" WHERE title ~ '&(nbsp|amp|lt|gt|quot|apos|#[0-9]+);';

UPDATE "Paper"
SET title = btrim(regexp_replace(
  replace(replace(replace(replace(replace(replace(title,
    '&nbsp;', ' '), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&apos;', ''''), '&amp;', '&'),
  '\s+', ' ', 'g'))
WHERE title ~ '&(nbsp|amp|lt|gt|quot|apos);';

COMMIT;
