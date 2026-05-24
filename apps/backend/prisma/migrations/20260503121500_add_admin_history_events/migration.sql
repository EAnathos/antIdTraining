-- CreateEnum
CREATE TYPE IF NOT EXISTS "AdminHistoryTone" AS ENUM ('SUCCESS', 'ERROR', 'INFO');

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminHistoryEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "tone" "AdminHistoryTone" NOT NULL DEFAULT 'INFO',
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,

    CONSTRAINT "AdminHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminHistoryEvent_createdAt_idx" ON "AdminHistoryEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminHistoryEvent_actorUserId_idx" ON "AdminHistoryEvent"("actorUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminHistoryEvent_entityType_entityId_idx" ON "AdminHistoryEvent"("entityType", "entityId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminHistoryEvent_actorUserId_fkey') THEN
        ALTER TABLE "AdminHistoryEvent" ADD CONSTRAINT "AdminHistoryEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
