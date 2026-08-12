-- CreateEnum
CREATE TYPE "StudyPaperRole" AS ENUM ('STAGE1_ARTICLE', 'STAGE1_MATERIALS', 'STAGE2_ARTICLE', 'STAGE2_MATERIALS', 'OTHER');

-- DropForeignKey
ALTER TABLE "Study" DROP CONSTRAINT "Study_stage1PaperId_fkey";

-- DropForeignKey
ALTER TABLE "Study" DROP CONSTRAINT "Study_stage2PaperId_fkey";

-- DropIndex
DROP INDEX "Study_stage1PaperId_key";

-- DropIndex
DROP INDEX "Study_stage2PaperId_key";

-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "zoteroRelations" JSONB;

-- AlterTable
ALTER TABLE "Study" DROP COLUMN "stage1PaperId",
DROP COLUMN "stage2PaperId";

-- CreateTable
CREATE TABLE "StudyPaper" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studyId" INTEGER NOT NULL,
    "paperId" INTEGER NOT NULL,
    "role" "StudyPaperRole" NOT NULL DEFAULT 'OTHER',

    CONSTRAINT "StudyPaper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyPaper_paperId_key" ON "StudyPaper"("paperId");

-- CreateIndex
CREATE INDEX "StudyPaper_studyId_idx" ON "StudyPaper"("studyId");

-- AddForeignKey
ALTER TABLE "StudyPaper" ADD CONSTRAINT "StudyPaper_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPaper" ADD CONSTRAINT "StudyPaper_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

