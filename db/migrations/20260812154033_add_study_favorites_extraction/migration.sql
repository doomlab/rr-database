-- AlterTable
ALTER TABLE "Paper" DROP COLUMN "stage1ProtocolUrl";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- CreateTable
CREATE TABLE "Study" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "osfLink" TEXT,
    "biasLevel" TEXT,
    "stage1PaperId" INTEGER,
    "stage2PaperId" INTEGER,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyFavorite" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "studyId" INTEGER NOT NULL,

    CONSTRAINT "StudyFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperExtraction" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paperId" INTEGER NOT NULL,
    "extractedData" JSONB NOT NULL,
    "needsReview" BOOLEAN NOT NULL DEFAULT true,
    "confidence" DOUBLE PRECISION,
    "codedById" INTEGER,
    "codedAt" TIMESTAMP(3),
    "verifiedById" INTEGER,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "PaperExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Study_stage1PaperId_key" ON "Study"("stage1PaperId");

-- CreateIndex
CREATE UNIQUE INDEX "Study_stage2PaperId_key" ON "Study"("stage2PaperId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyFavorite_userId_studyId_key" ON "StudyFavorite"("userId", "studyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaperExtraction_paperId_key" ON "PaperExtraction"("paperId");

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_stage1PaperId_fkey" FOREIGN KEY ("stage1PaperId") REFERENCES "Paper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_stage2PaperId_fkey" FOREIGN KEY ("stage2PaperId") REFERENCES "Paper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyFavorite" ADD CONSTRAINT "StudyFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyFavorite" ADD CONSTRAINT "StudyFavorite_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperExtraction" ADD CONSTRAINT "PaperExtraction_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperExtraction" ADD CONSTRAINT "PaperExtraction_codedById_fkey" FOREIGN KEY ("codedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperExtraction" ADD CONSTRAINT "PaperExtraction_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

