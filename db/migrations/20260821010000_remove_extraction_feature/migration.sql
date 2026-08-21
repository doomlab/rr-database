-- Removes the never-built "coded data" / extraction feature: nothing in the
-- app ever created a PaperExtraction record or an ExtractionEditSuggestion,
-- so both tables (and their admin UI) were permanently dead.
DROP TABLE IF EXISTS "ExtractionEditSuggestion" CASCADE;
DROP TABLE IF EXISTS "PaperExtraction" CASCADE;
