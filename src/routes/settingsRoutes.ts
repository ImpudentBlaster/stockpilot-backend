import { Router } from "express";
import {
  getStoreSettings,
  updateStoreSettings,
} from "../controllers/settingsController";

export const settingsRouter = Router();

settingsRouter.patch("/", updateStoreSettings);
settingsRouter.get("/", getStoreSettings);
