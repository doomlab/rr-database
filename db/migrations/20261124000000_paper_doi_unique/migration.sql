-- One paper per DOI. Fails if two papers already share a DOI: find them first with
--   SELECT lower(doi), array_agg(id) FROM "Paper" WHERE doi IS NOT NULL
--   GROUP BY 1 HAVING count(*) > 1;
-- and link/merge them (mark the extra one DUPLICATE and clear its DOI) before deploying.

-- DropIndex
DROP INDEX "Paper_doi_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Paper_doi_key" ON "Paper"("doi");
