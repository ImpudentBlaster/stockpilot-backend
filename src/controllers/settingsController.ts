import { Request, Response } from "express";
import { allowedSettings } from "../utils/constants";
import prisma from "../config/prisma";

export const getStoreSettings = async (req: Request, res: Response) => {
  try {
    const { shop } = req.query;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    const data = await prisma.storeSettings.findUnique({
      where: {
        shop,
      },
    });

    return res.status(200).json({ data });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};

export const updateStoreSettings = async (req: Request, res: Response) => {
  try {
    const { shop } = req.query;
    const data = req.body;

    if (!shop || typeof shop !== "string") {
      return res.status(400).json({ error: "Shop domain is required" });
    }

    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "No valid settings provided" });
    }

    const entries = Object.entries(data);

    if (entries.length === 0) {
      return res.status(400).json({ error: "No settings provided" });
    }

    // Validate all settings before updating
    const updateData: Record<string, any> = {};
    
    for (const [setting, value] of entries) {
      if (!(setting in allowedSettings)) {
        return res.status(400).json({ error: `Invalid setting: ${setting}` });
      }

      type AllowedSettingKey = keyof typeof allowedSettings;
      const expectedType = allowedSettings[setting as AllowedSettingKey];

      if (typeof value !== expectedType) {
        return res.status(400).json({
          error: `Invalid type for ${setting}. Expected ${expectedType}`,
        });
      }

      updateData[setting] = value;
    }

    // Update all validated settings at once
    await prisma.storeSettings.update({
      where: {
        shop,
      },
      data: updateData,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Something went wrong" });
  }
};
