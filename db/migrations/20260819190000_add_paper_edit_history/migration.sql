-- CreateTable
CREATE TABLE "PaperEditHistory" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paperId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "summary" TEXT,

    CONSTRAINT "PaperEditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaperEditHistory_paperId_idx" ON "PaperEditHistory"("paperId");

-- AddForeignKey
ALTER TABLE "PaperEditHistory" ADD CONSTRAINT "PaperEditHistory_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperEditHistory" ADD CONSTRAINT "PaperEditHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

