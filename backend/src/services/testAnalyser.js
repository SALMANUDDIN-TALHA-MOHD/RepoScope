/**
 * services/testAnalyser.js
 * Week 4 - AST-based test coverage analysis.
 *
 * Supports: JavaScript, TypeScript, Python (basic), Ruby (basic)
 * Uses @babel/parser for JS/TS AST analysis.
 */

let babelParser = null;
try {
  babelParser = require('@babel/parser');
} catch (_) {
  console.warn('[testAnalyser] @babel/parser not installed. Run: cd backend && npm install @babel/parser');
}

const FRAMEWORK_SIGNALS = [
  { name: 'jest',    files: ['jest.config.js', 'jest.config.ts', 'jest.config.mjs'] },
  { name: 'vitest',  files: ['vitest.config.js', 'vitest.config.ts', 'vite.config.js', 'vite.config.ts'] },
  { name: 'mocha',   files: ['.mocharc.js', '.mocharc.yml', '.mocharc.json', '.mocharc.cjs'] },
  { name: 'pytest',  files: ['pytest.ini', 'setup.cfg', 'pyproject.toml', 'conftest.py'] },
  { name: 'jasmine', files: ['jasmine.json', '.jasmine.json'] },
  { name: 'unittest', files: ['unittest.cfg'] },
];

function detectTestFramework(fileTree) {
  if (!fileTree || !fileTree.length) return 'unknown';
  const lower = fileTree.map(f => f.toLowerCase());
  for (const fw of FRAMEWORK_SIGNALS) {
    for (const signal of fw.files) {
      if (lower.some(f => f === signal || f.endsWith('/' + signal))) return fw.name;
    }
  }
  // Detect Python repos
  const hasPy = fileTree.some(f => f.endsWith('.py'));
  if (hasPy) return 'pytest';
  const hasTestDir = fileTree.some(f => /^tests?\//i.test(f) || /__tests__\//i.test(f));
  return hasTestDir ? 'unknown-js' : 'unknown';
}

// JS/TS file patterns
const JS_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const PY_EXTENSIONS = ['.py'];
const TEST_PATH_PATTERNS = [
  /^tests?\//i, /^specs?\//i, /__tests__\//i,
  /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/,
  /\/tests?\//i, /\/specs?\//i,
  /test_.*\.py$/, /.*_test\.py$/,
  /conftest\.py$/,
];

function isTestFile(path) { return TEST_PATH_PATTERNS.some(re => re.test(path)); }
function isJsSourceFile(path) { return JS_EXTENSIONS.some(ext => path.endsWith(ext)) && !isTestFile(path); }
function isPySourceFile(path) { return PY_EXTENSIONS.some(ext => path.endsWith(ext)) && !isTestFile(path); }

const BABEL_OPTIONS = {
  sourceType: 'unambiguous',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  errorRecovery: true,
  plugins: ['jsx','typescript','decorators-legacy','classProperties','classPrivateProperties','classPrivateMethods','dynamicImport','optionalChaining','nullishCoalescingOperator'],
};

function parseSourceFile(content) {
  if (!babelParser || !content || content.length > 500_000) return [];
  let ast;
  try { ast = babelParser.parse(content, BABEL_OPTIONS); } catch (_) { return []; }
  const names = new Set();
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration' && node.id?.name) names.add(node.id.name);
    if ((node.type === 'VariableDeclarator') && node.id?.type === 'Identifier' &&
        (node.init?.type === 'ArrowFunctionExpression' || node.init?.type === 'FunctionExpression'))
      names.add(node.id.name);
    if (node.type === 'ClassMethod' && node.key?.name && node.key.name !== 'constructor')
      names.add(node.key.name);
    if (node.type === 'ExportNamedDeclaration' && node.declaration) { walk(node.declaration); return; }
    for (const key of Object.keys(node)) {
      if (['type','start','end','loc'].includes(key)) continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === 'object' && child.type) walk(child);
    }
  }
  walk(ast.program);
  return [...names];
}

