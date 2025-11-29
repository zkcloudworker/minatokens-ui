-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LAUNCH', 'MINT', 'TRANSFER', 'BURN', 'REDEEM', 'OFFER_CREATE', 'OFFER_BUY', 'OFFER_WITHDRAW', 'BID_CREATE', 'BID_SELL', 'BID_WITHDRAW', 'AIRDROP', 'ADMIN_WHITELIST', 'NFT_LAUNCH', 'NFT_MINT', 'NFT_TRANSFER', 'NFT_APPROVE', 'NFT_BUY', 'NFT_SELL');

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userAddress" VARCHAR(255) NOT NULL,
    "txHash" VARCHAR(255) NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "tokenAddress" VARCHAR(255) NOT NULL,
    "chain" "Chain" NOT NULL,
    "activityData" JSONB NOT NULL,
    "amount" BIGINT,
    "price" BIGINT,
    "txSentAt" TIMESTAMP(3) NOT NULL,
    "txConfirmedAt" TIMESTAMP(3),
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "blockHeight" INTEGER,
    "jobId" VARCHAR(255),
    "memo" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserActivity_txHash_key" ON "UserActivity"("txHash");

-- CreateIndex
CREATE INDEX "UserActivity_userAddress_idx" ON "UserActivity"("userAddress");

-- CreateIndex
CREATE INDEX "UserActivity_txHash_idx" ON "UserActivity"("txHash");

-- CreateIndex
CREATE INDEX "UserActivity_activityType_idx" ON "UserActivity"("activityType");

-- CreateIndex
CREATE INDEX "UserActivity_tokenAddress_idx" ON "UserActivity"("tokenAddress");

-- CreateIndex
CREATE INDEX "UserActivity_chain_idx" ON "UserActivity"("chain");

-- CreateIndex
CREATE INDEX "UserActivity_txSentAt_idx" ON "UserActivity"("txSentAt");

-- CreateIndex
CREATE INDEX "UserActivity_txConfirmedAt_idx" ON "UserActivity"("txConfirmedAt");

-- CreateIndex
CREATE INDEX "UserActivity_isConfirmed_idx" ON "UserActivity"("isConfirmed");

-- CreateIndex
CREATE INDEX "UserActivity_userAddress_activityType_idx" ON "UserActivity"("userAddress", "activityType");

-- CreateIndex
CREATE INDEX "UserActivity_tokenAddress_activityType_idx" ON "UserActivity"("tokenAddress", "activityType");

-- CreateIndex
CREATE INDEX "UserActivity_chain_txSentAt_idx" ON "UserActivity"("chain", "txSentAt");

-- CreateIndex
CREATE INDEX "UserActivity_userAddress_chain_txSentAt_idx" ON "UserActivity"("userAddress", "chain", "txSentAt");
