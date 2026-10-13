/**
 * checks/codeQuality.js  —  Code Quality: Complexity, Smells & Duplicate Detection (Week 5)
 *
 * Three analyses per your Week 5 spec:
 *
 *   1. calcCyclomaticComplexity(ast)
 *      Counts decision points: if/else, for, while, switch case, ternary, &&/||
 *      Score = count + 1.  Thresholds: 1–5 simple · 6–10 moderate · 11+ complex
 *
 *   2. detectSmells(ast)
 *      Flags: functions > 50 lines · functions with > 4 params · if/else nested > 3 levels deep
 *
 *   3. findDuplicates(files)
 *      Normalises each file (strips whitespace+comments), splits into 8-line blocks,
 *      hashes each block, finds hashes appearing in > 1 file
 */

const crypto = require('crypto');
const parser = require('@babel/parser');

module.exports = {
  name: 'code-quality',
  description: 'Cyclomatic complexity, code smells, and duplicate block detection',
  isDefault: true,   // runs on every scan

  async run(fileTree, getContent) {
    const JS_TS_EXT = /\.[jt]sx?$/;
    const IGNORE    = /node_modules|vendor|\.git|\.min\.js|dist\//;

    const sourceFiles = fileTree.filter(f =>
      JS_TS_EXT.test(f) && !IGNORE.test(f)
    );

    const capped = sourceFiles.slice(0, 60); // cap at 60 files

    // ── 1. Load file contents ──────────────────────────────────────────────────
    const fileContents = {};
    await Promise.all(
      capped.map(async f => {
        const content = await getContent(f);
        if (content) fileContents[f] = content;
      })
    );

    // ── 2. Per-file complexity + smells ───────────────────────────────────────
    const allFunctions   = [];  // { name, file, complexity, lines, params }
    const allSmells      = [];  // { file, type, detail }

    for (const [filePath, content] of Object.entries(fileContents)) {
      const { functions, smells } = analyseFile(content, filePath);
      allFunctions.push(...functions);
      allSmells.push(...smells);
    }

    // ── 3. Complexity buckets ─────────────────────────────────────────────────
    const simple   = allFunctions.filter(f => f.complexity <= 5);
    const moderate = allFunctions.filter(f => f.complexity >= 6 && f.complexity <= 10);
    const complex  = allFunctions.filter(f => f.complexity >= 11);
    complex.sort((a, b) => b.complexity - a.complexity);

    const totalFunctions = allFunctions.length;
    const totalComplexity = allFunctions.reduce((s, f) => s + f.complexity, 0);
    const avgComplexity = totalFunctions > 0
      ? Math.round((totalComplexity / totalFunctions) * 10) / 10
      : 0;

    // ── 4. Duplicate detection ────────────────────────────────────────────────
    const duplicates = findDuplicates(fileContents);

    return {
      checkName:        'code-quality',

      // Complexity
      avgComplexity,
      totalFunctions,
      filesAnalysed:    capped.length,
      simple:           simple.length,
      moderate:         moderate.length,
      complex:          complex.length,
      complexFunctions: complex.slice(0, 20),
      overallRating:    overallRating(avgComplexity, complex.length, totalFunctions),

      // Smells
      smells:           allSmells,
      smellCount:       allSmells.length,
      smellsByType:     groupBy(allSmells, 'type'),

      // Duplicates
      duplicateBlocks:  duplicates,
      duplicateCount:   duplicates.length
    };
  }
};

// ── File analyser ─────────────────────────────────────────────────────────────

function analyseFile(content, filePath) {
  const functions = [];
  const smells    = [];

  try {
    const ast = parser.parse(content, {
      sourceType:    'module',
      plugins:       ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
      errorRecovery: true
    });

    walkAST(ast, node => {
      const fnInfo = extractFunctionInfo(node, content, filePath);
      if (!fnInfo) return;

      const { name, lines, params } = fnInfo;
      const complexity = calcCyclomaticComplexity(node);

      functions.push({ name, file: filePath, complexity, lines, params });

      // ── Smell: too many lines ──
      if (lines > 50) {
        smells.push({
          file:   filePath,
          type:   'long-function',
          detail: `"${name}" is ${lines} lines (limit: 50)`
        });
      }

      // ── Smell: too many params ──
      if (params > 4) {
        smells.push({
          file:   filePath,
          type:   'too-many-params',
          detail: `"${name}" has ${params} parameters (limit: 4)`
        });
      }
    });

    // ── Smell: deep nesting ──
    const deepNests = detectDeepNesting(ast, filePath, content);
    smells.push(...deepNests);

  } catch {
    // If AST fails, use regex fallback for complexity only
    const complexity = regexComplexity(content);
    functions.push({
      name:       filePath.split('/').pop(),
      file:       filePath,
      complexity,
      lines:      content.split('\n').length,
      params:     0
    });
  }

  return { functions, smells };
}

// ── calcCyclomaticComplexity ──────────────────────────────────────────────────
/**
 * Counts decision points within a function node.
 * Complexity = 1 (base) + 1 per branching point.
 * Branching: if · else if · for · while · do-while · switch case · catch · ternary · && · ||
 */
