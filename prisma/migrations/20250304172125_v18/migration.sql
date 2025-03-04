-- CreateTable
CREATE TABLE "AddressWhitelist" (
    "address" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddressWhitelist_pkey" PRIMARY KEY ("address")
);
