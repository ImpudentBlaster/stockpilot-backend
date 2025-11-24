import { Router } from "express";
import { authorize, handleUninstall } from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/", authorize);
authRouter.post("/uninstalled", handleUninstall);
