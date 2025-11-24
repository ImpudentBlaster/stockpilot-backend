import { Request, Response } from "express";
import prisma from "../config/prisma";
import { shopifyInstance } from "../utils/axiosInstances";

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
