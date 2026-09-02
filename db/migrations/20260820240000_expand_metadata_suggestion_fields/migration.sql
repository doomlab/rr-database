-- Expand MetadataEditSuggestion to cover the same fields the paper detail
-- page's "Suggest edit" / admin direct-edit form now exposes.
ALTER TABLE "MetadataEditSuggestion"
  ADD COLUMN "issn" TEXT,
  ADD COLUMN "language" TEXT,
  ADD COLUMN "itemType" TEXT,
  ADD COLUMN "pdfUrl" TEXT,
  ADD COLUMN "openAccess" BOOLEAN,
  ADD COLUMN "openAccessStatus" TEXT,
  ADD COLUMN "citedByCount" INTEGER,
  ADD COLUMN "openalexId" TEXT,
  ADD COLUMN "registrationUrl" TEXT,
  ADD COLUMN "registrationPlatform" TEXT,
  ADD COLUMN "biasLevel" TEXT,
  ADD COLUMN "openDataUrl" TEXT,
  ADD COLUMN "openCodeUrl" TEXT,
  ADD COLUMN "openMaterialsUrl" TEXT,
  ADD COLUMN "zoteroNotes" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT '{}';
