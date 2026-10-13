/**
 * scanOrchestrator.js  —  Pluggable checks registry coordinator (Week 5 refactor)
 *
 * Architecture change from Week 4:
 *   Before:  scanOrchestrator called tddDetector and testAnalyser directly
 *            (two hardcoded calls, not extensible)
 *
 *   After:   scanOrchestrator maintains a CHECKS_REGISTRY array.
 *            - Default checks (isDefault: true) run on every scan automatically.
 *            - Optional checks (isDefault: false) run only when explicitly requested.
 *
 * Adding a new check in the future = create one file in checks/, import it here,
 * push it to CHECKS_REGISTRY. Nothing else changes.
 *
 * Current registry:
 *   ✅ tdd          — default — TDD commit pattern + structural signal
 *   ✅ ast-coverage — default — AST-based function test coverage
 *   ☑  code-quality — optional — cyclomatic complexity (Week 5, user opt-in)
 *
 * Week 6+ additions will plug in here:
 *   ☑  dependency-audit — optional — known CVE check against NVD
 *   ☑  security         — optional — sensitive pattern / secret detection
 *   ☑  ai-summary       — optional — Gemini plain-English summary (Week 8)
 */

const https  = require('https');
const path   = require('path');

// ── Checks registry ───────────────────────────────────────────────────────────
const CHECKS_REGISTRY = [
  require('./checks/tddCheck'),
  require('./checks/astCoverage'),
  require('./checks/codeQuality')  // optional — isDefault: false
];

// ── GitHub helpers ────────────────────────────────────────────────────────────

function parseRepoUrl(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match) throw new Error('Invalid GitHub repository URL');
  return { owner: match[1], repo: match[2] };
}

const GH_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'RepoScope/1.0',
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {})
};

function fetchGitHubJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: GH_HEADERS }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`GitHub API error ${res.statusCode}: ${url}`));
          } else {
            resolve(JSON.parse(data));
          }
        } catch (e) {
          reject(new Error(`JSON parse error for ${url}: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ── File tree builder ─────────────────────────────────────────────────────────

async function buildFileTree(owner, repo, treeSha) {
  try {
    const data = await fetchGitHubJson(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`
    );
    return (data.tree || [])
      .filter(item => item.type === 'blob')
      .map(item => item.path);
  } catch {
    return [];
  }
}

// ── Content fetcher factory ───────────────────────────────────────────────────

