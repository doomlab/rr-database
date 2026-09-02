-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
