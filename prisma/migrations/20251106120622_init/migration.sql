-- CreateTable
CREATE TABLE "Subscriptions" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notified_at" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriptions_pkey" PRIMARY KEY ("id")
);
