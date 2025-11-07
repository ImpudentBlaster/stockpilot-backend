import axios from "axios";

export const shopifyInstance = ({
  access_token,
  shop_url,
}: {
  access_token: string;
  shop_url: string;
}) => {
  if (!access_token || !shop_url) {
    throw new Error("Shopify access_token and shop_url are required");
  }

  return axios.create({
    baseURL: `https://${shop_url}/admin/api/2025-10`,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": access_token,
    },
  });
};
