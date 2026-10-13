/**
 * checks/tddCheck.js  —  Pluggable TDD detection check
 *
 * Check interface (every check module must export this shape):
 *   name:        string
 *   description: string
 *   isDefault:   boolean   — if true, runs on every scan automatically
 *   run(fileTree, getContent, { commits }) => Promise<Object>
 */

const tddDetector = require('../tddDetector');

module.exports = {
  name: 'tdd',
  description: 'TDD commit-pattern and structural signal detection',
  isDefault: true,

  async run(fileTree, getContent, { commits = [] } = {}) {
    const result = tddDetector.analyse(commits, fileTree);
    return {
      checkName: 'tdd',
      ...result
    };
  }
};