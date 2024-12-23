-- CreateTable
CREATE TABLE "Likes" (
    "tokenAddress" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Likes_pkey" PRIMARY KEY ("tokenAddress","tokenId","userAddress","chain")
);

-- CreateIndex
CREATE INDEX "Likes_chain_idx" ON "Likes"("chain");

-- CreateIndex
CREATE INDEX "Likes_tokenAddress_idx" ON "Likes"("tokenAddress");

-- CreateIndex
CREATE INDEX "Likes_userAddress_idx" ON "Likes"("userAddress");

-- CreateIndex
CREATE INDEX "Likes_tokenId_idx" ON "Likes"("tokenId");
