-- CreateTable
CREATE TABLE "KYC" (
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eMail" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KYC_pkey" PRIMARY KEY ("address")
);
