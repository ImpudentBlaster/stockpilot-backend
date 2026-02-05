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
          AND: [{ variant_id: { contains: q, mode: "insensitive" } }],
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

    const parsed = offerSchema.safeParse(req.body);
    if (!parsed.success) {

      return res.status(400).json({ error: parsed.error.issues });
    }

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
        ? { remainingBalanceChargeTrigger: "NO_REMAINING_BALANCE" }
        : { remainingBalanceChargeTrigger: billingPolicy.chargeTrigger }),
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

    const variantIds: string[] = [];
    const enableInventoryPayload: any[] = [];

    const VARIANTS_QUERY = `
      query ProductVariants($productId: ID!) {
        product(id: $productId) {
          variants(first: 250) {
            nodes { id }
          }
        }
      }
    `;

    const PRODUCT_BY_VARIANT = `
      query ProductByVariant($variantId: ID!) {
        productVariant(id: $variantId) {
          product { id }
        }
      }
    `;

    for (const productId of resources.productIds) {
      const { data } = await shopifyInstance({ shop_url, access_token }).post(
        "/graphql.json",
        { query: VARIANTS_QUERY, variables: { productId } },
      );

      const variants = data.data.product?.variants.nodes || [];
      enableInventoryPayload.push({
        productId,
        variants: variants.map((v: any) => {
          variantIds.push(v.id);
          return { id: v.id, inventoryPolicy: "CONTINUE" };
        }),
      });
    }

    for (const variantId of resources.variantIds) {
      variantIds.push(variantId);

      const { data } = await shopifyInstance({ shop_url, access_token }).post(
        "/graphql.json",
        { query: PRODUCT_BY_VARIANT, variables: { variantId } },
      );

      const productId = data.data?.productVariant?.product?.id;
      if (!productId) continue;

      enableInventoryPayload.push({
        productId,
        variants: [{ id: variantId, inventoryPolicy: "CONTINUE" }],
      });
    }

    const INVENTORY_UPDATE = `
      mutation updateVariantsInventoryPolicy(
        $productId: ID!
        $variants: [ProductVariantsBulkInput!]!
      ) {
        productVariantsBulkUpdate(
          productId: $productId
          variants: $variants
        ) {
          userErrors { message }
        }
      }
    `;

    for (const payload of enableInventoryPayload) {
      await shopifyInstance({ shop_url, access_token }).post("/graphql.json", {
        query: INVENTORY_UPDATE,
        variables: payload,
      });
    }

    const CREATE_GROUP = `
      mutation CreateGroup($input: SellingPlanGroupInput!) {
        sellingPlanGroupCreate(input: $input) {
          sellingPlanGroup {
            id
            sellingPlans(first: 1) {
              edges {
                node { id }
              }
            }
          }
          userErrors { message }
        }
      }
    `;

    const groupRes = await shopifyInstance({ shop_url, access_token }).post(
      "/graphql.json",
      {
        query: CREATE_GROUP,
        variables: {
          input: {
            name: groupName,
            merchantCode: groupName,
            options: ["Purchase option"],
            sellingPlansToCreate: [
              {
                name: planName,
                options: ["Pre-order"],
                category: "PRE_ORDER",
                description: planDescription,
                billingPolicy: { fixed: _billingPolicy },
                deliveryPolicy: { fixed: deliveryPolicy },
                inventoryPolicy: { reserve: "ON_FULFILLMENT" },
                pricingPolicies: [],
              },
            ],
          },
        },
      },
    );

    const shopifyGroupId =
      groupRes.data.data.sellingPlanGroupCreate.sellingPlanGroup.id;

    const shopifyPlanId =
      groupRes.data.data.sellingPlanGroupCreate.sellingPlanGroup.sellingPlans
        .edges[0].node.id;

    await shopifyInstance({ shop_url, access_token }).post("/graphql.json", {
      query: `
        mutation attachVariants($id: ID!, $productVariantIds: [ID!]!) {
          sellingPlanGroupAddProductVariants(
            id: $id
            productVariantIds: $productVariantIds
          ) {
            userErrors { message }
          }
        }
      `,
      variables: {
        id: shopifyGroupId,
        productVariantIds: variantIds,
      },
    });

    await prisma.$transaction(async (tx) => {
      const offerGroup = await tx.offerGroup.create({
        data: {
          name: groupName,
          merchant_code: groupName,
          options: ["Purchase option"],
        },
      });

      await tx.offerPlan.create({
        data: {
          shopify_plan_id: shopifyPlanId,
          groupId: offerGroup.id,
          name: planName,
          description: planDescription,
          billing_policy: _billingPolicy,
          delivery_policy: deliveryPolicy,
          inventory_policy: { reserve: "ON_FULFILLMENT" },
          pricing_policies: [],
        },
      });

      const products = await Promise.all(
        variantIds.map((variantId) =>
          tx.preOrderProducts.upsert({
            where: { variant_id: variantId },
            update: {
              shop: shop_url,
              continue_seling: false,
            },
            create: {
              shop: shop_url,
              variant_id: variantId,
              offer_group_id: offerGroup.id,
              continue_seling: false,
            },
          }),
        ),
      );

      await tx.preOrderProductOffer.createMany({
        data: products.map((p) => ({
          productId: p.id,
          offerGroupId: offerGroup.id,
        })),
        skipDuplicates: true,
      });
    });

    return res.status(200).json({
      success: true,
      shopifyGroupId,
      shopifyPlanId,
      variants: variantIds.length,
    });
  } catch (error: any) {
    console.error("Create Offer Error:", error);
    return res.status(500).json({
      error: error?.message || "Internal server error",
    });
  }
};

export const getPlans = async (req: Request, res: Response) => {
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

    const plans = await prisma.offerPlan.findMany({
      include: {
        group: {
          include: {
            productOffers: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    const filteredPlans = plans.filter((plan) =>
      plan.group?.productOffers?.some((po) => po.product?.shop === shop_url),
    );

    const response = filteredPlans.map((plan) => ({
      id: plan.id,
      shopify_plan_id: plan.shopify_plan_id,
      name: plan.name,
      group: {
        id: plan.group.id,
        name: plan.group.name,
        merchant_code: plan.group.merchant_code,
      },
    }));

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("Fetch Plans Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plans",
    });
  }
};

export const getVariantsByPlan = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const plan = await prisma.offerPlan.findUnique({
      where: {
        shopify_plan_id: planId,
      },
      include: {
        group: {
          include: {
            productOffers: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const variants = plan.group.productOffers.map((po) => ({
      productId: po.product.id,
      variantId: po.product.variant_id,
      shop: po.product.shop,
      continueSelling: po.product.continue_seling,
    }));

    return res.status(200).json({
      success: true,
      plan: {
        id: plan.id,
        shopify_plan_id: plan.shopify_plan_id,
        name: plan.name,
      },
      variants,
    });
  } catch (error: any) {
    console.error("Fetch Variants Error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};
