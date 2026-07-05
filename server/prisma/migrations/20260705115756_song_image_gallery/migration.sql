-- Wipe existing dev Song rows since imageUrl is a new required column with no sensible backfill
DELETE FROM "Song";
-- Drop the old unique constraint on (title, locale) if it exists
ALTER TABLE "Song" DROP CONSTRAINT IF EXISTS "Song_title_locale_key";
ALTER TABLE "Song" DROP COLUMN "title";
ALTER TABLE "Song" DROP COLUMN "lyrics";
ALTER TABLE "Song" ADD COLUMN "imageUrl" TEXT NOT NULL;
