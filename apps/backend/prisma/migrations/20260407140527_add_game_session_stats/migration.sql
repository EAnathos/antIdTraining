-- CreateEnum
CREATE TYPE "GameDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "level" "GameDifficulty" NOT NULL,
    "entryId" TEXT,
    "finalCorrect" BOOLEAN,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSession_level_idx" ON "GameSession"("level");

-- CreateIndex
CREATE INDEX "GameSession_createdAt_idx" ON "GameSession"("createdAt");

-- CreateIndex
CREATE INDEX "GameSession_finalCorrect_idx" ON "GameSession"("finalCorrect");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ObservationEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
