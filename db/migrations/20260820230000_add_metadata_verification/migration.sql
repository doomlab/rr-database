ALTER TABLE "Paper"
  ADD COLUMN "metadataVerifiedById" INTEGER,
  ADD COLUMN "metadataVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Paper" ADD CONSTRAINT "Paper_metadataVerifiedById_fkey"
  FOREIGN KEY ("metadataVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
