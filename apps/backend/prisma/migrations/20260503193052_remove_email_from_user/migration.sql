/*
  Warnings:

  - You are about to drop the column `actorEmail` on the `AdminHistoryEvent` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.

*/
DROP INDEX IF EXISTS "User_email_key";

ALTER TABLE "AdminHistoryEvent" DROP COLUMN IF EXISTS "actorEmail",
ADD COLUMN IF NOT EXISTS     "actorUsername" TEXT;

ALTER TABLE "User" DROP COLUMN IF EXISTS "email";
