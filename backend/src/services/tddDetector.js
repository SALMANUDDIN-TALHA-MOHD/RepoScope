/**
 * services/tddDetector.js
 * Analyses a repository's commit history to detect whether the team
 * is practising Test-Driven Development (TDD).
 *
 * How it works:
 *   TDD means writing tests BEFORE the code they test.
 *   In a commit history this shows up as test-related commits
 *   appearing shortly before feature/implementation commits.
 *
 *   We classify each commit as a "test commit" or a "code commit"
 *   by looking at keywords in the commit message, then calculate
 *   what percentage of features have a test commit that came first.
 *
 * Professor feedback addressed:
 *   "if there are test Commits prior to code Commits that could be
 *    an indication of TDD. You can then congratulate the repo owner
 *    for using TDD, or else encourage them to use it if it's not evident."
 */

// Keywords that strongly suggest a commit is adding or updating tests
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

// Keywords that suggest a commit is adding implementation / feature code
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
];

/**
 * isTestCommit
 * Returns true if the commit message contains test-related keywords.
 */
function isTestCommit(message) {
  return TEST_KEYWORDS.some((re) => re.test(message));
}

/**
 * isCodeCommit
 * Returns true if the commit message contains implementation keywords
 * AND is not also a test commit (to avoid double-counting).
 */
function isCodeCommit(message) {
  return CODE_KEYWORDS.some((re) => re.test(message)) && !isTestCommit(message);
}

/**
 * analyse
 * Takes the array of commits returned by githubService.fetchCommits()
 * (already sorted newest-first) and returns a finding object.
 *
 * Algorithm:
 *   - Reverse the array so we're reading oldest → newest (chronological order).
 *   - Slide a window: for each CODE commit, look back up to 5 commits
 *     to see if a TEST commit appeared before it.
 *   - Count how many code commits had a preceding test commit.
 *   - Express that as a TDD ratio.
 *
 * @param {Array<{sha, message, date, author}>} commits
 * @returns {{ category, severity, message, tddRatio, detail }}
 */
function analyse(commits) {
  if (!commits || commits.length === 0) {
    return {
      category: "tdd",
      severity: "info",
      message: "No commit history available — TDD analysis skipped.",
      tddRatio: null,
      detail: "The repository has no commits or the history could not be fetched.",
    };
  }

  // Oldest first for chronological analysis
  const chronological = [...commits].reverse();

  let codeCommitCount = 0;
  let tddCommitCount = 0;

  for (let i = 0; i < chronological.length; i++) {
    const commit = chronological[i];
    if (!isCodeCommit(commit.message)) continue;

    codeCommitCount++;

    // Look back up to 5 commits for a test commit that came before this one
    const lookbackStart = Math.max(0, i - 5);
    const precededByTest = chronological
      .slice(lookbackStart, i)
      .some((c) => isTestCommit(c.message));

    if (precededByTest) tddCommitCount++;
  }

  if (codeCommitCount === 0) {
    return {
      category: "tdd",
      severity: "info",
      message: "No implementation commits detected — TDD analysis inconclusive.",
      tddRatio: null,
      detail: "Commit messages did not contain enough feature/implementation keywords to determine TDD usage.",
    };
  }

  const tddRatio = Math.round((tddCommitCount / codeCommitCount) * 100);

  // ── Build the finding based on the ratio ──────────────────────────────
  if (tddRatio >= 60) {
    return {
      category: "tdd",
      severity: "pass",
      tddRatio,
      message: `TDD patterns detected — test commits precede code commits in ${tddRatio}% of features. Great work!`,
      detail: `Out of ${codeCommitCount} implementation commits, ${tddCommitCount} were preceded by a test commit. This is a strong indicator of Test-Driven Development. Keep it up — TDD leads to better-designed, more maintainable code and higher confidence in every change you make.`,
    };
  }

  if (tddRatio >= 30) {
    return {
      category: "tdd",
      severity: "warn",
      tddRatio,
      message: `Partial TDD usage detected (${tddRatio}% of features have a test commit first).`,
      detail: `Out of ${codeCommitCount} implementation commits, only ${tddCommitCount} were preceded by a test commit. You're on the right track! Try writing the failing test before any new function — even just one assertion — to get the full benefit of TDD.`,
    };
  }

  return {
    category: "tdd",
    severity: "info",
    tddRatio,
    message: `TDD not detected (${tddRatio}% of features have a test commit first).`,
    detail: `Out of ${codeCommitCount} implementation commits, only ${tddCommitCount} were preceded by a test commit. Consider trying TDD: write a failing test first, then write just enough code to make it pass. It leads to cleaner APIs, fewer bugs, and tests that actually document what the code is supposed to do.`,
  };
}

module.exports = { analyse };
