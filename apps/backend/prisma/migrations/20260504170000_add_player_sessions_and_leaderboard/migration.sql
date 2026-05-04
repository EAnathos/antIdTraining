ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE INDEX IF NOT EXISTS "GameSession_userId_idx" ON "GameSession"("userId");

DO $$
BEGIN
  ALTER TABLE "GameSession"
    ADD CONSTRAINT "GameSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
