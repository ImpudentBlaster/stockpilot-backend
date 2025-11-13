import { Router } from "express";
import { fetch } from "../controllers/analyticsController";

export const analyticsRouter = Router();

analyticsRouter.get("/", fetch);
