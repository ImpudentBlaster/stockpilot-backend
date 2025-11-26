import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  console.log("authHeader:", authHeader);

  if (!authHeader) return res.status(401).json({ message: "Token missing" });

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Invalid token format" });
  }

  const token = parts[1];
  console.log("Extracted Token:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    console.log("decoded:", decoded);

    const store = await prisma.stores.findFirst({
      where: { shop: (decoded as any).shop },
      select: { apiKey: true },
    });

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    next();
  } catch (err) {
    console.error("JWT Error:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
