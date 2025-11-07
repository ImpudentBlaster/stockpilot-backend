/*
  Warnings:

  - Added the required column `variant_id` to the `Subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscriptions" ADD COLUMN     "variant_id" TEXT NOT NULL;
