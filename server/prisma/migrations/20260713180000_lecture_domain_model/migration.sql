-- Lecture domain model: add lecture type, structured detail fields, nullable
-- date, integer price, minimum participants, and deterministic sort order.

-- CreateEnum
CREATE TYPE "LectureType" AS ENUM ('SCHEDULED', 'ON_DEMAND');

-- AlterTable: new structured columns
ALTER TABLE "Lecture" ADD COLUMN     "type" "LectureType" NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "Lecture" ADD COLUMN     "subtitle" TEXT;
ALTER TABLE "Lecture" ADD COLUMN     "summary" TEXT;
ALTER TABLE "Lecture" ADD COLUMN     "audience" TEXT;
ALTER TABLE "Lecture" ADD COLUMN     "durationLabel" TEXT;
ALTER TABLE "Lecture" ADD COLUMN     "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Lecture" ADD COLUMN     "minimumParticipants" INTEGER;
ALTER TABLE "Lecture" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Date is required only for scheduled lectures.
ALTER TABLE "Lecture" ALTER COLUMN "date" DROP NOT NULL;

-- Legacy price text is intentionally discarded. This pre-production migration
-- is reset-safe, and parsing decorated or decimal values could silently alter
-- their monetary meaning.
ALTER TABLE "Lecture" DROP COLUMN "price";
ALTER TABLE "Lecture" ADD COLUMN     "price" INTEGER;
