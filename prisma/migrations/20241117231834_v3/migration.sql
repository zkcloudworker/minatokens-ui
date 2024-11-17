-- CreateTable
CREATE TABLE "RevokedKeys" (
    "address" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "RevokedKeys_pkey" PRIMARY KEY ("address")
);

-- AddForeignKey
ALTER TABLE "RevokedKeys" ADD CONSTRAINT "RevokedKeys_address_fkey" FOREIGN KEY ("address") REFERENCES "APIKey"("address") ON DELETE CASCADE ON UPDATE CASCADE;
