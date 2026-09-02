-- Let a metadata edit suggestion carry a proposed author list (comma-list of
-- names, in order) — misspelled/garbled author names imported from Zotero
-- are common enough that regular users need a way to flag them too, not
-- just admins editing directly.
ALTER TABLE "MetadataEditSuggestion"
  ADD COLUMN "authors" TEXT[] NOT NULL DEFAULT '{}';
