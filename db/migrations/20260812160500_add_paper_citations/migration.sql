-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "citationsFetchedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaperCitation" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "citingPaperId" INTEGER NOT NULL,
    "citedOpenAlexId" TEXT NOT NULL,
    "title" TEXT,
    "authors" TEXT[],
    "year" INTEGER,
    "journal" TEXT,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaperCitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaperCitation_citingPaperId_citedOpenAlexId_key" ON "PaperCitation"("citingPaperId", "citedOpenAlexId");

-- AddForeignKey
ALTER TABLE "PaperCitation" ADD CONSTRAINT "PaperCitation_citingPaperId_fkey" FOREIGN KEY ("citingPaperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

