import { Router } from "express";
import {
  create,
  getActiveSubs,
  getSentSubs,
  getTotalSubs,
  mostRequestedProducts,
  notify,
} from "../controllers/backInStockController";
import { proxyMiddleware } from "../middleware/proxyMiddleware";

export const backInStockRouter = Router();

backInStockRouter.post("/", proxyMiddleware, create);
backInStockRouter.post("/notify", notify);
backInStockRouter.get("/total", getTotalSubs);
backInStockRouter.get("/active", getActiveSubs);
backInStockRouter.get("/sent", getSentSubs);
backInStockRouter.get("/most-requested", mostRequestedProducts);
