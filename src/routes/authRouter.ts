import { Router } from "express";
import { authorize } from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/", authorize);
