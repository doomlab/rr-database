-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "PaperStatus" AS ENUM ('IMPORTED', 'DISCOVERED', 'MERGED', 'DUPLICATE', 'NEW_CANDIDATE', 'ENRICHED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SYNCED');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('STAGE_1', 'STAGE_2');

-- CreateEnum
CREATE TYPE "DiscoverySource" AS ENUM ('ZOTERO_IMPORT', 'OPENALEX', 'GOOGLE_SCHOLAR', 'PCIRR');

-- CreateEnum
CREATE TYPE "ZoteroSyncStatus" AS ENUM ('NOT_SYNCED', 'SYNCED_STAGING', 'SYNCED_PRODUCTION');

-- CreateEnum
CREATE TYPE "PipelineStep" AS ENUM ('PULL_ZOTERO', 'QUERY_OPENALEX', 'QUERY_GOOGLE_SCHOLAR', 'QUERY_PCIRR', 'MERGE', 'DEDUP', 'ENRICH', 'SYNC');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "hashedPassword" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "handle" TEXT NOT NULL,
    "hashedSessionToken" TEXT,
    "antiCSRFToken" TEXT,
    "publicData" TEXT,
    "privateData" TEXT,
    "userId" INTEGER,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hashedToken" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentTo" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paper" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "doi" TEXT,
    "abstract" TEXT,
    "year" INTEGER,
    "venue" TEXT,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "issn" TEXT,
    "publisher" TEXT,
    "language" TEXT,
    "url" TEXT,
    "citedByCount" INTEGER,
    "openAccess" BOOLEAN,
    "itemType" TEXT,
    "stage" "Stage",
    "osfLink" TEXT,
    "stage1ProtocolUrl" TEXT,
    "biasLevel" TEXT,
    "openalexId" TEXT,
    "zoteroKeyProduction" TEXT,
    "zoteroKeyStaging" TEXT,
    "zoteroVersionProduction" INTEGER,
    "zoteroVersionStaging" INTEGER,
    "discoveredVia" "DiscoverySource"[],
    "sourceMetadata" JSONB,
    "pcirrMetadata" JSONB,
    "status" "PaperStatus" NOT NULL DEFAULT 'DISCOVERED',
    "dedupReason" TEXT,
    "crossrefQueried" BOOLEAN NOT NULL DEFAULT false,
    "crossrefFound" BOOLEAN NOT NULL DEFAULT false,
    "canonicalPaperId" INTEGER,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "zoteroSyncStatus" "ZoteroSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperAuthor" (
    "paperId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "PaperAuthor_pkey" PRIMARY KEY ("paperId","authorId")
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "step" "PipelineStep" NOT NULL,
    "status" "PipelineStatus" NOT NULL DEFAULT 'RUNNING',
    "output" TEXT,
    "startedById" INTEGER,

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_handle_key" ON "Session"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Token_hashedToken_type_key" ON "Token"("hashedToken", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Paper_openalexId_key" ON "Paper"("openalexId");

-- CreateIndex
CREATE UNIQUE INDEX "Paper_zoteroKeyProduction_key" ON "Paper"("zoteroKeyProduction");

-- CreateIndex
CREATE UNIQUE INDEX "Paper_zoteroKeyStaging_key" ON "Paper"("zoteroKeyStaging");

-- CreateIndex
CREATE INDEX "Paper_status_idx" ON "Paper"("status");

-- CreateIndex
CREATE INDEX "Paper_doi_idx" ON "Paper"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "Author_name_key" ON "Author"("name");

-- CreateIndex
CREATE INDEX "PaperAuthor_paperId_idx" ON "PaperAuthor"("paperId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_canonicalPaperId_fkey" FOREIGN KEY ("canonicalPaperId") REFERENCES "Paper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paper" ADD CONSTRAINT "Paper_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAuthor" ADD CONSTRAINT "PaperAuthor_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAuthor" ADD CONSTRAINT "PaperAuthor_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
