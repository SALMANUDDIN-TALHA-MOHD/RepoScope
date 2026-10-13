/**
 * Fallback language analyser module.
 *
 * This module is loaded last and accepts every file tree (canHandle always
 * returns true). It provides a graceful "not yet supported" response instead
 * of crashing when the coordinator encounters a language it doesn't have a
 * dedicated module for (Go, Java, Ruby, Rust, C++, etc.).
 *
 * Interface contract (every language module must export these three functions):
 *   canHandle(fileTree: string[]) => boolean
 *   extractFunctions(content: string) => string[]
 *   getTestPatterns() => RegExp[]
 *
 * Additional export for this module only:
 *   getMessage() => string   (human-readable explanation for the dashboard)
 */

/**
 * Always true — this is the catch-all last resort.
 */
function canHandle(fileTree) {
  return true;
}

/**
 * Returns an empty list. Deep AST parsing is not available for this language.
 * The structural signal (test directory presence) is still reported by
 * tddDetector.js independently, so the scan still has useful data.
 */
function extractFunctions(content) {
  return [];
}

/**
 * Generic test file patterns that apply broadly across languages.
 */
function getTestPatterns() {
  return [
    /test/i,   // any path containing "test"
    /spec/i,   // any path containing "spec"
    /_test\./,
    /test_/
  ];
}

/**
 * Message displayed on the dashboard when this fallback is used.
 */
function getMessage() {
  return 'Deep AST analysis is not yet available for this language. ' +
    'Structural test detection (test directories, test file naming) is still active.';
}

module.exports = { canHandle, extractFunctions, getTestPatterns, getMessage };