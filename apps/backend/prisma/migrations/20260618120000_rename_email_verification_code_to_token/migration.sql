-- AlterTable: rename emailVerificationCodeHash → emailVerificationToken
--              rename emailVerificationCodeExpiresAt → emailVerificationTokenExpiresAt
ALTER TABLE "User"
  RENAME COLUMN "emailVerificationCodeHash" TO "emailVerificationToken";

ALTER TABLE "User"
  RENAME COLUMN "emailVerificationCodeExpiresAt" TO "emailVerificationTokenExpiresAt";
