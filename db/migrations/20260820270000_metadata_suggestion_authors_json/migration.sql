-- Switch MetadataEditSuggestion.authors from a plain name list to
-- {id, name}[] JSON so an author-name edit can be matched back to the
-- existing Author row by id (preserving its ORCID/OpenAlex link) instead
-- of always re-upserting by name, which orphans that data on a rename.
ALTER TABLE "MetadataEditSuggestion" DROP COLUMN "authors";
ALTER TABLE "MetadataEditSuggestion" ADD COLUMN "authors" JSONB NOT NULL DEFAULT '[]';
