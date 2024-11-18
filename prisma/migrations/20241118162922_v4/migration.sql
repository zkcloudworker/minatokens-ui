/*
  Warnings:

  - You are about to drop the `APIKeyUsage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "APIKeyUsage" DROP CONSTRAINT "APIKeyUsage_address_fkey";

-- DropForeignKey
ALTER TABLE "APIKeyUsage" DROP CONSTRAINT "APIKeyUsage_jobId_fkey";

-- AlterTable
ALTER TABLE "AddressBlacklist" ADD COLUMN     "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "DiscordBlacklist" ADD COLUMN     "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "EmailBlacklist" ADD COLUMN     "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "RevokedKeys" ADD COLUMN     "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "APIKeyUsage";

-- CreateTable
CREATE TABLE "APIKeyHistory" (
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "discord" TEXT,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIKeyHistory_pkey" PRIMARY KEY ("address","time")
);

-- CreateTable
CREATE TABLE "APIKeyCalls" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "status" INTEGER NOT NULL,
    "error" TEXT,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIKeyCalls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIKeyProofs" (
    "address" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "jobId" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIKeyProofs_pkey" PRIMARY KEY ("address","chain","jobId")
);

-- CreateIndex
CREATE INDEX "APIKeyHistory_address_idx" ON "APIKeyHistory"("address");

-- CreateIndex
CREATE INDEX "APIKeyHistory_email_idx" ON "APIKeyHistory"("email");

-- CreateIndex
CREATE INDEX "APIKeyHistory_discord_idx" ON "APIKeyHistory"("discord");

-- CreateIndex
CREATE INDEX "APIKeyHistory_time_idx" ON "APIKeyHistory"("time");

-- CreateIndex
CREATE INDEX "APIKeyCalls_address_idx" ON "APIKeyCalls"("address");

-- CreateIndex
CREATE INDEX "APIKeyCalls_chain_idx" ON "APIKeyCalls"("chain");

-- CreateIndex
CREATE INDEX "APIKeyCalls_time_idx" ON "APIKeyCalls"("time");

-- CreateIndex
CREATE UNIQUE INDEX "APIKeyProofs_jobId_key" ON "APIKeyProofs"("jobId");

-- CreateIndex
CREATE INDEX "APIKeyProofs_address_idx" ON "APIKeyProofs"("address");

-- CreateIndex
CREATE INDEX "APIKeyProofs_jobId_idx" ON "APIKeyProofs"("jobId");

-- CreateIndex
CREATE INDEX "APIKeyProofs_chain_idx" ON "APIKeyProofs"("chain");

-- CreateIndex
CREATE INDEX "APIKeyProofs_time_idx" ON "APIKeyProofs"("time");

-- AddForeignKey
ALTER TABLE "APIKeyHistory" ADD CONSTRAINT "APIKeyHistory_address_fkey" FOREIGN KEY ("address") REFERENCES "APIKey"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIKeyCalls" ADD CONSTRAINT "APIKeyCalls_address_fkey" FOREIGN KEY ("address") REFERENCES "APIKey"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIKeyProofs" ADD CONSTRAINT "APIKeyProofs_address_fkey" FOREIGN KEY ("address") REFERENCES "APIKey"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIKeyProofs" ADD CONSTRAINT "APIKeyProofs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobData"("jobId") ON DELETE CASCADE ON UPDATE CASCADE;
