// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import driversRouter from "./routes/drivers.js";
import worksRouter from "./routes/works.js";
import authRouter from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// routes
app.use("/api/auth", authRouter);
app.use("/api/drivers", driversRouter);
app.use("/api/works", worksRouter);

app.get("/", (req, res) => res.send("Driver Management API"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
