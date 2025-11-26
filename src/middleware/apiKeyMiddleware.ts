import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

export const apiKeyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const shopRaw = req.header("x-shop-domain");
  const key = req.header("x-auth-key");

  if (!shopRaw || !key) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const shop = Array.isArray(shopRaw) ? String(shopRaw[0]) : String(shopRaw);

  const store = await prisma.stores.findUnique({
    where: { shop },
  });
  console.log("authorized store", store);

  if (!store || store.apiKey !== key) {
    return res.status(401).json({ message: "Invalid key" });
  }

  next();
};
