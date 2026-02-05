import { Router } from "express";
import {
  fetchLanguages,
  fetchProducts,
  fetchVariantInventoryPolicy,
} from "../controllers/generalController";

export const generalRouter = Router();

generalRouter.get("/languages", fetchLanguages);
generalRouter.get("/products", fetchProducts);
generalRouter.get("/variant-inventory-policy", fetchVariantInventoryPolicy);
