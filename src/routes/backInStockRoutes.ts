import { Router } from "express";
import { fetch } from "../controllers/backInStockController";

export const backInStockRouter = Router();

backInStockRouter.get("/", fetch);
