/**
 * Python language analyser module.
 *
 * Interface contract (every language module must export these three functions):
 *   canHandle(fileTree: string[]) => boolean
 *   extractFunctions(content: string) => string[]
 *   getTestPatterns() => RegExp[]
 */

/**
 * Returns true when the repo contains at least one Python file.
 */
function canHandle(fileTree) {
  return fileTree.some(f => f.endsWith('.py'));
}

/**
 * Extracts function and method names from Python source using regex.
 * Covers:
 *   def my_function(...)
 *   async def my_function(...)
 *   class methods indented at any depth
 *
 * A full Python AST would require shelling out to Python — this regex
 * approach handles the common 95% of cases and is fast.
 */
function extractFunctions(content) {
  const names = [];

  // Match `def <name>(` or `async def <name>(` at any indentation level
  const fnRegex = /^\s*(?:async\s+)?def\s+(\w+)\s*\(/gm;
  let match;

  while ((match = fnRegex.exec(content)) !== null) {
    const name = match[1];
    // Skip dunder methods (Python internals like __init__, __str__)
    if (!name.startsWith('__') || !name.endsWith('__')) {
      names.push(name);
    }
  }

  return [...new Set(names)]; // deduplicate
}

/**
 * Returns regex patterns that identify test files in a Python project.
 * Follows pytest and unittest conventions.
 */
function getTestPatterns() {
  return [
    /test_.*\.py$/,           // test_calculator.py
    /.*_test\.py$/,           // calculator_test.py
    /\/tests?\//i,            // tests/ or test/ directory
    /conftest\.py$/,          // pytest configuration
    /\/test_/                 // test_ prefix inside any directory
  ];
}

module.exports = { canHandle, extractFunctions, getTestPatterns };