// middleware/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing auth header" });
  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.manager = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
