import { Request, Response } from "express";
import prisma from "../config/prisma";
import { shopifyInstance } from "../utils/axiosInstances";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export const authorize = async (req: Request, res: Response) => {
  try {
    const { shop, accessToken: access_token } = req.body;
    if (!shop || !access_token) {
      return res
        .status(400)
        .json({ error: "access_token and shop url are required" });
    }

    const existingStore = await prisma.stores.findUnique({
      where: { shop, installed: true },
    });

    if (existingStore && existingStore.access_token === access_token) {
      console.log(`${shop} already authorized`);
      return res.status(200).json({ message: "App already authorized" });
    }

    const apiKey = crypto.randomBytes(32).toString("hex");

    await prisma.stores.upsert({
      where: {
        shop,
      },
      update: {
        installed: true,
        access_token,
      },
      create: {
        shop,
        access_token,
        apiKey,
      },
    });

    await prisma.storeSettings.upsert({
      where: { shop },
      update: {},
      create: {
        shop,
      },
    });

    const query = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
    webhookSubscription {
      id
      topic
      endpoint {
        __typename
        ... on WebhookHttpEndpoint {
          callbackUrl
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
    `;
    await shopifyInstance({
      shop_url: shop,
      access_token,
    }).post(`https://${shop}/admin/api/2025-10/graphql.json`, {
      query,
      variables: {
        topic: "INVENTORY_LEVELS_UPDATE",
        webhookSubscription: {
          callbackUrl: `${process.env.URL}/api/back-in-stock/notify`,
          format: "JSON",
        },
      },
    });

    console.log("Webhook successfully created on:", shop);

    return res
      .status(200)
      .json({ message: "Session stored successfully", data: req.body });
  } catch (error: any) {
    console.error("Error authenticating session: ", error.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};

export const handleUninstall = async (req: Request, res: Response) => {
  try {
    const { shop } = req.body;

    if (!shop) {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    await prisma.stores.update({
      where: {
        shop,
      },
      data: {
        installed: false,
      },
    });

    return res.status(200).json({ message: "App uninstall successful" });
  } catch (error: any) {
    console.error("Error handling the app uninstall:", error.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const store = req.header("x-shop-domain");
    console.log("login store", store);

    const internalApiKey = req.header("x-auth-key");

    if (!store || !internalApiKey) {
      return res.status(400).json({ message: "Missing required headers" });
    }

    const payload = {
      shop: store,
      internalApiKey: internalApiKey,
    };

    const expiresIn = 15 * 60;
    const expiresAt = Date.now() + expiresIn * 1000;

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: expiresIn,
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      expiresIn: "15m",
      expiresAt,
      expiresAtReadable: new Date(expiresAt).toISOString(),
    });
  } catch (error: any) {
    console.error("Error authorising login:", error?.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};
