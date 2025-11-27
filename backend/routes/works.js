// routes/works.js
import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/* --------------------- GET ALL --------------------- */
router.get("/", async (req, res) => {
  try {
    const { driverId, machine, dateFrom, dateTo } = req.query;

    let sql =
      "SELECT w.*, d.name AS driver_name FROM works w JOIN drivers d ON w.driver_id = d.id";
    const where = [];
    const params = [];

    if (driverId) {
      where.push("driver_id = ?");
      params.push(driverId);
    }
    if (machine) {
      where.push("machine = ?");
      params.push(machine);
    }
    if (dateFrom) {
      where.push("date >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("date <= ?");
      params.push(dateTo);
    }

    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY date DESC, id DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

/* --------------------- GET ONE --------------------- */
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM works WHERE id = ?", [
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

/* --------------------- CREATE --------------------- */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      driver_id,
      date,
      machine,
      start_time,
      end_time,
      odometer_start,
      odometer_end,
      description,
      location,
    } = req.body;

    if (!driver_id || !date)
      return res.status(400).json({ error: "driver_id & date required" });

    /* ---- Prevent Duplicate Entry ---- */
    const [dupes] = await pool.query(
      `SELECT * FROM works 
        WHERE driver_id = ?
          AND date = ?
          AND machine = ?
          AND start_time = ?
          AND end_time = ?
          AND odometer_start = ?
          AND odometer_end = ?`,
      [
        driver_id,
        date,
        machine,
        start_time,
        end_time,
        odometer_start,
        odometer_end,
      ]
    );

    if (dupes.length > 0) {
      return res
        .status(400)
        .json({ error: "This entry already exists. Invalid." });
    }

    /* ---- Compute Hours ---- */
    const computeHours = (start, end) => {
      if (!start || !end) return null;
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      return (eh * 60 + em - (sh * 60 + sm)) / 60;
    };

    const total_hours = computeHours(start_time, end_time);

    /* ---- KM Calculation ---- */
    let total_km = null;
    if (odometer_start != null && odometer_end != null) {
      total_km = Math.max(0, Number(odometer_end) - Number(odometer_start));
    }

    /* ---- INSERT ---- */
    const [result] = await pool.query(
      `INSERT INTO works 
        (driver_id, date, machine, start_time, end_time, 
         odometer_start, odometer_end, description, location, 
         total_hours, total_km)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        driver_id,
        date,
        machine || null,
        start_time || null,
        end_time || null,
        odometer_start || null,
        odometer_end || null,
        description || null,
        location || null,
        total_hours,
        total_km,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM works WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

/* --------------------- UPDATE --------------------- */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const {
      driver_id,
      date,
      machine,
      start_time,
      end_time,
      odometer_start,
      odometer_end,
      description,
      location,
    } = req.body;

    const [exists] = await pool.query("SELECT * FROM works WHERE id = ?", [id]);
    if (!exists.length) return res.status(404).json({ error: "Not found" });

    const computeHours = (s, e) => {
      if (!s || !e) return null;
      const [sh, sm] = s.split(":").map(Number);
      const [eh, em] = e.split(":").map(Number);
      return (eh * 60 + em - (sh * 60 + sm)) / 60;
    };

    const total_hours = computeHours(start_time, end_time);

    let total_km = null;
    if (odometer_start != null && odometer_end != null) {
      total_km = Math.max(0, Number(odometer_end) - Number(odometer_start));
    }

    await pool.query(
      `UPDATE works SET 
        driver_id=?, date=?, machine=?, start_time=?, end_time=?, 
        odometer_start=?, odometer_end=?, description=?, location=?, 
        total_hours=?, total_km=? 
       WHERE id=?`,
      [
        driver_id,
        date,
        machine || null,
        start_time || null,
        end_time || null,
        odometer_start || null,
        odometer_end || null,
        description || null,
        location || null,
        total_hours,
        total_km,
        id,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM works WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

/* --------------------- DELETE --------------------- */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query("DELETE FROM works WHERE id = ?", [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Not found" });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
