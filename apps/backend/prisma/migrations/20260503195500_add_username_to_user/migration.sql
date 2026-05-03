-- Add username column
ALTER TABLE "User"
ADD COLUMN "username" TEXT;

-- Backfill username from id
UPDATE "User"
SET "username" = "id"
WHERE "username" IS NULL;

-- Enforce not null and uniqueness
ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
