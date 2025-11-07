/*
  Warnings:

  - A unique constraint covering the columns `[shop]` on the table `Stores` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[access_token]` on the table `Stores` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Stores_shop_key" ON "Stores"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Stores_access_token_key" ON "Stores"("access_token");
