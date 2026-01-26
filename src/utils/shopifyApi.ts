import { shopifyInstance } from "./axiosInstances";

export const getVariantDetails = async (
  query: string,
  variant_id: string,
  access_token: string,
  shop_url: string
) => {
  try {
    const { data } = await shopifyInstance({ access_token, shop_url }).post(
      "/graphql.json",
      {
        query,
        variables: {
          id: variant_id,
        },
      }
    );

    return data;
  } catch (error: any) {
    console.error("Error fetching variant details", error);
    throw new Error(
      error?.message || `Error fetching variant (${variant_id}) details`
    );
  }
};
