-- CreateTable
CREATE TABLE "PaperFavorite" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "paperId" INTEGER NOT NULL,

    CONSTRAINT "PaperFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaperFavorite_userId_paperId_key" ON "PaperFavorite"("userId", "paperId");

-- AddForeignKey
ALTER TABLE "PaperFavorite" ADD CONSTRAINT "PaperFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperFavorite" ADD CONSTRAINT "PaperFavorite_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
