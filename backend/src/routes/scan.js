/**
 * routes/scan.js
 * POST /api/scan  — validates URL, creates scan record, starts pipeline
 * GET  /api/scan/:id — returns scan status and findings
 */

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const scanOrchestrator = require("../services/scanOrchestrator");
const supabaseService = require("../services/supabaseService");

const router = express.Router();

// Always keep an in-memory store as fallback
const memStore = {};

const useSupabase =
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_URL !== "https://placeholder.supabase.co" &&
  process.env.SUPABASE_SERVICE_KEY &&
  process.env.SUPABASE_SERVICE_KEY !== "placeholder";

function validateRepoUrl(raw) {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.replace(/^\//, "").split("/");
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

// ── POST /api/scan ─────────────────────────────────────────
router.post("/scan", async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl is required" });
  }

  const parsed = validateRepoUrl(repoUrl);
  if (!parsed) {
    return res.status(400).json({
      error: "Invalid GitHub URL. Expected: https://github.com/owner/repo",
    });
  }

  const scanId = uuidv4();

  // Always store in memory first
  memStore[scanId] = {
    scanId,
    status: "running",
    repoUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
    owner: parsed.owner,
    repo: parsed.repo,
    createdAt: new Date().toISOString(),
    findings: [],
  };

  // Try Supabase too (but don't fail if it doesn't work)
  if (useSupabase) {
    try {
      await supabaseService.createScan(scanId, parsed.owner, parsed.repo);
    } catch (err) {
      console.error("[scan] createScan failed, using memory fallback:", err.message);
    }
  }

  console.log(`[scan] started ${scanId} for ${parsed.owner}/${parsed.repo}`);

  // Run pipeline in background
  setImmediate(async () => {
    try {
      const results = await scanOrchestrator.runAll(scanId, parsed.owner, parsed.repo);

      // Always save to memory
      memStore[scanId] = {
        ...memStore[scanId],
        ...results,
        status: "complete",
        completedAt: new Date().toISOString(),
      };

      // Try Supabase too
      if (useSupabase) {
        try {
          await supabaseService.saveFindings(scanId, results);
        } catch (dbErr) {
          console.error("[scan] saveFindings failed (memory has results):", dbErr.message);
        }
      }

      console.log(`[scan] ${scanId} complete`);
    } catch (err) {
      console.error(`[scan] pipeline error for ${scanId}:`, err.message);
      memStore[scanId] = { ...memStore[scanId], status: "error", error: err.message };
    }
  });

  return res.status(202).json({ scanId, status: "running" });
});

// ── GET /api/scan/:id ──────────────────────────────────────
router.get("/scan/:id", async (req, res) => {
  const { id } = req.params;

  // Check memory first — fastest and most reliable
  if (memStore[id]) {
    return res.json(memStore[id]);
  }

  // Try Supabase as fallback
  if (useSupabase) {
    try {
      const scan = await supabaseService.getScanById(id);
      if (scan) return res.json(scan);
    } catch (err) {
      console.error("[scan] getScanById error:", err.message);
    }
  }

  return res.status(404).json({ error: "Scan not found" });
});

module.exports = router;