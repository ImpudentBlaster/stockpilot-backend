import type { Request, Response } from "express";
import { shopifyInstance } from "../utils/axiosInstances";
import prisma from "../config/prisma";
import { sendMail } from "../utils/sendMail";

export const create = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, variantId, shop, quantity, productId } = req.body;

    if (!email || !shop || !variantId || !quantity || !productId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity can't be less than 1" });
    }

    const shopData = await prisma.stores.findUnique({
      where: { shop },
    });

    if (!shopData) {
      return res
        .status(400)
        .json({ error: `App has not been installed on ${shop}` });
    }

    const existingSubscription = await prisma.subscriptions.findFirst({
      where: {
        email,
        variant_id: String(variantId),
        notified: false,
      },
    });

    if (existingSubscription) {
      return res.status(400).json({
        error: "Subscription has already been added for this product",
      });
    }

    const { access_token, shop: shop_url } = shopData;

    const query = `
    query getInventoryItemId($id: ID!) {
      productVariant(id: $id) {
        title
        inventoryItem {
          id
        }
      }
    }
  `;
    const { data } = await shopifyInstance({ access_token, shop_url }).post(
      "/graphql.json",
      {
        query,
        variables: {
          id: `gid://shopify/ProductVariant/${String(variantId)}`,
        },
      }
    );

    if (data.errors) {
      console.log(data.errors);
      return res.status(400).json({
        error: data.errors[0].message || "Error fetching inventory item id",
      });
    }
    const { title, inventoryItem } = data.data?.productVariant;
    const inventory_item_id = inventoryItem.id || null;

    console.log(title, inventory_item_id);

    if (!inventory_item_id) {
      return res.status(400).json({ error: "Product not found in inventory" });
    }

    await prisma.subscriptions.create({
      data: {
        product_id: String(productId),
        title,
        shop,
        quantity,
        variant_id: String(variantId),
        inventory_item_id: inventory_item_id.split("/").at(-1),
        email,
      },
    });

    return res.status(200).json({
      message:
        "Subscription added successfully. You will be notified once the product is in stock",
    });
  } catch (error: any) {
    console.error("Error adding subscription:", error.message);
    return res.status(500).json(error);
  }
};

export const notify = async (req: Request, res: Response) => {
  try {
    const shopHeader = req.headers["x-shopify-shop-domain"];
    const shop = Array.isArray(shopHeader) ? shopHeader[0] : shopHeader;
    const { inventory_item_id, available } = req.body;
    console.log(inventory_item_id, shopHeader, shop);
    if (!shop || !inventory_item_id) {
      console.log("No shop or inventory id provided");
      return res
        .status(400)
        .json({ error: "Shop domain and inventory item id are required" });
    }

    if (available <= 0) {
      console.log("Not enough inventory for:", inventory_item_id, available);
      return res.status(400).json({ error: "Not enough inventory" });
    }

    const subscriptions = await prisma.subscriptions.findMany({
      where: {
        shop,
        inventory_item_id: String(inventory_item_id),
        notified: false,
      },
    });
    console.log(subscriptions);
    if (!subscriptions.length) {
      console.log("No active subscribers found");
      return res.status(400).json({ error: "No active subscribers found" });
    }

    const emails = [];

    for (const subscription of subscriptions) {
      const { id, email } = subscription;
      emails.push(email);

      await prisma.subscriptions.update({
        where: {
          id,
        },
        data: {
          notified: true,
          notified_at: new Date(),
        },
      });
    }
    await sendMail({ emails, variant_id: subscriptions[0].variant_id });
    return res
      .status(200)
      .json({ message: "Users have been notified successfully" });
  } catch (error: any) {
    console.log("Error notifying customers:", error.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};
