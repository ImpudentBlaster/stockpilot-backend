import { Router } from "express";
import { fetch } from "../controllers/analyticsController";
import { apiKeyMiddleware } from "./../middleware/apiKeyMiddleware";
import { authMiddleware } from "../middleware/authMiddleware";
import { proxyMiddleware } from "../middleware/proxyMiddleware";

export const analyticsRouter = Router();

analyticsRouter.get("/", fetch);