function makeContentFetcher(owner, repo, sha) {
  const cache = {};
  return function getContent(filePath) {
    if (cache[filePath] !== undefined) return Promise.resolve(cache[filePath]);
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${encodeURIComponent(filePath)}`;
    return new Promise(resolve => {
      const req = https.get(url, { headers: GH_HEADERS }, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          const result = res.statusCode === 200 ? data : null;
          cache[filePath] = result;
          resolve(result);
        });
      });
      req.on('error', () => { cache[filePath] = null; resolve(null); });
      req.setTimeout(8000, () => { req.destroy(); cache[filePath] = null; resolve(null); });
    });
  };
}

// ── Diagnostic tests (engine unit tests — always test our code, not the repo) ─

function runDiagnostics(tddModule) {
  const { isTestCommit, isTestCommitByFiles, isCodeCommit, analyse } = tddModule;

  const tests = [
    {
      name: 'Test 1 — isTestCommit("add unit tests for login")',
      pass: isTestCommit('add unit tests for login') === true
    },
    {
      name: 'Test 2 — isTestCommit("implement user auth") returns false',
      pass: isTestCommit('implement user auth') === false
    },
    {
      name: 'Test 3 — TDD ratio 100% (test before implementation, chronological)',
      pass: (() => {
        // GitHub newest-first: index 0 is newest, last index is oldest
        // Chronological (after reverse): 'write tests' → 'implement' → 'write tests' → 'implement'
        const commits = [
          { message: 'implement payment logic' },   // newest (index 0)
          { message: 'write tests for payment' },   // middle
          { message: 'implement cart logic' },      // middle
          { message: 'write tests for cart' },      // oldest (last)
        ];
        const r = analyse(commits, []);
        return r.tddRatio === 100;
      })()
    },
    {
      name: 'Test 4 — TDD ratio 0% (implementation before test)',
      pass: (() => {
        const commits = [
          { message: 'write tests for auth' },      // newest (index 0)
          { message: 'write tests for login' },     // middle
          { message: 'implement auth' },            // middle
          { message: 'implement login' },           // oldest (last)
        ];
        const r = analyse(commits, []);
        return r.tddRatio === 0;
      })()
    },
    {
      name: 'Test 5 — isCodeCommit("implement payment gateway")',
      pass: isCodeCommit('implement payment gateway') === true
    },
    {
      name: 'Test 6 — isTestCommit("add unit tests") returns true',
      pass: isTestCommit('add unit tests') === true
    },
    {
      name: 'Test 7 — isTestCommitByFiles detects test file paths',
      pass: isTestCommitByFiles(['src/__tests__/calculator.test.js', 'src/utils.js']) === true
    },
    {
      name: 'Test 8 — isTestCommitByFiles returns false for non-test files',
      pass: isTestCommitByFiles(['src/index.js', 'src/routes/auth.js']) === false
    }
  ];

  return tests.map(t => ({ ...t, status: t.pass ? 'pass' : 'fail' }));
}

// ── Main orchestrator function ────────────────────────────────────────────────

/**
 * Runs all default checks (and any optional checks in requestedChecks) for a
 * given GitHub repository URL.
 *
 * @param {string}   repoUrl         - e.g. "https://github.com/facebook/react"
 * @param {string[]} requestedChecks - optional check names to add on top of defaults
 * @returns {Object}                 - full scan results object
 */
async function orchestrateScan(repoUrl, requestedChecks = []) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  // ── Fetch repo metadata ──
  const repoData = await fetchGitHubJson(
    `https://api.github.com/repos/${owner}/${repo}`
  );
  const defaultBranch = repoData.default_branch || 'main';

  // ── Fetch commits (2 pages = up to 200) ──
  const [page1, page2] = await Promise.all([
    fetchGitHubJson(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=1`
    ).catch(() => []),
    fetchGitHubJson(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=2`
    ).catch(() => [])
  ]);
  const commits = [...page1, ...page2];

  // ── Build file tree from the default branch's latest commit ──
  const latestSha = commits[0]?.sha || defaultBranch;
  const fileTree  = await buildFileTree(owner, repo, latestSha);
  const getContent = makeContentFetcher(owner, repo, latestSha);

  // ── Determine which checks to run ──
  const checksToRun = CHECKS_REGISTRY.filter(check =>
    check.isDefault || requestedChecks.includes(check.name)
  );

  // ── Run checks in parallel ──
  const checkResults = {};
  await Promise.all(
    checksToRun.map(async check => {
      try {
        checkResults[check.name] = await check.run(fileTree, getContent, { commits });
      } catch (err) {
        checkResults[check.name] = {
          checkName: check.name,
          error: err.message || 'Check failed'
        };
      }
    })
  );

  // ── Run diagnostics (always, independent of checks) ──
  const tddModule   = require('./tddDetector');
  const diagnostics = runDiagnostics(tddModule);

  // ── Assemble final result ──
  return {
    repoUrl,
    owner,
    repo,
    defaultBranch,
    scannedAt:    new Date().toISOString(),
    totalCommits: commits.length,
    totalFiles:   fileTree.length,

    // Individual check results
    tddAnalysis:     checkResults['tdd']          || null,
    astCoverage:     checkResults['ast-coverage'] || null,
    codeQuality:     checkResults['code-quality'] || null,   // null if not requested

    // Which checks ran
    checksRun: checksToRun.map(c => c.name),
    availableOptionalChecks: CHECKS_REGISTRY
      .filter(c => !c.isDefault)
      .map(c => ({ name: c.name, description: c.description })),

    // Engine diagnostics (always present)
    diagnostics,
    diagnosticsPassRate: Math.round(
      (diagnostics.filter(t => t.pass).length / diagnostics.length) * 100
    )
  };
}

module.exports = { orchestrateScan, CHECKS_REGISTRY };