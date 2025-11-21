import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { authRouter } from "./routes/authRoutes";
import { backInStockRouter } from "./routes/backInStockRoutes";
import { analyticsRouter } from "./routes/analyticsRoutes";
import { settingsRouter } from "./routes/settingsRoutes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);

const BASE = process.env.BASE_URL || "/api";

app.use(`${BASE}/auth`, authRouter);
app.use(`${BASE}/analytics`, analyticsRouter);
app.use(`${BASE}/back-in-stock`, backInStockRouter);
app.use(`${BASE}/settings`, settingsRouter);

app.get("/", (_, res) => {
  return res.status(200).json("Server is up");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
