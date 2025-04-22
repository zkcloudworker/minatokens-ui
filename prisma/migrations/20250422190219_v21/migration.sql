-- CreateTable
CREATE TABLE "NFTCMS" (
    "id" SERIAL NOT NULL,
    "chain" "Chain" NOT NULL,
    "collectionAddress" TEXT NOT NULL,
    "symbol" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageURL" TEXT NOT NULL,
    "traits" JSONB,
    "nftData" JSONB,
    "price" DOUBLE PRECISION,
    "mintStart" TIMESTAMP(3),
    "mintEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NFTCMS_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NFTCMS_chain_idx" ON "NFTCMS"("chain");

-- CreateIndex
CREATE INDEX "NFTCMS_collectionAddress_idx" ON "NFTCMS"("collectionAddress");

-- CreateIndex
CREATE INDEX "NFTCMS_name_idx" ON "NFTCMS"("name");
