/**
 * testAnalyser.js  —  AST Test Coverage Coordinator (Week 5 refactor)
 *
 * This file is now a thin coordinator. It no longer contains language-specific
 * parsing logic directly. Instead it:
 *   1. Loads all language modules from ./analysers/
 *   2. Picks the first one whose canHandle() returns true for the repo's file tree
 *   3. Falls back to fallback.js if no dedicated module matches (graceful degradation)
 *
 * Adding a new language in the future = drop one file in ./analysers/.
 * Nothing else needs to change.
 */

const path = require('path');

// ── Load language modules in priority order ──────────────────────────────────
// The coordinator tries them in this order. The FIRST one whose canHandle()
// returns true is used. fallback.js is always last (its canHandle returns true).
const ANALYSERS = [
  require('./analysers/javascript'),
  require('./analysers/python'),
  require('./analysers/fallback')   // catch-all — must be last
];

// ── Test framework detection ─────────────────────────────────────────────────

const FRAMEWORK_SIGNATURES = {
  jest:   ['jest.config.js', 'jest.config.ts', 'jest.config.mjs'],
  vitest: ['vitest.config.js', 'vitest.config.ts', 'vite.config.js'],
  mocha:  ['.mocharc.js', '.mocharc.yml', '.mocharc.json', 'mocha.opts'],
  pytest: ['pytest.ini', 'pyproject.toml', 'setup.cfg', 'conftest.py'],
  jasmine:['jasmine.json', '.jasmine.json']
};

function detectTestFramework(fileTree) {
  for (const [framework, files] of Object.entries(FRAMEWORK_SIGNATURES)) {
    if (files.some(sig => fileTree.some(f => f.endsWith(sig)))) {
      return framework;
    }
  }
  return 'unknown';
}

// ── Language detection helper ────────────────────────────────────────────────

/**
 * Counts file extensions in the tree and returns the primary language name.
 * Used for display purposes on the dashboard.
 */
function detectLanguage(fileTree) {
  const counts = {};
  for (const f of fileTree) {
    const ext = path.extname(f).toLowerCase();
    if (!ext) continue;
    counts[ext] = (counts[ext] || 0) + 1;
  }

  // Sort extensions by frequency
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topExt = sorted[0]?.[0];

  const EXT_TO_LANG = {
    '.js': 'JavaScript', '.jsx': 'JavaScript',
    '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.py': 'Python',
    '.go': 'Go',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.rs': 'Rust',
    '.cs': 'C#',
    '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++',
    '.c':  'C',
    '.php': 'PHP',
    '.kt': 'Kotlin',
    '.swift': 'Swift'
  };

  return EXT_TO_LANG[topExt] || topExt || 'Unknown';
}

// ── Main coverage analyser ────────────────────────────────────────────────────

/**
 * Analyses the repo file tree and returns AST coverage data.
 *
 * @param {string[]}  fileTree   - list of all file paths in the repo
 * @param {Function}  getContent - async (filePath) => string | null
 * @returns {Object}  coverage result object
 */
async function findTestCoverage(fileTree, getContent) {
  const framework = detectTestFramework(fileTree);
  const language  = detectLanguage(fileTree);

  // Pick the right analyser
  const analyser = ANALYSERS.find(a => a.canHandle(fileTree));

  // If fallback was selected, report graceful degradation
  const usingFallback = analyser === ANALYSERS[ANALYSERS.length - 1];
  const fallbackMessage = usingFallback && analyser.getMessage
    ? analyser.getMessage()
    : null;

  const testPatterns = analyser.getTestPatterns();

  // Separate source files from test files
  const sourceFiles = fileTree.filter(f => {
    const isTest = testPatterns.some(p => p.test(f));
    const isConfig = /\.(json|md|yaml|yml|lock|toml|txt|env|gitignore)$/.test(f);
    const isVendor = /node_modules|vendor|\.git/.test(f);
    return !isTest && !isConfig && !isVendor;
  });

  const testFiles = fileTree.filter(f =>
    testPatterns.some(p => p.test(f)) &&
    !/node_modules|vendor|\.git/.test(f)
  );

  // Extract all function names from source files
  const sourceFunctions = [];
  for (const filePath of sourceFiles.slice(0, 60)) { // cap at 60 files for speed
    const content = await getContent(filePath);
    if (!content) continue;
    const fns = analyser.extractFunctions(content);
    for (const fn of fns) {
      sourceFunctions.push({ name: fn, file: filePath });
    }
  }

  // Extract all function names referenced in test files
  const testedNames = new Set();
  for (const filePath of testFiles.slice(0, 30)) {
    const content = await getContent(filePath);
    if (!content) continue;
    // For all languages: extract function names from test files using the analyser
    // and also do a simple text search for function calls
    const fns = analyser.extractFunctions(content);
    fns.forEach(fn => testedNames.add(fn));

    // Additionally scan test file content for any function name from source files
    // This catches patterns like expect(calculateTotal(...)) or describe('calculateTotal')
    for (const { name } of sourceFunctions) {
      if (content.includes(name)) testedNames.add(name);
    }
  }

  // Categorise functions
  const tested   = sourceFunctions.filter(f => testedNames.has(f.name));
  const untested = sourceFunctions.filter(f => !testedNames.has(f.name));
  const totalFns = sourceFunctions.length;
  const coverage = totalFns > 0
    ? Math.round((tested.length / totalFns) * 100)
    : 0;

  return {
    framework,
    language,
    analyserUsed:  usingFallback ? 'fallback' : 'ast',
    fallbackMessage,
    totalFunctions: totalFns,
    testedCount:    tested.length,
    untestedCount:  untested.length,
    coveragePercent: coverage,
    testedFunctions:   tested.map(f => f.name),
    untestedFunctions: untested.map(f => f.name),
    testFileCount:  testFiles.length,
    sourceFileCount: sourceFiles.length
  };
}

module.exports = { findTestCoverage, detectTestFramework, detectLanguage };