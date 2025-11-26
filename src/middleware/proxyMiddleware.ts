import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export const proxyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Missing Shopify secret" });
    }

    const query = req.query as Record<string, string>;
    const { signature, ...rest } = query;

    if (!signature) {
      return res.status(403).json({ error: "Missing signature" });
    }

    const message = Object.keys(rest)
      .sort()
      .map((key) => `${key}=${rest[key]}`)
      .join("");

    const generated = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest("hex");

    if (generated !== signature) {
      return res.status(403).json({ error: "Invalid signature" });
    }

    next();
  } catch (error) {
    console.error("Proxy verification failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
