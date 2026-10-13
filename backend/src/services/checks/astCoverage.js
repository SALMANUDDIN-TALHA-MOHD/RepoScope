/**
 * checks/astCoverage.js  —  Pluggable AST test coverage check
 *
 * Check interface (every check module must export this shape):
 *   name:        string
 *   description: string
 *   isDefault:   boolean
 *   run(fileTree, getContent, extras) => Promise<Object>
 */

const { findTestCoverage } = require('../testAnalyser');

module.exports = {
  name: 'ast-coverage',
  description: 'AST-based test coverage analysis (which functions have tests)',
  isDefault: true,

  async run(fileTree, getContent) {
    const result = await findTestCoverage(fileTree, getContent);
    return {
      checkName: 'ast-coverage',
      ...result
    };
  }
};