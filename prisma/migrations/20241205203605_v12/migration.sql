-- CreateTable
CREATE TABLE "Offers" (
    "offerAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "amount" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offers_pkey" PRIMARY KEY ("offerAddress","tokenAddress","chain")
);

-- CreateTable
CREATE TABLE "Bids" (
    "bidAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "amount" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bids_pkey" PRIMARY KEY ("bidAddress","tokenAddress","chain")
);

-- CreateIndex
CREATE INDEX "Offers_chain_idx" ON "Offers"("chain");

-- CreateIndex
CREATE INDEX "Offers_offerAddress_idx" ON "Offers"("offerAddress");

-- CreateIndex
CREATE INDEX "Offers_tokenAddress_idx" ON "Offers"("tokenAddress");

-- CreateIndex
CREATE INDEX "Bids_chain_idx" ON "Bids"("chain");

-- CreateIndex
CREATE INDEX "Bids_bidAddress_idx" ON "Bids"("bidAddress");

-- CreateIndex
CREATE INDEX "Bids_tokenAddress_idx" ON "Bids"("tokenAddress");
