/*
  Warnings:

  - Made the column `responseTimeMs` on table `APIKeyCalls` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "APIKeyCalls" ALTER COLUMN "responseTimeMs" SET NOT NULL;
