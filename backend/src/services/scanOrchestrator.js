/**
 * services/scanOrchestrator.js
 * Coordinates the full analysis pipeline for one scan.
 *
 * Call order:
 *   1. Fetch the repository's file tree from GitHub
 *   2. Fetch the commit history (for TDD detection)
 *   3. Run each analysis service in parallel where possible
 *   4. Collect all findings
 *   5. (Week 8) Send findings to AI summary service
 *   6. (Week 4+) Persist everything to Supabase
 *
 * Each service that is not yet implemented returns a placeholder finding
 * so the overall pipeline works end-to-end from week 3 onwards.
 */

const githubService = require("./githubService");
const tddDetector = require("./tddDetector");

/**
 * placeholder
 * Returns a stub finding for services not yet implemented.
 * Replaced week by week as each service is built.
 */
function placeholder(category, weekDue) {
  return {
    category,
    severity: "info",
    message: `${category} analysis will be implemented in week ${weekDue}.`,
    file_path: null,
    line_number: null,
  };
}

/**
 * runAll
 * Main orchestration function. Called by the scan route after the scan
 * record is created. Runs the full pipeline and logs results.
 *
 * @param {string} scanId  - UUID for this scan
 * @param {string} owner   - GitHub repo owner
 * @param {string} repo    - GitHub repo name
 */
async function runAll(scanId, owner, repo) {
  console.log(`[orchestrator] starting scan ${scanId} for ${owner}/${repo}`);

  const findings = [];

  // ── Step 1: Fetch file tree ────────────────────────────────────────────
  let fileTree = [];
  try {
    fileTree = await githubService.fetchFileTree(owner, repo);
    console.log(`[orchestrator] fetched ${fileTree.length} files`);
  } catch (err) {
    console.error("[orchestrator] fetchFileTree failed:", err.message);
    findings.push({
      category: "system",
      severity: "fail",
      message: `Could not fetch repository file tree: ${err.message}`,
      file_path: null,
      line_number: null,
    });
  }

  // ── Step 2: Fetch commit history ───────────────────────────────────────
  let commits = [];
  try {
    commits = await githubService.fetchCommits(owner, repo);
    console.log(`[orchestrator] fetched ${commits.length} commits`);
  } catch (err) {
    console.error("[orchestrator] fetchCommits failed:", err.message);
  }

  // ── Step 3: TDD Detection (implemented — week 3) ───────────────────────
  try {
    const tddFinding = tddDetector.analyse(commits);
    findings.push(tddFinding);
    console.log(`[orchestrator] TDD ratio: ${tddFinding.tddRatio ?? "n/a"}%`);
  } catch (err) {
    console.error("[orchestrator] tddDetector failed:", err.message);
  }

  // ── Step 4: AST Test Coverage (week 4) ────────────────────────────────
  findings.push(placeholder("unit_test", 4));

  // ── Step 5: Code Quality (week 5) ─────────────────────────────────────
  findings.push(placeholder("code_quality", 5));

  // ── Step 6: Dependency Audit (week 6) ─────────────────────────────────
  findings.push(placeholder("dependency", 6));

  // ── Step 7: OWASP / Secret Scan (week 8) ──────────────────────────────
  findings.push(placeholder("security", 8));

  // ── Step 8: AI Summary (week 9) ───────────────────────────────────────
  // findings.push(await aiSummaryService.generate(findings));

  console.log(
    `[orchestrator] scan ${scanId} complete — ${findings.length} findings`
  );

  // ── Step 9: Persist to Supabase (week 4) ──────────────────────────────
  // await supabaseService.saveScan(scanId, findings);

  return { scanId, findings };
}

module.exports = { runAll };
