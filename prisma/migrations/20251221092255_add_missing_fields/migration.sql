/*
  Warnings:

  - Added the required column `url` to the `PolicySource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PolicySource" ADD COLUMN     "url" TEXT NOT NULL;
