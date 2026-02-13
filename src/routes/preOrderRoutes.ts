import { Router } from "express";
import {
  syncPreorderProducts,
  getPreorderProducts,
  createOffer,
  getPlans,
  getVariantsByPlan,
} from "../controllers/preOrderController";

export const preOrderRouter = Router();

preOrderRouter.post("/products", syncPreorderProducts);
preOrderRouter.get("/products", getPreorderProducts);
preOrderRouter.post("/offer", createOffer);
preOrderRouter.get("/plans", getPlans);
preOrderRouter.get("/plans/:planId/variants", getVariantsByPlan);
