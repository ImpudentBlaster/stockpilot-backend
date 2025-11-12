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
    await prisma.stores.upsert({
      where: {
        shop,
      },
      update: {
        installed: true,
      },
      create: {
        shop,
        access_token,
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
    const { data } = await shopifyInstance({
      shop_url: shop,
      access_token,
    }).post(`https://${shop}/admin/api/2025-10/graphql.json`, {
      query,
      variables: {
        topic: "INVENTORY_LEVELS_UPDATE",
        webhookSubscription: {
          callbackUrl: `${process.env.URL}/api/subscription/notify`,
          format: "JSON",
        },
      },
    });

    return res
      .status(200)
      .json({ message: "Session stored successfully", data: req.body });
  } catch (error: any) {
    console.log("Error authenticating session: ", error.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};
