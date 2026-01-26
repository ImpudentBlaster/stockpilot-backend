import { Request, Response } from "express";
import prisma from "../config/prisma";
import { shopifyInstance } from "../utils/axiosInstances";
import pLimit from "p-limit";
import { offerSchema } from "../schema/preorder.schema";

export const syncPreorderProducts = async (req: Request, res: Response) => {
  try {
    const { shop } = req.query;
    const products = req.body;
    const limit = pLimit(5);

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    const existingShop = await prisma.stores.findUnique({
      where: { shop, installed: true },
    });

    if (!existingShop) {
      return res.status(400).json({ error: "No active shop found" });
    }

    const { access_token, shop: shop_url } = existingShop;

    const variable = {
      productId: "",
      variants: {
        id: "",
        inventoryPolicy: "COTINUE",
      },
    };

    const UPDATE_QUERY = `
      mutation updateVariantsInventoryPolicy(
        $productId: ID!
        $variants: [ProductVariantsBulkInput!]!
      ) {
        productVariantsBulkUpdate(
          productId: $productId
          variants: $variants
        ) {
          userErrors {
            field
            message
          }
        }
      }
    `;

    const { data } = await shopifyInstance({ access_token, shop_url }).post(
      "/graphql.json",
      {
        query: UPDATE_QUERY,
        variable,
      },
    );

    console.log(data);

    // await Promise.all(
    //   products.map((variables: any) =>
    //     limit(() =>
    //       shopifyInstance({ access_token, shop_url }).post("/graphql.json", {
    //         query: UPDATE_QUERY,
    //         variables,
    //       })
    //     )
    //   )
    // );

    // const rawVariantIds: string[] = products.flatMap((p: any) =>
    //   p.variants.map((v: any) => v.id)
    // );

    // const variantIds = rawVariantIds.filter(
    //   (id) =>
    //     typeof id === "string" && id.startsWith("gid://shopify/ProductVariant/")
    // );

    // if (!variantIds.length) {
    //   return res.status(400).json({ error: "No valid variant IDs found" });
    // }

    // const chunkSize = 50;
    // const chunks = Array.from(
    //   { length: Math.ceil(variantIds.length / chunkSize) },
    //   (_, i) => variantIds.slice(i * chunkSize, i * chunkSize + chunkSize)
    // );

    // const VARIANTS_QUERY = `
    //   query getVariants($ids: [ID!]!) {
    //     nodes(ids: $ids) {
    //       ... on ProductVariant {
    //         id
    //         title
    //         inventoryPolicy
    //         image {
    //           url
    //         }
    //         product {
    //           id
    //           title
    //         }
    //         inventoryItem {
    //           inventoryLevels(first: 50) {
    //             edges {
    //               node {
    //                 quantities(names: ["available"]) {
    //                   name
    //                   quantity
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    // `;

    // const variants = (
    //   await Promise.all(
    //     chunks.map((ids) =>
    //       limit(async () => {
    //         const response = await shopifyInstance({
    //           access_token,
    //           shop_url,
    //         }).post("/graphql.json", {
    //           query: VARIANTS_QUERY,
    //           variables: { ids },
    //         });

    //         const body = response.data;

    //         if (body.errors) {
    //           console.error(
    //             "Shopify GraphQL errors:",
    //             JSON.stringify(body.errors, null, 2)
    //           );
    //           return [];
    //         }

    //         if (!body.data || !body.data.nodes) {
    //           console.error(
    //             "Unexpected Shopify response:",
    //             JSON.stringify(body, null, 2)
    //           );
    //           return [];
    //         }

    //         return body.data.nodes;
    //       })
    //     )
    //   )
    // ).flat();

    // await prisma.$transaction(
    //   variants.filter(Boolean).map((v: any) => {
    //     const quantity =
    //       v.inventoryItem?.inventoryLevels?.edges?.reduce(
    //         (sum: number, edge: any) => {
    //           const availableQty =
    //             edge.node.quantities?.find((q: any) => q.name === "available")
    //               ?.quantity ?? 0;
    //           return sum + availableQty;
    //         },
    //         0
    //       ) ?? 0;

    //     const enabled = v.inventoryPolicy === "CONTINUE";

    //     return prisma.preOrderProducts.upsert({
    //       where: {
    //         shop: shop_url,
    //         variant_id: v.id,
    //       },
    //       create: {
    //         shop: shop_url,
    //         title: `${v.product.title} - ${v.title}`,
    //         variant_image_url: v.image?.url ?? "",
    //         product_title: v.product.title,
    //         variant_title: v.title,
    //         product_id: v.product.id,
    //         variant_id: v.id,
    //         quantity,
    //         enabled,
    //       },
    //       update: {
    //         title: `${v.product.title} - ${v.title}`,
    //         variant_image_url: v.image?.url ?? "",
    //         product_title: v.product.title,
    //         variant_title: v.title,
    //         quantity,
    //         enabled,
    //       },
    //     });
    //   })
    // );

    // return res.status(200).json({
    //   message: "Preorder products synced successfully",
    //   variantsProcessed: variants.length,
    // });
    return res.status(200).json({
      message: "Preorder products synced successfully",
      variantsProcessed: "ok",
    });
  } catch (error: any) {
    console.error("syncPreorderProducts error:", error);
    return res.status(500).json({
      error: error?.message || "Something went wrong",
    });
  }
};

