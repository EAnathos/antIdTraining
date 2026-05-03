-- CreateEnum
CREATE TYPE "AdminHistoryTone" AS ENUM ('SUCCESS', 'ERROR', 'INFO');

-- CreateTable
CREATE TABLE "AdminHistoryEvent" (
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
CREATE INDEX "AdminHistoryEvent_createdAt_idx" ON "AdminHistoryEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AdminHistoryEvent_actorUserId_idx" ON "AdminHistoryEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "AdminHistoryEvent_entityType_entityId_idx" ON "AdminHistoryEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "AdminHistoryEvent" ADD CONSTRAINT "AdminHistoryEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
