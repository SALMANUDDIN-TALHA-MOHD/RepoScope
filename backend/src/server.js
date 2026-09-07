/**
 * server.js
 * Entry point for the RepoScope Express backend.
 * Loads environment variables, sets up middleware, mounts routes,
 * and starts listening on the configured port.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const scanRoutes = require("./routes/scan");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api", scanRoutes);

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[server error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`RepoScope backend running on http://localhost:${PORT}`);
});
