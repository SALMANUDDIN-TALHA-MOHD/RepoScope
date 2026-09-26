/**
 * services/githubService.js
 * All communication with the GitHub REST API.
 * Uses @octokit/rest for authentication and rate-limit handling.
 *
 * fetchFileTree  - flat list of every file path in the repo
 * fetchFileContent - decoded text of one file
 * fetchCommits   - up to 200 commits (2 pages x 100)
 */

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
});

/**
 * fetchFileTree
 * Returns a flat array of file path strings.
 */
async function fetchFileTree(owner, repo) {
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: branchData } = await octokit.repos.getBranch({
    owner, repo, branch: defaultBranch,
  });
  const treeSha = branchData.commit.commit.tree.sha;

  const { data: treeData } = await octokit.git.getTree({
    owner, repo, tree_sha: treeSha, recursive: '1',
  });

  return treeData.tree
    .filter((item) => item.type === 'blob')
    .map((item) => item.path);
}

/**
 * fetchFileContent
 * Returns decoded text content of a single file.
 * Returns null if binary or too large (>1 MB).
 */
async function fetchFileContent(owner, repo, path) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (data.encoding !== 'base64') return null;
    if (data.size > 1_000_000) return null;
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * fetchCommits
 * Returns up to 200 commits (2 pages x 100) from the default branch.
 * More commits = more accurate TDD analysis.
 * Each commit: { sha, message, date, author }
 */
async function fetchCommits(owner, repo) {
  const allCommits = [];

  // Fetch page 1 (commits 1-100)
  try {
    const { data: page1 } = await octokit.repos.listCommits({
      owner, repo, per_page: 100, page: 1,
    });
    allCommits.push(...page1);
  } catch (err) {
    console.error('[githubService] fetchCommits page 1 error:', err.message);
    return [];
  }

  // Fetch page 2 (commits 101-200) if page 1 was full
  if (allCommits.length === 100) {
    try {
      const { data: page2 } = await octokit.repos.listCommits({
        owner, repo, per_page: 100, page: 2,
      });
      allCommits.push(...page2);
    } catch (_) {
      // Page 2 failing is fine — use what we have
    }
  }

  return allCommits.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    date: c.commit.author.date,
    author: c.commit.author.name,
  }));
}

module.exports = { fetchFileTree, fetchFileContent, fetchCommits };