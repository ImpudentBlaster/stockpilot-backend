import { Request, Response } from "express";
import prisma from "../config/prisma";
import { shopifyInstance } from "../utils/axiosInstances";

export const fetchLanguages = async (req: Request, res: Response) => {
  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    const existingShop = await prisma.stores.findUnique({
      where: {
        shop,
        installed: true,
      },
    });

    if (!existingShop) {
      return res.status(400).json({ error: "No active shop found" });
    }

    const { access_token, shop: shop_url } = existingShop;

    const query = `
    query {
    shopLocales {
      name
      primary
      published
    }
  }`;

    const { data } = await shopifyInstance({ access_token, shop_url }).post(
      "/graphql.json",
      {
        query,
      }
    );

    if (data?.errors?.length) {
      const message = data.errors[0]?.message;
      console.log("Error fetching languages:", message);
      return res
        .status(400)
        .json({ error: message || "Cannot fetch languages" });
    }

    const { shopLocales } = data.data;
    return res.status(200).json(shopLocales);
  } catch (error: any) {
    console.error("error fetching language codes:", error?.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};

export const fetchProducts = async (req: Request, res: Response) => {
  try {
    const { shop, after, before, q = "" } = req.query;
    const limit = Number(req.query.limit) || 250;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    if (after && before) {
      return res.status(400).json({
        error: "You cannot pass both 'after' and 'before' together.",
      });
    }

    const existingShop = await prisma.stores.findUnique({
      where: {
        shop,
        installed: true,
      },
    });

    if (!existingShop) {
      return res.status(400).json({ error: "No active shop found" });
    }

    const { access_token, shop: shop_url } = existingShop;

    const searchQuery =
      typeof q === "string" && q.trim().length > 0
        ? `
        title: ${q}* OR variant_title: ${q}* OR id: ${q}* OR variant_id: ${q}* OR sku: ${q}*        `
        : null;

    const query = `
      query ProductsPagination(
        $first: Int
        $after: String
        $last: Int
        $before: String
        $query: String
      ) {
        products(
          first: $first
          after: $after
          last: $last
          before: $before
          query: $query
        ) {
          edges {
            cursor
            node {
              id
              title
              featuredImage {
                url
                altText
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    sku
                    barcode
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    const variables: any = {
      query: searchQuery,
    };

    if (after) {
      variables.first = limit;
      variables.after = after;
    } else if (before) {
      variables.last = limit;
      variables.before = before;
    } else {
      variables.first = limit;
    }

    const { data } = await shopifyInstance({
      access_token,
      shop_url,
    }).post("/graphql.json", {
      query,
      variables,
    });

    if (data.errors) {
      console.error("Error fetching products:", data.errors);
      return res.status(500).json({ error: data.errors });
    }

    const productsData = data.data.products;

    return res.status(200).json({
      products: productsData.edges.map((e: any) => ({
        id: e.node.id,
        title: e.node.title,
        image: e.node.featuredImage?.url || null,
        variants: e.node.variants.edges.map((v: any) => ({
          id: v.node.id,
          title: v.node.title,
          sku: v.node.sku,
          barcode: v.node.barcode,
        })),
      })),
      pageInfo: {
        nextCursor: productsData.pageInfo.endCursor,
        prevCursor: productsData.pageInfo.startCursor,
        hasNextPage: productsData.pageInfo.hasNextPage,
        hasPreviousPage: productsData.pageInfo.hasPreviousPage,
      },
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      error: error?.message || "Something went wrong",
    });
  }
};



export const fetchVariantInventoryPolicy = async (req: Request, res: Response) => {
  const { shop, variantId } = req.query;
  const variantGid = `gid://shopify/ProductVariant/${variantId}`;

  if (!shop || typeof shop !== "string" || !variantId || typeof variantId !== "string") {
    return res.status(400).json({ error: "Shop and variantId are required" });
  }
  const existingShop = await prisma.stores.findUnique({
    where: {
      shop,
      installed: true,
    },
  });
  if (!existingShop) {
    return res.status(400).json({ error: "No active shop found" });
  }

  const { access_token, shop: shop_url } = existingShop;
  const query = `
    query getVariantInventoryPolicy($id: ID!) {
      productVariant(id: $id) {
        id
        inventoryPolicy
        inventoryQuantity
        inventoryItem {
          id
          tracked
        }
      }
    }
  `;
  const variables = {
    id: variantGid,
  };

  const { data } = await shopifyInstance({
    access_token,
    shop_url,
  }).post("/graphql.json", {
    query,
    variables,
  });
  if (data?.errors?.length) {
    return res.status(400).json({ error: data.errors[0]?.message });
  }
  return res.status(200).json({
    variantId,
    inventoryPolicy: data.data.productVariant.inventoryPolicy,
    inventoryQuantity: data.data.productVariant.inventoryQuantity,
    inventoryItem: data.data.productVariant.inventoryItem,
  });
};