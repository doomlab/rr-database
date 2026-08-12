-- AlterTable
ALTER TABLE "Paper" DROP COLUMN "osfLink",
ADD COLUMN     "registrationPlatform" TEXT,
ADD COLUMN     "registrationUrl" TEXT;

-- AlterTable
ALTER TABLE "Study" DROP COLUMN "osfLink",
ADD COLUMN     "registrationPlatform" TEXT,
ADD COLUMN     "registrationUrl" TEXT;

