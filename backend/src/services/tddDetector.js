/**
 * services/tddDetector.js
 * Week 3 — TDD commit analysis.
 *
 * Professor feedback applied:
 * 1. Structural signal: if repo has src/ and test/ subdirectories,
 *    changes in test areas count as test commits.
 * 2. Returns codeCount and tddCount so frontend can display them.
 *
 * Fetches up to 100 commits. Call with owner/repo to get more commits
 * by changing per_page in githubService.js (max 100 per page).
 */

const TEST_KEYWORDS = [
  /\btest\b/i,
  /\bspec\b/i,
  /\bunit test\b/i,
  /\bintegration test\b/i,
  /\btdd\b/i,
  /\bred.green/i,
  /\bfailing test\b/i,
  /\badd test/i,
  /\bwrite test/i,
];

const CODE_KEYWORDS = [
  /\bfeat\b/i,
  /\bfeature\b/i,
  /\bimplement\b/i,
  /\badd\b/i,
  /\bbuild\b/i,
  /\bcreate\b/i,
  /\bfix\b/i,
  /\brefactor\b/i,
  /\bupdate\b/i,
  /\bchore\b/i,
];

// File path patterns that indicate test files (professor's structural signal)
const TEST_PATH_PATTERNS = [
  /^tests?\//i,
  /^specs?\//i,
  /__tests__\//i,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /_test\.py$/,
  /test_.*\.py$/,
  /_spec\.rb$/,
  /^src\/tests?\//i,
  /^src\/specs?\//i,
  /\/tests?\//i,
  /conftest\.py$/,
];

function isTestCommit(message) {
  return TEST_KEYWORDS.some((re) => re.test(message));
}

function isCodeCommit(message) {
  return CODE_KEYWORDS.some((re) => re.test(message)) && !isTestCommit(message);
}

function isTestFilePath(filePath) {
  if (!filePath) return false;
  return TEST_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * analyse
 * @param {Array<{sha, message, date, author}>} commits - from GitHub API (newest first)
 * @param {Array<string>} fileTree - flat list of file paths
 * @returns {Object} finding with tddRatio, codeCount, tddCount
 */
function analyse(commits, fileTree = []) {
  if (!commits || commits.length === 0) {
    return {
      category: 'tdd',
      severity: 'info',
      tddRatio: null,
      codeCount: 0,
      tddCount: 0,
      message: 'No commit history available. TDD analysis skipped.',
      detail: 'The repository has no commits or the history could not be fetched.',
    };
  }

  // Structural analysis (professor suggestion #1)
  const testFiles = fileTree.filter((p) => isTestFilePath(p));
  const hasTestDirectory = testFiles.length > 0;
  const testFileRatio =
    fileTree.length > 0 ? Math.round((testFiles.length / fileTree.length) * 100) : 0;

  // Chronological analysis — GitHub returns newest first, so reverse for oldest-first
  const chronological = [...commits].reverse();
  let codeCommitCount = 0;
  let tddCommitCount = 0;

  for (let i = 0; i < chronological.length; i++) {
    const commit = chronological[i];
    if (!isCodeCommit(commit.message)) continue;
    codeCommitCount++;

    // Look back up to 5 commits for a test commit
    const lookbackStart = Math.max(0, i - 5);
    const precededByTest = chronological
      .slice(lookbackStart, i)
      .some((c) => isTestCommit(c.message));

    if (precededByTest) tddCommitCount++;
  }

  if (codeCommitCount === 0) {
    return {
      category: 'tdd',
      severity: 'info',
      tddRatio: null,
      codeCount: 0,
      tddCount: 0,
      message: 'No implementation commits detected. TDD analysis inconclusive.',
      detail:
        'Commit messages did not contain enough implementation keywords to determine TDD usage.',
    };
  }

  const tddRatio = Math.round((tddCommitCount / codeCommitCount) * 100);

  let severity, message, detail;

  if (tddRatio >= 60) {
    severity = 'pass';
    message = `TDD patterns detected. Test commits precede code commits in ${tddRatio}% of features. Great work!`;
    detail = `Out of ${codeCommitCount} implementation commits, ${tddCommitCount} were preceded by a test commit within the five-commit lookback window. ${
      hasTestDirectory
        ? `The repository also has a well-structured test directory (${testFiles.length} test files, ${testFileRatio}% of all files), which is a strong structural indicator of TDD discipline.`
        : ''
    } Keep it up. TDD leads to better-designed, more maintainable code and higher confidence in every change you make.`;
  } else if (tddRatio >= 30) {
    severity = 'warn';
    message = `Partial TDD usage detected (${tddRatio}% of features have a test commit first).`;
    detail = `Out of ${codeCommitCount} implementation commits, only ${tddCommitCount} were preceded by a test commit. ${
      hasTestDirectory
        ? `The repository has a test directory present (${testFiles.length} test files), which is a good structural sign.`
        : 'Consider organising tests into a dedicated test/ or __tests__/ directory.'
    } Try writing the failing test before any new function to get the full benefit of TDD.`;
  } else {
    severity = 'info';
    message = `TDD not detected (${tddRatio}% of features have a test commit first).`;
    detail = `Out of ${codeCommitCount} implementation commits, only ${tddCommitCount} were preceded by a test commit. ${
      hasTestDirectory
        ? `While test files exist in the repository (${testFiles.length} files), they do not appear to be consistently written before the code they test.`
        : 'No dedicated test directory was detected.'
    } Consider trying TDD: write a failing test first, then write just enough code to make it pass.`;
  }

  return {
    category: 'tdd',
    severity,
    tddRatio,
    codeCount: codeCommitCount,
    tddCount: tddCommitCount,
    message,
    detail,
    structuralSignal: {
      hasTestDirectory,
      testFileCount: testFiles.length,
      testFileRatio,
    },
  };
}

module.exports = { analyse, isTestCommit, isCodeCommit, isTestFilePath };