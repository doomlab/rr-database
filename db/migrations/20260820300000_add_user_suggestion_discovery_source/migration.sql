-- Lets a paper created from an admin-approved article suggestion be tagged
-- with its real provenance instead of leaving discoveredVia empty.
ALTER TYPE "DiscoverySource" ADD VALUE 'USER_SUGGESTION';
