/**
 * services/supabaseService.js
 * Handles all reads and writes to the Supabase Postgres database.
 *
 * Database schema (create these tables in Supabase before week 4):
 *
 *   TABLE users
 *     id          uuid primary key default gen_random_uuid()
 *     email       text not null unique
 *     created_at  timestamptz default now()
 *
 *   TABLE scans
 *     id          uuid primary key default gen_random_uuid()
 *     user_id     uuid references users(id)        -- null for guest scans
 *     repo_url    text not null
 *     owner       text not null
 *     repo        text not null
 *     status      text not null default 'queued'   -- queued|running|complete|failed
 *     summary     text                              -- AI-generated summary (week 9)
 *     tdd_ratio   int                              -- 0-100, null if inconclusive
 *     created_at  timestamptz default now()
 *
 *   TABLE findings
 *     id          uuid primary key default gen_random_uuid()
 *     scan_id     uuid references scans(id) on delete cascade
 *     category    text not null   -- unit_test|code_quality|dependency|security|tdd
 *     severity    text not null   -- pass|info|warn|fail
 *     message     text not null
 *     detail      text
 *     file_path   text
 *     line_number int
 *     created_at  timestamptz default now()
 *
 * Row Level Security:
 *   Enable RLS on all three tables.
 *   Policy on scans: users can only read their own rows (user_id = auth.uid()).
 *   Policy on findings: users can read findings where scan_id belongs to their scans.
 */

const { createClient } = require("@supabase/supabase-js");

// Initialised lazily so the server starts even if env vars are missing
// (useful for week 3 where we test without a real Supabase connection).
let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env");
    }
    _client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return _client;
}

/**
 * createScan
 * Inserts a new row into the scans table with status "queued".
 * Returns the created row.
 */
async function createScan({ scanId, userId, repoUrl, owner, repo }) {
  const db = getClient();
  const { data, error } = await db
    .from("scans")
    .insert({
      id: scanId,
      user_id: userId || null,
      repo_url: repoUrl,
      owner,
      repo,
      status: "queued",
    })
    .select()
    .single();

  if (error) throw new Error(`createScan failed: ${error.message}`);
  return data;
}

/**
 * updateScanStatus
 * Updates the status column (and optionally the summary) for a scan row.
 */
async function updateScanStatus(scanId, status, summary = null) {
  const db = getClient();
  const update = { status };
  if (summary) update.summary = summary;

  const { error } = await db.from("scans").update(update).eq("id", scanId);
  if (error) throw new Error(`updateScanStatus failed: ${error.message}`);
}

/**
 * saveFindings
 * Bulk-inserts an array of finding objects into the findings table.
 */
async function saveFindings(scanId, findings) {
  if (!findings || findings.length === 0) return;
  const db = getClient();

  const rows = findings.map((f) => ({
    scan_id: scanId,
    category: f.category,
    severity: f.severity,
    message: f.message,
    detail: f.detail || null,
    file_path: f.file_path || null,
    line_number: f.line_number || null,
  }));

  const { error } = await db.from("findings").insert(rows);
  if (error) throw new Error(`saveFindings failed: ${error.message}`);
}

/**
 * getScanById
 * Returns the scan row and all its findings joined together.
 */
async function getScanById(scanId) {
  const db = getClient();

  const { data: scan, error: scanErr } = await db
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .single();

  if (scanErr) throw new Error(`getScanById failed: ${scanErr.message}`);

  const { data: findings, error: findErr } = await db
    .from("findings")
    .select("*")
    .eq("scan_id", scanId)
    .order("created_at", { ascending: true });

  if (findErr) throw new Error(`getFindings failed: ${findErr.message}`);

  return { ...scan, findings };
}

module.exports = { createScan, updateScanStatus, saveFindings, getScanById };
