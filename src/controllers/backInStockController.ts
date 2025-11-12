import type { Request, Response } from "express";
import prisma from "../config/prisma";

export const fetch = async (req: Request, res: Response) => {
  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Shop name is required" });
    }

    const totalSubscriptions = await prisma.subscriptions.findMany({
      where: {
        shop,
      },
    });

    const activeSubscriptions = await prisma.subscriptions.findMany({
      where: {
        shop,
        notified: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = totalSubscriptions.length;
    const active = activeSubscriptions.length;

    return res.status(200).json({ total, active, sent: total - active });
  } catch (error: any) {
    console.log(error.message);
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};
