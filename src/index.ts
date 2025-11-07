import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { subscriptionRouter } from "./routes/subscriptionRouter";
import { authRouter } from "./routes/authRouter";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const BASE = process.env.BASE_URL || "/api";

app.use(`${BASE}/auth`, authRouter);
app.use(`${BASE}/subscription`, subscriptionRouter);

app.get("/", (_, res) => {
  return res.status(200).json("Server is up");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
