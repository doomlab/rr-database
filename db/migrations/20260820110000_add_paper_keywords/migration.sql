-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
