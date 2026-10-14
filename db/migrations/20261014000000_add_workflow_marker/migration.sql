-- Admin-only progress marker for the one-group-at-a-time workflow. Set on
-- every paper in a group together; null means untouched.
CREATE TYPE "WorkflowMarker" AS ENUM ('DONE', 'LATER', 'QUESTION');

ALTER TABLE "Paper"
  ADD COLUMN "workflowMarker" "WorkflowMarker",
  ADD COLUMN "workflowNote" TEXT,
  ADD COLUMN "workflowMarkedById" INTEGER,
  ADD COLUMN "workflowMarkedAt" TIMESTAMP(3);

ALTER TABLE "Paper"
  ADD CONSTRAINT "Paper_workflowMarkedById_fkey"
  FOREIGN KEY ("workflowMarkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
