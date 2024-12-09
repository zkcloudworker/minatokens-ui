/*
  Warnings:

  - Added the required column `ownerAddress` to the `Bids` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerAddress` to the `Offers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bids" ADD COLUMN     "ownerAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Offers" ADD COLUMN     "ownerAddress" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Bids_ownerAddress_idx" ON "Bids"("ownerAddress");

-- CreateIndex
CREATE INDEX "Offers_ownerAddress_idx" ON "Offers"("ownerAddress");
