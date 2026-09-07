/**
 * services/githubService.js
 * All communication with the GitHub REST API lives here.
 * Uses @octokit/rest so authentication and rate-limit handling
 * are handled by the library rather than raw fetch calls.
 *
 * Key functions:
 *   fetchFileTree(owner, repo)   → flat list of every file path in the repo
 *   fetchFileContent(owner, repo, path) → decoded text content of one file
 *   fetchCommits(owner, repo)    → array of commit objects (sha, message, date, author)
 */

const { Octokit } = require("@octokit/rest");

// Octokit is initialised once and reused across all requests.
// Without a token the rate limit is 60 requests/hour; with one it's 5,000.
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
});

/**
 * fetchFileTree
 * Returns a flat array of file path strings for every file in the repository.
 * Uses the Git Trees API with recursive=1 so a single request covers all directories.
 *
 * @param {string} owner  - GitHub username or org name
 * @param {string} repo   - Repository name
 * @returns {Promise<string[]>} - e.g. ["src/index.js", "tests/index.test.js", ...]
 */
async function fetchFileTree(owner, repo) {
  // Step 1: get the default branch's latest commit SHA
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  // Step 2: get the tree SHA for the HEAD of that branch
  const { data: branchData } = await octokit.repos.getBranch({
    owner,
    repo,
    branch: defaultBranch,
  });
  const treeSha = branchData.commit.commit.tree.sha;

  // Step 3: fetch the full recursive tree
  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "1",
  });

  // Return only blob (file) paths, not directory paths
  return treeData.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path);
}

/**
 * fetchFileContent
 * Returns the decoded text content of a single file.
 * Returns null if the file is binary or too large (>1 MB).
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} path  - file path within the repo, e.g. "src/index.js"
 * @returns {Promise<string|null>}
 */
async function fetchFileContent(owner, repo, path) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (data.encoding !== "base64") return null;
    if (data.size > 1_000_000) return null; // skip files over 1 MB
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch (err) {
    // 404 means the file was in the tree but got deleted between calls — safe to skip
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * fetchCommits
 * Returns an array of simplified commit objects for the repository.
 * Fetches up to 100 commits from the default branch (enough for TDD analysis).
 *
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<Array<{sha, message, date, author}>>}
 */
async function fetchCommits(owner, repo) {
  const { data: commits } = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: 100,
  });

  return commits.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    date: c.commit.author.date,
    author: c.commit.author.name,
  }));
}

module.exports = { fetchFileTree, fetchFileContent, fetchCommits };
