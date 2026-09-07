/**
 * routes/scan.js
 * Defines two endpoints:
 *   POST /api/scan  — accepts a GitHub repo URL, creates a scan record,
 *                     queues the analysis pipeline, returns the scan ID.
 *   GET  /api/scan/:id — returns the current status and findings for a scan.
 */

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const githubService = require("../services/githubService");
const supabaseService = require("../services/supabaseService");
const scanOrchestrator = require("../services/scanOrchestrator");

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * validateRepoUrl
 * Accepts only URLs that look like github.com/<owner>/<repo>
 * Returns { owner, repo } on success, null on failure.
 */
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

// ── POST /api/scan ─────────────────────────────────────────────────────────
router.post("/scan", async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl is required" });
  }

  const parsed = validateRepoUrl(repoUrl);
  if (!parsed) {
    return res.status(400).json({
      error: "Invalid GitHub URL. Expected format: github.com/owner/repo",
    });
  }

  const scanId = uuidv4();

  // Create a scan record in Supabase with status "queued"
  // (stubbed — will connect to real Supabase in week 4)
  console.log(`[scan] created scan ${scanId} for ${parsed.owner}/${parsed.repo}`);

  // Fire and forget — run the pipeline without blocking the HTTP response
  setImmediate(async () => {
    try {
      await scanOrchestrator.runAll(scanId, parsed.owner, parsed.repo);
    } catch (err) {
      console.error(`[scan] pipeline error for ${scanId}:`, err.message);
    }
  });

  return res.status(202).json({
    scanId,
    status: "queued",
    owner: parsed.owner,
    repo: parsed.repo,
    message: "Scan queued. Poll GET /api/scan/:id for results.",
  });
});

// ── GET /api/scan/:id ──────────────────────────────────────────────────────
router.get("/scan/:id", async (req, res) => {
  const { id } = req.params;

  // Stub — returns mock data so the frontend can be developed
  // against a real shape before Supabase is fully wired in week 4.
  const mockResult = {
    scanId: id,
    status: "complete",
    repoUrl: "github.com/example/demo-repo",
    summary:
      "The test suite is mostly healthy with 47 of 50 tests passing. One dependency has a known moderate-severity vulnerability with a fix available. No secrets were found in the commit history.",
    findings: [
      { category: "unit_test", severity: "warn", message: "3 tests failing in checkout module", file_path: "src/checkout.js", line_number: 42 },
      { category: "dependency", severity: "warn", message: "lodash@4.17.15 — prototype pollution (CVE-2019-10744)", file_path: "package.json", line_number: null },
      { category: "secret", severity: "pass", message: "No secrets detected in current files or commit history", file_path: null, line_number: null },
      { category: "api_security", severity: "warn", message: "POST /checkout returns raw stack trace on invalid input", file_path: "src/routes/checkout.js", line_number: 18 },
      { category: "tdd", severity: "pass", message: "TDD patterns detected — test commits precede code commits in 68% of features. Great work!", file_path: null, line_number: null },
    ],
  };

  return res.json(mockResult);
});

module.exports = router;
