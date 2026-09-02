-- PCI Registered Reports publishes the recommendation, plus separate
-- review/author-response/decision documents distinguished by DOI suffix
-- (.rev<n>, .ar<n>, .d<n>). Each needs its own role so they can be linked
-- into the study alongside the recommendation instead of collapsing into
-- "Other".
ALTER TYPE "StudyPaperRole" ADD VALUE 'PCIRR_REVIEW';
ALTER TYPE "StudyPaperRole" ADD VALUE 'PCIRR_AUTHOR_RESPONSE';
ALTER TYPE "StudyPaperRole" ADD VALUE 'PCIRR_DECISION';
