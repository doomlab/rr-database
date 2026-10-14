-- Lifecycle Journal (Center for Open Science) discovery: provenance and run-step enum values.
ALTER TYPE "DiscoverySource" ADD VALUE 'LIFECYCLE_JOURNAL';
ALTER TYPE "PipelineStep" ADD VALUE 'QUERY_LIFECYCLE';
