import type { Request, Response } from "express";
import { shopifyInstance } from "../utils/axiosInstances";
import prisma from "../config/prisma";
import { sendMail } from "../utils/sendMail";

export const create = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, variantId, shop, productId } = req.body;

    if (!email || !shop || !variantId || !productId) {
      return res.status(400).json({ error: "Missing fields" });
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
    product {
      title
      featuredImage {
        url
      }
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
      },
    );

    if (data.errors) {
      console.error("Error fetching inventory item id:", data.errors);
      return res.status(400).json({
        error: data.errors[0].message || "Error fetching inventory item id",
      });
    }
    const { title, inventoryItem, product } = data.data?.productVariant;
    const {title: product_title, featuredImage} = product;
    const inventory_item_id = inventoryItem.id || null;

    if (!inventory_item_id) {
      return res.status(400).json({ error: "Product not found in inventory" });
    }

    await prisma.subscriptions.create({
      data: {
        product_id: String(productId),
        title,
        shop,
        variant_id: String(variantId),
        inventory_item_id: inventory_item_id.split("/").at(-1),
        email,
        product_title,
        product_imgurl: featuredImage?.url || "placeholder"
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

    if (!shop || !inventory_item_id) {
      console.error("No shop or inventory id provided");
      return res
        .status(400)
        .json({ error: "Shop domain and inventory item id are required" });
    }

    if (available <= 0) {
      console.error("Not enough inventory for:", inventory_item_id, available);
      return res.status(400).json({ error: "Not enough inventory" });
    }

    const subscriptions = await prisma.subscriptions.findMany({
      where: {
        shop,
        inventory_item_id: String(inventory_item_id),
        notified: false,
      },
    });

    if (!subscriptions.length) {
      console.error("No valid subscribers found");
      return res.status(400).json({ error: "No valid subscribers found" });
    }

    for (const subscription of subscriptions) {
      const { id, email } = subscription;

      await sendMail({ email, variant_id: subscriptions[0].variant_id });
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
    return res
      .status(200)
      .json({ message: "Users have been notified successfully" });
  } catch (error: any) {
    console.error("Error notifying customers:", error.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};

export const getTotalSubs = async (req: Request, res: Response) => {
  try {
    const shop = typeof req.query.shop !== "string" ? null : req.query.shop;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!shop) {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    const [data, total] = await Promise.all([
      prisma.subscriptions.findMany({
        where: {
          shop,
          // OR: [{ product_id: { contains: q, mode: "insensitive" } }],
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.subscriptions.count({
        where: {
          shop,
          // OR: [{ product_id: { contains: q, mode: "insensitive" } }],
        },
      }),
    ]);

    return res.status(200).json({
      data,
      total,
    });
  } catch (error: any) {
    console.error("Error fetching total subs:", error.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};

export const getActiveSubs = async (req: Request, res: Response) => {
  try {
    const shop = typeof req.query.shop !== "string" ? null : req.query.shop;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!shop) {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    const [data, total] = await Promise.all([
      prisma.subscriptions.findMany({
        where: {
          shop,
          notified: false,
          // OR: [{ product_id: { contains: q, mode: "insensitive" } }],
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.subscriptions.count({
        where: {
          shop,
          notified: false,
          // OR: [{ product_id: { contains: q, mode: "insensitive" } }],
        },
      }),
    ]);

    return res.status(200).json({
      data,
      total,
    });
  } catch (error: any) {
    console.error("Error fetching active subscriptions:", error.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};

export const getSentSubs = async (req: Request, res: Response) => {
  try {
    const shop = typeof req.query.shop !== "string" ? null : req.query.shop;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!shop) {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    const [data, total] = await Promise.all([
      prisma.subscriptions.findMany({
        where: {
          shop,
          notified: true,
          // OR: [{ product_id: { contains: q, mode: "insensitive" } }],
        },
        skip: offset,
        take: limit,
        orderBy: {
          notified_at: "desc",
        },
      }),
      prisma.subscriptions.count({
        where: {
          shop,
          notified: true,
          // OR: [{ product_id: { contains: q, mode: "insensitive" } }],
        },
      }),
    ]);

    return res.status(200).json({
      data,
      total,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};

export const mostRequestedProducts = async (req: Request, res: Response) => {
  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    const products = await prisma.subscriptions.groupBy({
      by: ["product_id", "variant_id", "title", "product_imgurl", "product_title"],
      where: { shop },
      _count: {
        variant_id: true,
      },
      orderBy: {
        _count: {
          variant_id: "desc",
        },
      },
      take: 10,
    });

    console.log(products)

    const data = products.map(({ product_id, variant_id, title, _count, product_imgurl, product_title }) => ({
      product_id,
      variant_id,
      title,
      count: _count.variant_id,
      product_imgurl, product_title
    }));

    return res.status(200).json({ data });
  } catch (error: any) {
    console.error("Error fetching product data:", error?.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};
