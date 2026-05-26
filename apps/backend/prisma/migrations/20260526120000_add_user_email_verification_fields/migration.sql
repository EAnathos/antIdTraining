-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationCodeHash" TEXT,
ADD COLUMN "emailVerificationCodeExpiresAt" TIMESTAMP(3);
