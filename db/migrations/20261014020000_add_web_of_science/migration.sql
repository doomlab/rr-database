-- Web of Science Starter API discovery: a per-user key (not pooled, since the
-- free tier is capped per key), plus the provenance/run-step enum values.
ALTER TABLE "User" ADD COLUMN "wosApiKey" TEXT;
ALTER TYPE "DiscoverySource" ADD VALUE 'WEB_OF_SCIENCE';
ALTER TYPE "PipelineStep" ADD VALUE 'QUERY_WOS';
