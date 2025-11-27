// routes/drivers.js
import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// optionally store uploads in /uploads
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

// GET all
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM drivers ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// GET single
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM drivers WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// CREATE (protected) - supports optional profile_photo upload
router.post("/", requireAuth, upload.single("profile_photo"), async (req, res) => {
  try {
    const { name, phone, address, license_no, license_expiry, aadhaar, status, assigned_vehicle } =
      req.body;
    const photo = req.file ? req.file.path : null;

    if (!name) return res.status(400).json({ error: "Name required" });

    const [result] = await pool.query(
      `INSERT INTO drivers (name, phone, address, license_no, license_expiry, aadhaar, profile_photo, status, assigned_vehicle) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        phone || null,
        address || null,
        license_no || null,
        license_expiry || null,
        aadhaar || null,
        photo,
        status || "active",
        assigned_vehicle || null,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM drivers WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// UPDATE (protected)
router.put("/:id", requireAuth, upload.single("profile_photo"), async (req, res) => {
  try {
    const { name, phone, address, license_no, license_expiry, aadhaar, status, assigned_vehicle } =
      req.body;
    const photo = req.file ? req.file.path : null;
    const { id } = req.params;

    // simple validation
    if (!name) return res.status(400).json({ error: "Name required" });

    // build query
    const [rowsBefore] = await pool.query("SELECT * FROM drivers WHERE id = ?", [id]);
    if (!rowsBefore.length) return res.status(404).json({ error: "Not found" });

    await pool.query(
      `UPDATE drivers SET name=?, phone=?, address=?, license_no=?, license_expiry=?, aadhaar=?, profile_photo=COALESCE(?, profile_photo), status=?, assigned_vehicle=? WHERE id=?`,
      [
        name,
        phone || null,
        address || null,
        license_no || null,
        license_expiry || null,
        aadhaar || null,
        photo,
        status || "active",
        assigned_vehicle || null,
        id,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM drivers WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// DELETE (protected)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM drivers WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
