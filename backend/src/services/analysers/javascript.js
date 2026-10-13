/**
 * JavaScript / TypeScript language analyser module.
 *
 * Interface contract (every language module must export these three functions):
 *   canHandle(fileTree: string[]) => boolean
 *   extractFunctions(content: string) => string[]
 *   getTestPatterns() => RegExp[]
 */

const parser = require('@babel/parser');

function canHandle(fileTree) {
  const IGNORE = /node_modules|vendor|\.git|\.min\.js|dist\//;

  const jsFiles  = fileTree.filter(f => /\.[jt]sx?$/.test(f) && !IGNORE.test(f)).length;
  if (jsFiles === 0) return false;

  const goFiles   = fileTree.filter(f => /\.go$/.test(f)   && !IGNORE.test(f)).length;
  const pyFiles   = fileTree.filter(f => /\.py$/.test(f)   && !IGNORE.test(f)).length;
  const javaFiles = fileTree.filter(f => /\.java$/.test(f) && !IGNORE.test(f)).length;
  const rbFiles   = fileTree.filter(f => /\.rb$/.test(f)   && !IGNORE.test(f)).length;
  const rsFiles   = fileTree.filter(f => /\.rs$/.test(f)   && !IGNORE.test(f)).length;
  const csFiles   = fileTree.filter(f => /\.cs$/.test(f)   && !IGNORE.test(f)).length;
  const phpFiles  = fileTree.filter(f => /\.php$/.test(f)  && !IGNORE.test(f)).length;
  const ktFiles   = fileTree.filter(f => /\.kt$/.test(f)   && !IGNORE.test(f)).length;

  const dominantOther = Math.max(goFiles, pyFiles, javaFiles, rbFiles, rsFiles, csFiles, phpFiles, ktFiles);

  if (dominantOther > jsFiles * 2) return false;

  const totalAnalysable = fileTree.filter(f => !IGNORE.test(f)).length;
  return totalAnalysable === 0 ? false : (jsFiles / totalAnalysable) >= 0.10;
}

function extractFunctions(content) {
  const names = [];

  let ast;
  try {
    ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
      errorRecovery: true
    });
  } catch {
    return names;
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDeclaration' && node.id) {
      names.push(node.id.name);
    }

    if (
      (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
      node.parent &&
      node.parent.type === 'VariableDeclarator' &&
      node.parent.id
    ) {
      names.push(node.parent.id.name);
    }

    if (node.type === 'ClassMethod' && node.key) {
      const name = node.key.name || node.key.value;
      if (name && name !== 'constructor') names.push(name);
    }

    if (node.type === 'ObjectMethod' && node.key) {
      const name = node.key.name || node.key.value;
      if (name) names.push(name);
    }

    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations || []) {
        if (
          decl.init &&
          (decl.init.type === 'ArrowFunctionExpression' ||
            decl.init.type === 'FunctionExpression') &&
          decl.id
        ) {
          names.push(decl.id.name);
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(c => {
          if (c && typeof c === 'object' && c.type) {
            c.parent = node;
            walk(c);
          }
        });
      } else if (child && typeof child === 'object' && child.type) {
        child.parent = node;
        walk(child);
      }
    }
  }

  walk(ast);
  return [...new Set(names)];
}

function getTestPatterns() {
  return [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /__tests__\//,
    /\/tests?\//i,
    /\.test\.js$/,
    /\.spec\.js$/
  ];
}

module.exports = { canHandle, extractFunctions, getTestPatterns };
