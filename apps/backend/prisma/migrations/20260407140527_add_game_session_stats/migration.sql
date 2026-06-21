-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "GameDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "GameSession" (
    "id" TEXT NOT NULL,
    "level" "GameDifficulty" NOT NULL,
    "entryId" TEXT,
    "finalCorrect" BOOLEAN,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameSession_level_idx" ON "GameSession"("level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameSession_createdAt_idx" ON "GameSession"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameSession_finalCorrect_idx" ON "GameSession"("finalCorrect");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GameSession_entryId_fkey') THEN
        ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ObservationEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;