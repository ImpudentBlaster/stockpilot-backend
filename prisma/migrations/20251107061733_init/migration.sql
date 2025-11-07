/*
  Warnings:

  - The primary key for the `Subscriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `Subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Subscriptions" DROP CONSTRAINT "Subscriptions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Subscriptions_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Stores" (
    "id" UUID NOT NULL,
    "shop" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "installed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Stores_pkey" PRIMARY KEY ("id")
);
