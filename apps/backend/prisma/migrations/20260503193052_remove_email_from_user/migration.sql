/*
  Warnings:

  - You are about to drop the column `actorEmail` on the `AdminHistoryEvent` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "AdminHistoryEvent" DROP COLUMN "actorEmail",
ADD COLUMN     "actorUsername" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email";
