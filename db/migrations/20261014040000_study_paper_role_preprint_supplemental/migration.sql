-- Adds PREPRINT, and collapses STAGE1_MATERIALS / STAGE2_MATERIALS into one
-- stage-agnostic SUPPLEMENTAL role. Existing rows with either old value become
-- SUPPLEMENTAL (the Stage 1 vs Stage 2 distinction on materials is dropped).
-- The type is rebuilt rather than altered because Postgres can't remove enum
-- values, and a newly added value can't be used in the same transaction.
BEGIN;
CREATE TYPE "StudyPaperRole_new" AS ENUM ('STAGE1_ARTICLE', 'STAGE2_ARTICLE', 'PREPRINT', 'SUPPLEMENTAL', 'PCIRR_PAGE', 'PCIRR_REVIEW', 'PCIRR_AUTHOR_RESPONSE', 'PCIRR_DECISION', 'OTHER');
ALTER TABLE "StudyPaper" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "StudyPaper" ALTER COLUMN "role" TYPE "StudyPaperRole_new" USING (
  CASE "role"::text
    WHEN 'STAGE1_MATERIALS' THEN 'SUPPLEMENTAL'
    WHEN 'STAGE2_MATERIALS' THEN 'SUPPLEMENTAL'
    ELSE "role"::text
  END::"StudyPaperRole_new"
);
ALTER TYPE "StudyPaperRole" RENAME TO "StudyPaperRole_old";
ALTER TYPE "StudyPaperRole_new" RENAME TO "StudyPaperRole";
DROP TYPE "StudyPaperRole_old";
ALTER TABLE "StudyPaper" ALTER COLUMN "role" SET DEFAULT 'OTHER';
COMMIT;
