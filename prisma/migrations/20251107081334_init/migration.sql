/*
  Warnings:

  - A unique constraint covering the columns `[shop]` on the table `Subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Subscriptions_shop_key" ON "Subscriptions"("shop");
