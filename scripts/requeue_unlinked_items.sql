-- One-off cleanup: items that are public (IMPORTED / APPROVED) but belong to no
-- study were unlinked before "unlink" started sending items back to review.
-- They don't show on the public browse list (it's built from studies) and
-- nothing flags them. This puts each one back in PENDING_REVIEW inside a solo
-- study of its own, clears its workflow marker, and logs it in its history,
-- the same as the Unlink option does now.
--
-- Run STEP 1 first and read the list. Then run STEP 2.
-- Back up first if you like:  docker compose exec db pg_dump -U <USER> <DB> > backup.sql

-- ---------------------------------------------------------------------------
-- STEP 1: look (read-only)
-- ---------------------------------------------------------------------------
SELECT p.id, p.status, p.year, left(p.title, 90) AS title
FROM "Paper" p
WHERE p."canonicalPaperId" IS NULL
  AND p.status IN ('IMPORTED', 'APPROVED')
  AND NOT EXISTS (SELECT 1 FROM "StudyPaper" sp WHERE sp."paperId" = p.id)
ORDER BY p.id;

-- ---------------------------------------------------------------------------
-- STEP 2: apply (one transaction; change COMMIT to ROLLBACK to rehearse)
-- ---------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
  r RECORD;
  new_study INT;
  admin_id INT;
BEGIN
  -- History rows need a user; use the first super admin.
  SELECT id INTO admin_id FROM "User" WHERE role = 'SUPER_ADMIN' ORDER BY id LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No SUPER_ADMIN user found to attribute the history entries to';
  END IF;

  FOR r IN
    SELECT p.id
    FROM "Paper" p
    WHERE p."canonicalPaperId" IS NULL
      AND p.status IN ('IMPORTED', 'APPROVED')
      AND NOT EXISTS (SELECT 1 FROM "StudyPaper" sp WHERE sp."paperId" = p.id)
  LOOP
    INSERT INTO "Study" ("updatedAt") VALUES (now()) RETURNING id INTO new_study;
    INSERT INTO "StudyPaper" ("studyId", "paperId", role) VALUES (new_study, r.id, 'OTHER');
    UPDATE "Paper"
      SET status = 'PENDING_REVIEW',
          "reviewedById" = NULL, "reviewedAt" = NULL,
          "workflowMarker" = NULL, "workflowMarkedById" = NULL, "workflowMarkedAt" = NULL,
          "updatedAt" = now()
      WHERE id = r.id;
    INSERT INTO "PaperEditHistory" ("paperId", "userId", source, summary)
      VALUES (r.id, admin_id, 'link', 'Unlinked from study and sent back to pending review (cleanup)');
  END LOOP;
END $$;

COMMIT;
