/**
 * tddDetector.js  —  TDD Commit-Pattern & Structural Signal Detector (Week 5)
 *
 * Changes from Week 4:
 *   - Added isTestCommitByFiles(changedFiles) — checks whether a commit
 *     touched test file paths, not just keywords in the commit message.
 *     This catches commits that say "refactor auth" but only modified
 *     test files — they should still count as test commits.
 *   - Updated analyse() to use EITHER keyword match OR file-path match:
 *       isTestCommit(msg) || isTestCommitByFiles(commit.files)
 *     Gives a more accurate TDD ratio, especially in teams that don't
 *     write verbose commit messages.
 */

// ── Keyword lists ─────────────────────────────────────────────────────────────

const TEST_KEYWORDS = [
  'test', 'spec', 'tdd', 'bdd', 'unit test', 'integration test',
  'add test', 'write test', 'failing test', 'red green', 'assert',
  'describe(', 'it(', 'expect(', 'should ', 'jest', 'mocha', 'pytest',
  'vitest', 'cypress', 'coverage', 'fixture', 'mock', 'stub'
];

const CODE_KEYWORDS = [
  'implement', 'add', 'create', 'build', 'develop', 'feat', 'feature',
  'fix', 'bug', 'refactor', 'update', 'improve', 'enhance', 'change',
  'init', 'initial', 'setup', 'config', 'wip'
];

// ── Test file path patterns ───────────────────────────────────────────────────
// These are used for both structural signal and isTestCommitByFiles.

const TEST_PATH_PATTERNS = [
  /\/(tests?|__tests?__|spec|specs)\//i,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /test_.*\.py$/,
  /.*_test\.py$/,
  /\.test\.js$/,
  /\.spec\.js$/,
  /conftest\.py$/,
  /test_/i
];

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Returns true if the commit message contains test-related keywords.
 */
function isTestCommit(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return TEST_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * NEW in Week 5 — Returns true if ANY of the files changed in a commit
 * match test file path patterns. This catches test commits whose messages
 * don't use testing vocabulary.
 *
 * @param {string[]} changedFiles - array of file paths changed in the commit
 */
function isTestCommitByFiles(changedFiles) {
  if (!changedFiles || !Array.isArray(changedFiles) || changedFiles.length === 0) {
    return false;
  }
  return changedFiles.some(filePath =>
    TEST_PATH_PATTERNS.some(pattern => pattern.test(filePath))
  );
}

/**
 * Returns true if the commit message looks like an implementation commit.
 */
function isCodeCommit(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return CODE_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Returns true if a file path belongs to a test file (for structural signal).
 */
function isTestFilePath(filePath) {
  return TEST_PATH_PATTERNS.some(p => p.test(filePath));
}

// ── Main analysis function ────────────────────────────────────────────────────

/**
 * Analyses commits and file tree for TDD signals.
 *
 * @param {Array}    commits  - commit objects from GitHub API (newest-first from API)
 * @param {string[]} fileTree - all file paths in the repo
 * @returns {Object} TDD analysis result
 */
function analyse(commits, fileTree) {

  // ── Structural signal (independent of commit messages) ──
  const testFiles = fileTree.filter(isTestFilePath);
  const totalFiles = fileTree.filter(f => !/node_modules|\.git|vendor/.test(f)).length;
  const testFileRatio = totalFiles > 0
    ? Math.round((testFiles.length / totalFiles) * 100) / 100
    : 0;

  const structuralSignal = {
    hasTestDirectory: fileTree.some(f => /\/(tests?|__tests?__|spec|specs)\//i.test(f)),
    testFileCount:    testFiles.length,
    testFileRatio
  };

  // ── Commit-order fix: GitHub returns newest-first; reverse to chronological ──
  const chronological = [...commits].reverse();

  if (chronological.length < 3) {
    return {
      category: 'info',
      severity: 'info',
      tddRatio: 0,
      message: 'Not enough commit history to evaluate TDD patterns.',
      detail: `Only ${chronological.length} commits found. Need at least 3 for meaningful analysis.`,
      structuralSignal
    };
  }

  // ── TDD ratio calculation ──
  // For each implementation commit, check if a test commit appeared within
  // the previous 5 commits (5-commit lookback window).
  // Week 5: a commit counts as a test commit if keyword match OR file-path match.

  const LOOKBACK = 5;
  let implementationCommitCount = 0;
  let tddPairedCount = 0;

  for (let i = 0; i < chronological.length; i++) {
    const commit = chronological[i];
    const message = commit.commit?.message || commit.message || '';
    const changedFiles = commit.files || commit.changedFiles || [];

    if (!isCodeCommit(message)) continue;
    implementationCommitCount++;

    // Look back up to LOOKBACK commits
    const lookbackStart = Math.max(0, i - LOOKBACK);
    const window = chronological.slice(lookbackStart, i);

    const hasPrecedingTest = window.some(prev => {
      const prevMsg   = prev.commit?.message || prev.message || '';
      const prevFiles = prev.files || prev.changedFiles || [];
      // Week 5: EITHER keyword match OR file-path match counts
      return isTestCommit(prevMsg) || isTestCommitByFiles(prevFiles);
    });

    if (hasPrecedingTest) tddPairedCount++;
  }

  const tddRatio = implementationCommitCount > 0
    ? Math.round((tddPairedCount / implementationCommitCount) * 100)
    : 0;

  // ── Categorise result ──
  let category, severity, message, detail;

  if (tddRatio >= 60) {
    category = 'pass';
    severity = 'pass';
    message  = `Strong TDD signal detected — ${tddRatio}% of implementation commits were preceded by a test commit.`;
    detail   = `${tddPairedCount} of ${implementationCommitCount} implementation commits had a test commit within the ${LOOKBACK}-commit lookback window.`;
  } else if (tddRatio >= 30) {
    category = 'warning';
    severity = 'warn';
    message  = `Moderate TDD signal — ${tddRatio}% of implementation commits were preceded by a test commit.`;
    detail   = `${tddPairedCount} of ${implementationCommitCount} implementation commits had a test commit within the ${LOOKBACK}-commit lookback window. Consider writing tests before code more consistently.`;
  } else {
    category = 'info';
    severity = 'info';
    message  = `Weak TDD signal — ${tddRatio}% of implementation commits were preceded by a test commit.`;
    detail   = `Only ${tddPairedCount} of ${implementationCommitCount} implementation commits had a test commit within the ${LOOKBACK}-commit lookback window.`;
  }

  return {
    category,
    severity,
    tddRatio,
    message,
    detail,
    totalCommits: chronological.length,
    implementationCommits: implementationCommitCount,
    tddPairedCommits: tddPairedCount,
    structuralSignal
  };
}

module.exports = {
  analyse,
  isTestCommit,
  isTestCommitByFiles,   // exported so it can be unit-tested in diagnostics
  isCodeCommit,
  isTestFilePath
};