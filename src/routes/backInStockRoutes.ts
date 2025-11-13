import { Router } from "express";
import {
  create,
  getActiveSubs,
  getSentSubs,
  getTotalSubs,
  notify,
} from "../controllers/backInStockController";

export const backInStockRouter = Router();

backInStockRouter.post("/", create);
backInStockRouter.post("/notify", notify);
backInStockRouter.get("/total", getTotalSubs);
backInStockRouter.get("/active", getActiveSubs);
backInStockRouter.get("/sent", getSentSubs);
