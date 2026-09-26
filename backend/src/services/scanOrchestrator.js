/**
 * services/scanOrchestrator.js
 * Week 4 - coordinates the full analysis pipeline.
 */

const githubService  = require('./githubService');
const tddDetector    = require('./tddDetector');
const testAnalyser   = require('./testAnalyser');

function placeholder(category) {
  return {
    category,
    severity: 'info',
    message: `${category} analysis will be available in an upcoming release.`,
    file_path: null,
    line_number: null,
  };
}

async function runAll(scanId, owner, repo) {
  console.log(`[orchestrator] starting scan ${scanId} for ${owner}/${repo}`);

  const findings = [];
  let fileTree = [];
  let commits  = [];

  // Step 1: Fetch file tree
  try {
    fileTree = await githubService.fetchFileTree(owner, repo);
    console.log(`[orchestrator] fetched ${fileTree.length} files`);
  } catch (err) {
    console.error('[orchestrator] fetchFileTree failed:', err.message);
    findings.push({ category: 'system', severity: 'fail', message: `Could not fetch file tree: ${err.message}` });
  }

  // Step 2: Fetch commit history (up to 100)
  try {
    commits = await githubService.fetchCommits(owner, repo);
    console.log(`[orchestrator] fetched ${commits.length} commits`);
  } catch (err) {
    console.error('[orchestrator] fetchCommits failed:', err.message);
  }

  // Step 3: TDD Detection - professor suggestion: pass fileTree too
  try {
    const tddFinding = tddDetector.analyse(commits, fileTree);
    findings.push(tddFinding);
    console.log(`[orchestrator] TDD ratio: ${tddFinding.tddRatio ?? 'n/a'}% (code: ${tddFinding.codeCount}, tdd: ${tddFinding.tddCount})`);
  } catch (err) {
    console.error('[orchestrator] tddDetector failed:', err.message);
    findings.push({ category: 'tdd', severity: 'fail', message: 'TDD detection failed: ' + err.message });
  }

  // Step 4: AST Test Coverage
  try {
    const getContent = (path) => githubService.fetchFileContent(owner, repo, path);
    const framework = testAnalyser.detectTestFramework(fileTree);
    console.log(`[orchestrator] test framework detected: ${framework}`);
    const coverageFinding = await testAnalyser.findTestCoverage(fileTree, getContent);
    findings.push(coverageFinding);
    console.log(`[orchestrator] coverage: ${coverageFinding.coverage ?? 'n/a'}%`);
  } catch (err) {
    console.error('[orchestrator] testAnalyser failed:', err.message);
    findings.push({ category: 'unit_test', severity: 'info', message: 'AST coverage error: ' + err.message });
  }

  // Steps 5-7: Placeholders
  findings.push(placeholder('code_quality'));
  findings.push(placeholder('dependency'));
  findings.push(placeholder('security'));

  console.log(`[orchestrator] scan ${scanId} complete - ${findings.length} findings`);

  return {
    scanId,
    repoUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    findings,
    summary: {
      totalFiles:    fileTree.length,
      totalCommits:  commits.length,
      findingsCount: findings.length,
    },
    fileTree:      fileTree.slice(0, 100),
    // Send ALL commits so frontend TDD re-run is accurate
    recentCommits: commits,
  };
}

module.exports = { runAll };