// Python: extract function/class names with regex (no full AST needed)
function parsePythonFile(content) {
  if (!content) return [];
  const names = new Set();
  const fnRe  = /^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gm;
  const clsRe = /^class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:(]/gm;
  let m;
  while ((m = fnRe.exec(content)) !== null) { if (!m[1].startsWith('_')) names.add(m[1]); }
  while ((m = clsRe.exec(content)) !== null) names.add(m[1]);
  return [...names];
}

async function findTestCoverage(fileTree, getContent) {
  const framework = detectTestFramework(fileTree);
  const isPython  = framework === 'pytest' || fileTree.some(f => f.endsWith('.py'));

  // Choose source files based on repo language
  const sourceFiles = isPython
    ? fileTree.filter(isPySourceFile).slice(0, 40)
    : fileTree.filter(isJsSourceFile).slice(0, 40);

  const testFiles = fileTree.filter(isTestFile).slice(0, 40);

  if (!babelParser && !isPython) {
    return {
      category: 'unit_test', severity: 'info',
      message: 'AST analysis skipped — @babel/parser not installed.',
      detail: `Framework detected: ${framework}. Run: cd backend && npm install @babel/parser`,
      untestedFunctions: [],
    };
  }

  if (!sourceFiles.length) {
    const allPy = fileTree.filter(f => f.endsWith('.py')).length;
    const allJs = fileTree.filter(f => JS_EXTENSIONS.some(e => f.endsWith(e))).length;
    return {
      category: 'unit_test', severity: 'info',
      message: `No analysable source files found. Repository has ${allPy} Python files and ${allJs} JS/TS files.`,
      detail: `Framework detected: ${framework}. AST analysis covers JS/TS files via @babel/parser and Python files via regex extraction.`,
      untestedFunctions: [],
      sourceFilesAnalysed: 0,
      testFilesAnalysed: testFiles.length,
      coverage: null,
    };
  }

  // Extract function names from source files
  const sourceFunctions = {};
  for (const path of sourceFiles) {
    try {
      const content = await getContent(path);
      if (!content) continue;
      const fns = isPython ? parsePythonFile(content) : parseSourceFile(content);
      for (const fn of fns) {
        if (!sourceFunctions[fn]) sourceFunctions[fn] = [];
        sourceFunctions[fn].push(path);
      }
    } catch (_) {}
  }

  // Collect all test content
  let testContent = '';
  for (const path of testFiles) {
    try {
      const content = await getContent(path);
      if (content) testContent += '\n' + content;
    } catch (_) {}
  }

  if (!testContent && testFiles.length === 0) {
    return {
      category: 'unit_test', severity: 'warn',
      message: 'No test files found in the repository.',
      detail: `Framework detected: ${framework}. Analysed ${sourceFiles.length} source files. No test directory or test files detected.`,
      untestedFunctions: Object.keys(sourceFunctions).slice(0, 20),
      sourceFilesAnalysed: sourceFiles.length,
      testFilesAnalysed: 0,
      coverage: 0,
    };
  }

  const untested = [], tested = [];
  for (const [fn] of Object.entries(sourceFunctions)) {
    if (fn.length < 3) continue;
    if (testContent.includes(fn)) tested.push(fn);
    else untested.push(fn);
  }

  const totalFns = tested.length + untested.length;
  const coverage = totalFns > 0 ? Math.round((tested.length / totalFns) * 100) : 0;
  const severity = coverage >= 70 ? 'pass' : coverage >= 40 ? 'warn' : 'info';

  return {
    category: 'unit_test', severity,
    message: `AST coverage: ${coverage}% of functions referenced in test files (${tested.length}/${totalFns}).`,
    detail: `Framework detected: ${framework}. Analysed ${sourceFiles.length} source files and ${testFiles.length} test files. ${untested.length} functions appear untested: ${untested.slice(0, 10).join(', ')}${untested.length > 10 ? '...' : ''}.`,
    untestedFunctions: untested.slice(0, 20),
    testedFunctions: tested.slice(0, 20),
    coverage,
    sourceFilesAnalysed: sourceFiles.length,
    testFilesAnalysed: testFiles.length,
  };
}

module.exports = { detectTestFramework, parseSourceFile, findTestCoverage };