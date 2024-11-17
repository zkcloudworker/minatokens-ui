/*
  Warnings:

  - You are about to drop the column `expiry` on the `APIKey` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "APIKey" DROP COLUMN "expiry",
ALTER COLUMN "discord" DROP NOT NULL;
