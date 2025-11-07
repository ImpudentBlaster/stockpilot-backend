import { Request, Response } from "express";
import prisma from "../config/prisma";

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
    return res
      .status(200)
      .json({ message: "Session stored successfully", data: req.body });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};
