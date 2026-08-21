-- Let the general metadata edit/verify flow also cover JMIR badge fields,
-- not just the dedicated JmirBadgeButton flow.
ALTER TABLE "MetadataEditSuggestion" ADD COLUMN "jmirBadgeType" TEXT;
ALTER TABLE "MetadataEditSuggestion" ADD COLUMN "jmirBadgeCounterpartDoi" TEXT;
