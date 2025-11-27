// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  // compare with .env password
  if (password !== process.env.MANAGER_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const token = jwt.sign({ role: "manager" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  res.json({ token });
});

export default router;
