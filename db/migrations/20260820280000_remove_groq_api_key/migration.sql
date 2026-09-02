-- Groq LLM integration was never built out; drop the unused key column.
ALTER TABLE "User" DROP COLUMN "groqApiKey";
