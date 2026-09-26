/**
 * server.js
 * Entry point for the RepoScope Express backend.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const scanRoutes = require("./routes/scan");
const reviewRoutes = require("./routes/reviews");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────
// Allow any localhost port (5173, 5174, 5175, etc.) so Vite port changes don't break CORS
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (Postman, curl) or any localhost origin
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// ── Health check ───────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_URL !== "https://placeholder.supabase.co"),
  });
});

// ── Routes ─────────────────────────────────────────────────
app.use("/api", scanRoutes);
app.use("/api", reviewRoutes);

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[server error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`RepoScope backend running on http://localhost:${PORT}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL && process.env.SUPABASE_URL !== "https://placeholder.supabase.co" ? "connected" : "using in-memory fallback"}`);
});