import { Router } from "express";
import {
  syncPreorderProducts,
  getPreorderProducts,
  createOffer,
} from "../controllers/preOrderController";

export const preOrderRouter = Router();

preOrderRouter.post("/products", syncPreorderProducts);
preOrderRouter.get("/products", getPreorderProducts);
preOrderRouter.post("/offer", createOffer);