function calcCyclomaticComplexity(fnNode) {
  const BRANCHING = new Set([
    'IfStatement',
    'ConditionalExpression',          // ternary
    'ForStatement',
    'ForInStatement',
    'ForOfStatement',
    'WhileStatement',
    'DoWhileStatement',
    'SwitchCase',
    'CatchClause',
    'LogicalExpression'               // && / ||
  ]);

  let score = 1;
  walkAST(fnNode, n => {
    if (n !== fnNode && BRANCHING.has(n.type)) score++;
  });
  return score;
}

// ── detectSmells — deep nesting ───────────────────────────────────────────────
/**
 * Finds if/else blocks nested more than 3 levels deep.
 * Returns array of smell objects.
 */
function detectDeepNesting(ast, filePath, content) {
  const smells = [];
  const lines  = content.split('\n');

  function walk(node, depth) {
    if (!node || typeof node !== 'object') return;

    let nextDepth = depth;
    if (node.type === 'IfStatement') {
      nextDepth = depth + 1;
      if (nextDepth > 3) {
        const line = node.loc?.start?.line ?? '?';
        smells.push({
          file:   filePath,
          type:   'deep-nesting',
          detail: `Nesting depth ${nextDepth} at line ${line} (limit: 3)`
        });
        return; // don't double-count children of this offender
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(c => { if (c && c.type) walk(c, nextDepth); });
      } else if (child && typeof child === 'object' && child.type) {
        walk(child, nextDepth);
      }
    }
  }

  walk(ast, 0);
  return smells;
}

// ── findDuplicates ────────────────────────────────────────────────────────────
/**
 * Normalises each file (strips whitespace + single/multi-line comments),
 * splits into 8-line blocks, hashes each block, finds hashes that appear
 * in more than one file.
 *
 * Returns array of { hash, block (first 3 lines preview), files[] }
 */
function findDuplicates(fileContents) {
  const BLOCK_SIZE = 8;
  const blockMap   = {};  // hash → Set of file paths

  for (const [filePath, raw] of Object.entries(fileContents)) {
    const normalised = normaliseSource(raw);
    const lines      = normalised.split('\n').filter(l => l.trim().length > 0);

    for (let i = 0; i <= lines.length - BLOCK_SIZE; i++) {
      const block   = lines.slice(i, i + BLOCK_SIZE).join('\n');
      if (block.trim().length < 20) continue; // skip trivially small blocks
      const hash    = md5(block);

      if (!blockMap[hash]) {
        blockMap[hash] = { files: new Set(), preview: lines.slice(i, i + 3).join('\n') };
      }
      blockMap[hash].files.add(filePath);
    }
  }

  // Only keep hashes seen in 2+ distinct files
  return Object.entries(blockMap)
    .filter(([, v]) => v.files.size > 1)
    .map(([hash, v]) => ({
      hash,
      preview: v.preview,
      files:   Array.from(v.files)
    }))
    .slice(0, 30);  // cap at 30 duplicate groups
}

function normaliseSource(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')     // block comments
    .replace(/\/\/.*/g, '')               // line comments
    .replace(/^\s+|\s+$/gm, '')           // leading/trailing whitespace per line
    .replace(/\s{2,}/g, ' ');            // collapse multiple spaces
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// ── Generic AST walker ────────────────────────────────────────────────────────

function walkAST(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'tokens') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach(c => { if (c && typeof c === 'object' && c.type) walkAST(c, visitor); });
    } else if (child && typeof child === 'object' && child.type) {
      walkAST(child, visitor);
    }
  }
}

// ── extractFunctionInfo ───────────────────────────────────────────────────────

function extractFunctionInfo(node, content, filePath) {
  const FN_TYPES = new Set([
    'FunctionDeclaration', 'FunctionExpression',
    'ArrowFunctionExpression', 'ClassMethod', 'ObjectMethod'
  ]);
  if (!FN_TYPES.has(node.type)) return null;

  let name = '(anonymous)';
  if (node.type === 'FunctionDeclaration' && node.id) {
    name = node.id.name;
  } else if (node.type === 'FunctionExpression' && node.id) {
    name = node.id.name;
  } else if (node.type === 'ClassMethod' || node.type === 'ObjectMethod') {
    name = node.key?.name || node.key?.value || '(method)';
    if (name === 'constructor') return null; // skip constructors
  }

  const params = (node.params || []).length;
  const start  = node.loc?.start?.line ?? 0;
  const end    = node.loc?.end?.line   ?? 0;
  const lines  = end - start + 1;

  return { name, lines, params };
}

// ── Fallback regex complexity ─────────────────────────────────────────────────

function regexComplexity(content) {
  const patterns = [
    /\bif\s*\(/g, /\belse\s+if\s*\(/g, /\bfor\s*\(/g,
    /\bwhile\s*\(/g, /\bcase\s+/g, /\bcatch\s*\(/g,
    /\?\s*[^:.\s]/g, /&&/g, /\|\|/g
  ];
  let count = 1;
  for (const pat of patterns) {
    const m = content.match(pat);
    if (m) count += m.length;
  }
  return count;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function overallRating(avg, complexCount, total) {
  const ratio = total > 0 ? complexCount / total : 0;
  if (avg <= 5  && ratio < 0.10) return 'excellent';
  if (avg <= 8  && ratio < 0.20) return 'good';
  if (avg <= 12 && ratio < 0.35) return 'moderate';
  return 'needs-improvement';
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}