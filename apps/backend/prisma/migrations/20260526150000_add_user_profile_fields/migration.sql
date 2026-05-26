-- AddColumn avatar, bio, passwordResetRequestedAt to User
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetRequestedAt" TIMESTAMP(3);
