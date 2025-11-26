import { Router } from "express";
import {
  authorize,
  handleUninstall,
  login,
} from "../controllers/authController";
import { apiKeyMiddleware } from "./../middleware/apiKeyMiddleware";

export const authRouter = Router();

authRouter.post("/", authorize);
authRouter.post("/uninstalled", handleUninstall);
authRouter.post("/login", apiKeyMiddleware, login);
