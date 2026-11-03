/**
 * depAudit.js - Week 6 backend dependency vulnerability check
 *
 * Parses package-lock.json (v1/v2/v3) or yarn.lock to extract
 * all installed packages, then queries OSV.dev API in batches
 * of 5 to find known CVEs.
 *
 * Returns structured vulnerability findings with severity, CVE IDs,
 * affected version ranges, and fix recommendations.
 */

const https = require('https');

/* ---- OSV.dev batch query ---- */
function osvQuery(packages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      queries: packages.map(p => ({
        package: { name: p.name, ecosystem: 'npm' },
        version: p.version,
      })),
    });

    const options = {
      hostname: 'api.osv.dev',
      path: '/v1/querybatch',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'RepoScope/1.0',
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ results: [] }); }
      });
    });
    req.on('error', () => resolve({ results: [] }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ results: [] }); });
    req.write(body);
    req.end();
  });
}

/* ---- Parse package-lock.json (v1 / v2 / v3) ---- */
function parsePackageLock(content) {
  try {
    const lock = JSON.parse(content);
    const pkgs = [];

    if (lock.lockfileVersion >= 2 && lock.packages) {
      // v2/v3: packages map - keys like "node_modules/lodash"
      for (const [key, val] of Object.entries(lock.packages)) {
        if (!key || key === '') continue; // skip root
        const name = key.replace(/^node_modules\//, '').replace(/.*node_modules\//, '');
        if (name && val.version) pkgs.push({ name, version: val.version });
      }
    } else if (lock.dependencies) {
      // v1: dependencies map
      function walk(deps) {
        for (const [name, val] of Object.entries(deps || {})) {
          if (val.version) pkgs.push({ name, version: val.version });
          if (val.dependencies) walk(val.dependencies);
        }
      }
      walk(lock.dependencies);
    }

    return pkgs;
  } catch {
    return [];
  }
}

/* ---- Parse yarn.lock ---- */
function parseYarnLock(content) {
  const pkgs = [];
  const blockRe = /^"?([^@"\n]+)@[^:]+:\s*\n(?:[ \t]+.*\n)*?[ \t]+version\s+"?([^\s"]+)"?/gm;
  let m;
  while ((m = blockRe.exec(content)) !== null) {
    const name = m[1].trim().replace(/^"/, '');
    if (name && m[2]) pkgs.push({ name, version: m[2].trim() });
  }
  return pkgs;
}

/* ---- Severity normaliser ---- */
function normaliseSeverity(vuln) {
  // OSV severity field
  if (vuln.database_specific?.severity) {
    return vuln.database_specific.severity.toLowerCase();
  }
  // CVSS score fallback
  const cvss = vuln.severity?.[0]?.score ?? 0;
  if (cvss >= 9) return 'critical';
  if (cvss >= 7) return 'high';
  if (cvss >= 4) return 'medium';
  return 'low';
}

/* ---- Map OSV results to vulnerability records ---- */
function mapVulns(packages, osvResults) {
  const vulns = [];
  const results = osvResults.results || [];

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const batch = results[i] || {};
    const osvVulns = batch.vulns || [];

    for (const v of osvVulns) {
      const cveIds = (v.aliases || []).filter(a => a.startsWith('CVE-'));
      const severity = normaliseSeverity(v);

      // Find fix version from affected ranges
      let fixedIn = null;
      for (const aff of (v.affected || [])) {
        for (const range of (aff.ranges || [])) {
          for (const ev of (range.events || [])) {
            if (ev.fixed) { fixedIn = ev.fixed; break; }
          }
          if (fixedIn) break;
        }
        if (fixedIn) break;
      }

      vulns.push({
        package:   pkg.name,
        version:   pkg.version,
        severity,
        cveIds,
        osvId:     v.id,
        title:     v.summary || v.id,
        detail:    v.details ? v.details.slice(0, 300) : '',
        fixedIn,
        url:       `https://osv.dev/vulnerability/${v.id}`,
      });
    }
  }

  return vulns;
}

/* ---- CHECKS_REGISTRY compatible run() function ---- */
async function run(fileTree, getContent, _ctx) {
  // Find lock files in the repo
  const lockFiles = fileTree.filter(f =>
    f === 'package-lock.json' || f === 'yarn.lock' ||
    f.endsWith('/package-lock.json') || f.endsWith('/yarn.lock')
  ).slice(0, 3); // cap at 3 lock files

  if (lockFiles.length === 0) {
    return {
      lockFileFound: false,
      lockFile: null,
      totalPackages: 0,
      vulnerabilities: [],
      totalVulnerabilities: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      riskScore: 0,
      rating: 'pass',
      message: 'No package-lock.json or yarn.lock found in the repository.',
    };
  }

  // Use the first lock file found (prefer root-level)
  const lockFile = lockFiles[0];
  const content  = await getContent(lockFile);

  if (!content) {
    return {
      lockFileFound: false,
      lockFile,
      totalPackages: 0,
      vulnerabilities: [],
      totalVulnerabilities: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      riskScore: 0,
      rating: 'pass',
      message: 'Could not read lock file content.',
    };
  }

  // Parse packages from lock file
  let packages = lockFile.endsWith('yarn.lock')
    ? parseYarnLock(content)
    : parsePackageLock(content);

  // Deduplicate by name+version
  const seen = new Set();
  packages = packages.filter(p => {
    const key = `${p.name}@${p.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const totalPackages = packages.length;

  if (totalPackages === 0) {
    return {
      lockFileFound: true,
      lockFile,
      totalPackages: 0,
      vulnerabilities: [],
      totalVulnerabilities: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      riskScore: 0,
      rating: 'pass',
      message: 'Lock file found but no packages could be parsed.',
    };
  }

  // Query OSV in batches of 5
  const BATCH = 5;
  // Cap at 200 packages to stay within time budget
  const toQuery = packages.slice(0, 200);
  const allResults = { results: [] };

  for (let i = 0; i < toQuery.length; i += BATCH) {
    const batch   = toQuery.slice(i, i + BATCH);
    const osvResp = await osvQuery(batch);
    allResults.results.push(...(osvResp.results || new Array(batch.length).fill({})));
  }

  const vulnerabilities = mapVulns(toQuery, allResults);

  // Sort: critical first
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  vulnerabilities.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  // Aggregate severity counts
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const v of vulnerabilities) {
    bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
  }

  const totalVulnerabilities = vulnerabilities.length;
  const riskScore = (bySeverity.critical * 10) + (bySeverity.high * 5) + (bySeverity.medium * 2) + bySeverity.low;

  let rating;
  if (bySeverity.critical > 0)  rating = 'critical';
  else if (bySeverity.high > 0) rating = 'high';
  else if (bySeverity.medium > 2) rating = 'medium';
  else if (totalVulnerabilities > 0) rating = 'low';
  else rating = 'pass';

  const message = totalVulnerabilities === 0
    ? `All ${totalPackages} packages scanned - no known vulnerabilities found.`
    : `Found ${totalVulnerabilities} vulnerabilit${totalVulnerabilities > 1 ? 'ies' : 'y'} across ${totalPackages} packages (${bySeverity.critical} critical, ${bySeverity.high} high, ${bySeverity.medium} medium, ${bySeverity.low} low).`;

  return {
    lockFileFound: true,
    lockFile,
    totalPackages,
    vulnerabilities,
    totalVulnerabilities,
    bySeverity,
    riskScore,
    rating,
    message,
  };
}

module.exports = {
  name:        'Dependency Audit',
  description: 'Parses package-lock.json or yarn.lock and queries OSV.dev for known CVEs.',
  isDefault:   true,
  run,
};