export const getPreorderProducts = async (req: Request, res: Response) => {
  try {
    const { shop } = req.query;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    const existingShop = await prisma.stores.findUnique({
      where: { shop, installed: true },
    });

    if (!existingShop) {
      return res.status(400).json({ error: "No active shop found" });
    }

    const [data, total] = await Promise.all([
      prisma.preOrderProducts.findMany({
        where: {
          shop,
          AND: [{ product_id: { contains: q, mode: "insensitive" } }],
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.preOrderProducts.count({
        where: {
          shop,
        },
      }),
    ]);

    return res.status(200).json({ data, total });
  } catch (error: any) {
    console.error("error fetching products", error);
    return res.status(500).json({
      error: error?.message || "Something went wrong",
    });
  }
};

export const createOffer = async (req: Request, res: Response) => {
  try {
    console.log("p:", JSON.stringify(req.body));
    console.log("////////////////////////////////////////");
    const parsed = offerSchema.safeParse(req.body);

    const shop_url = "bundleapp-tes.myshopify.com";
    const access_token = "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";

    if (!parsed.success) {
      console.error("Invalid payload", JSON.stringify(parsed.error.issues));
      return res.status(400).json({
        error: parsed.error.issues,
      });
    }

    console.log(JSON.stringify(parsed.data));

    const {
      groupName,
      planName,
      planDescription,
      billingPolicy,
      deliveryPolicy,
      resources,
    } = parsed.data;

    const _billingPolicy: any = {
      checkoutCharge: {
        type: billingPolicy.type,
        value: {
          [billingPolicy.type === "PERCENTAGE" ? "percentage" : "fixedValue"]:
            billingPolicy.value,
        },
      },

      ...(billingPolicy.paymentMethod === "FULL"
        ? {
            remainingBalanceChargeTrigger: "NO_REMAINING_BALANCE",
          }
        : {
            remainingBalanceChargeTrigger: billingPolicy.chargeTrigger,
          }),

      ...(billingPolicy.paymentMethod === "PARTIAL" &&
        billingPolicy.chargeTrigger === "TIME_AFTER_CHECKOUT" && {
          remainingBalanceChargeTimeAfterCheckout:
            billingPolicy.daysAfterCheckout,
        }),

      ...(billingPolicy.paymentMethod === "PARTIAL" &&
        billingPolicy.chargeTrigger === "EXACT_TIME" && {
          remainingBalanceChargeExactTime: billingPolicy.chargeDate,
        }),
    };

    const offer_query = `
      mutation CreateSellingPlanGroup($input: SellingPlanGroupInput!) {
        sellingPlanGroupCreate(input: $input) {
          sellingPlanGroup {
            id
            name
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variants_query = `
   query ProductVariantsByProduct($productId: ID!) {
  product(id: $productId) {
    id
    title
    variants(first: 250) {
      nodes {
        id
        title
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
    `;

    const product_query = `
    query ProductByVariant($variantId: ID!) {
  productVariant(id: $variantId) {
    id
    title
    product {
      id
      title
    }
  }
}

    `;

    const enable_selling_payload = [];
    const variantIds = [];

    for (const productId of resources.productIds) {
      const { data } = await shopifyInstance({ access_token, shop_url }).post(
        "/graphql.json",
        {
          query: variants_query,
          variables: {
            productId,
          },
        },
      );

      if (!data.data.product?.variants) {
        continue;
      }

      const obj = {
        productId,
        variants: [] as {
          id: string;
          inventoryPolicy: "CONTINUE" | "DENY";
        }[],
      };
      const variants = data.data.product?.variants.nodes;

      for (const variant of variants) {
        if (!variant) {
          break;
        }

        const { id } = variant;
        variantIds.push(id);
        obj.variants.push({ id, inventoryPolicy: "DENY" });
      }

      enable_selling_payload.push(obj);
    }

    for (const variantId of resources.variantIds) {
      variantIds.push(variantId);
      const { data } = await shopifyInstance({ access_token, shop_url }).post(
        "/graphql.json",
        {
          query: product_query,
          variables: {
            variantId,
          },
        },
      );

      if (!data.data?.productVariant?.product) {
        continue;
      }

      const { id } = data.data.productVariant.product;

      enable_selling_payload.push({
        productId: id,
        variants: [
          {
            id: variantId,
            inventoryPolicy: "DENY",
          },
        ],
      });
    }

    for (const payload of enable_selling_payload) {
      const UPDATE_QUERY = `
      mutation updateVariantsInventoryPolicy(
        $productId: ID!
        $variants: [ProductVariantsBulkInput!]!
      ) {
        productVariantsBulkUpdate(
          productId: $productId
          variants: $variants
        ) {
          userErrors {
            field
            message
          }
        }
      }
    `;

      const { data } = await shopifyInstance({ access_token, shop_url }).post(
        "/graphql.json",
        {
          query: UPDATE_QUERY,
          variables: payload,
        },
      );

      if (data?.errors) {
        console.error(data.errors, payload);
        continue;
      }

      // console.log(data);
    }

    const variables = {
      input: {
        name: groupName,
        merchantCode: groupName,
        options: ["Purchase option"],

        sellingPlansToCreate: [
          {
            name: planName,
            options: ["Pre-order"],
            position: 1,
            category: "PRE_ORDER",
            description: planDescription,

            billingPolicy: {
              fixed: _billingPolicy,
            },

            deliveryPolicy: {
              fixed: deliveryPolicy,
            },

            inventoryPolicy: {
              reserve: "ON_FULFILLMENT",
            },

            pricingPolicies: [],
          },
        ],
      },
    };

    const { data } = await shopifyInstance({
      access_token,
      shop_url,
    }).post("/graphql.json", {
      query: offer_query,
      variables,
    });

    if (data.errors || data.data.sellingPlanGroupCreate.userErrors.length) {
      return res.status(400).json({
        error: data.errors || data.data.sellingPlanGroupCreate.userErrors,
      });
    }

    const sellingPlanGroupId =
      data.data.sellingPlanGroupCreate.sellingPlanGroup.id;

    const { data: attachResponse } = await shopifyInstance({
      access_token,
      shop_url,
    }).post("/graphql.json", {
      query: `
    mutation sellingPlanGroupAddProductVariants(
      $id: ID!
      $productVariantIds: [ID!]!
    ) {
      sellingPlanGroupAddProductVariants(
        id: $id
        productVariantIds: $productVariantIds
      ) {
        sellingPlanGroup {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
      variables: {
        id: sellingPlanGroupId,
        productVariantIds: variantIds,
      },
    });

    const errors =
      attachResponse.data.sellingPlanGroupAddProductVariants.userErrors;

    if (errors.length) {
      console.error("Failed to attach selling plan:", errors);
    }

    console.log(attachResponse);

    return res.status(200).json({
      sellingPlanGroup: data.data.sellingPlanGroupCreate.sellingPlanGroup,
    });
  } catch (error: any) {
    console.error("error creating offer", error);
    return res.status(500).json({
      error: error?.message || "Something went wrong",
    });
  }
};
