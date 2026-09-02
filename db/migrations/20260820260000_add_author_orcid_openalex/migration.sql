-- Capture ORCID/OpenAlex author identifiers when we already have them from
-- OpenAlex authorship data, so the UI can show ORCID/OpenAlex badges next
-- to author names (mirrors wordnorms-dev's authorMeta, but as real columns
-- since Author is already a normalized table here).
ALTER TABLE "Author" ADD COLUMN "orcid" TEXT;
ALTER TABLE "Author" ADD COLUMN "openalexAuthorId" TEXT;
CREATE UNIQUE INDEX "Author_openalexAuthorId_key" ON "Author"("openalexAuthorId");
