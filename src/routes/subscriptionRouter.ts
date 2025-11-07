import { Router } from "express";
import { create, notify } from "../controllers/subscriptionController";

export const subscriptionRouter = Router();

subscriptionRouter.post("/", create);
subscriptionRouter.post("/notify", notify);
