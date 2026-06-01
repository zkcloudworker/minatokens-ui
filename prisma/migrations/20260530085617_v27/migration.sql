-- CreateEnum
CREATE TYPE "MesaAccountType" AS ENUM ('MAIN', 'TOKEN');

-- CreateEnum
CREATE TYPE "MesaKeyOperation" AS ENUM ('TOKEN_LAUNCH', 'NFT_LAUNCH', 'TOKEN_OFFER_CREATE', 'TOKEN_BID_CREATE', 'NFT_MINT', 'NFT_SELL');

-- CreateTable
CREATE TABLE "MesaPrivateKey" (
    "publicKey" VARCHAR(255) NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "walletAddress" VARCHAR(255),
    "operation" "MesaKeyOperation" NOT NULL,
    "accountType" "MesaAccountType" NOT NULL,
    "mainAccountPublicKey" VARCHAR(255),
    "chain" "Chain" NOT NULL,
    "source" VARCHAR(50),
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MesaPrivateKey_pkey" PRIMARY KEY ("publicKey")
);

-- CreateIndex
CREATE INDEX "MesaPrivateKey_walletAddress_idx" ON "MesaPrivateKey"("walletAddress");

-- CreateIndex
CREATE INDEX "MesaPrivateKey_operation_idx" ON "MesaPrivateKey"("operation");

-- CreateIndex
CREATE INDEX "MesaPrivateKey_accountType_idx" ON "MesaPrivateKey"("accountType");

-- CreateIndex
CREATE INDEX "MesaPrivateKey_mainAccountPublicKey_idx" ON "MesaPrivateKey"("mainAccountPublicKey");

-- CreateIndex
CREATE INDEX "MesaPrivateKey_chain_idx" ON "MesaPrivateKey"("chain");
