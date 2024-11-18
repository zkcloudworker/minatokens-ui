/*
  Warnings:

  - Added the required column `endpoint` to the `APIKeyCalls` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "APIKeyCalls" ADD COLUMN     "endpoint" TEXT NOT NULL;
