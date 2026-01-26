import { Router } from "express";
import {
  fetchLanguages,
  fetchProducts,
} from "../controllers/generalController";

export const generalRouter = Router();

generalRouter.get("/languages", fetchLanguages);
generalRouter.get("/products", fetchProducts);
