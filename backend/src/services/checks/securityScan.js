/**
 * securityScan.js - Week 7 backend security check
 *
 * Detects:
 *   - Hardcoded secrets / API keys / passwords
 *   - OWASP Top 10 code patterns (injection, eval, SQL, XSS, etc.)
 *   - Insecure direct object references
 *   - Sensitive data exposure patterns
 *
 * Returns structured findings with file, line, category, severity, and detail.
 */

const path = require('path');

/* ---- Secret / credential patterns ---- */
const SECRET_PATTERNS = [
  { id: 'api-key',        label: 'API Key',          pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*["']([A-Za-z0-9_\-]{16,})["']/i },
  { id: 'aws-access',     label: 'AWS Access Key',   pattern: /AKIA[0-9A-Z]{16}/ },
  { id: 'aws-secret',     label: 'AWS Secret',       pattern: /(?:aws[_-]?secret|secret[_-]?key)\s*[=:]\s*["']([A-Za-z0-9/+=]{20,})["']/i },
  { id: 'generic-secret', label: 'Hardcoded Secret', pattern: /(?:secret|password|passwd|pwd|token|auth_token)\s*[=:]\s*["']([^"']{6,})["']/i },
  { id: 'private-key',    label: 'Private Key',      pattern: /-----BEGIN\s(?:RSA\s|EC\s|OPENSSH\s)?PRIVATE KEY-----/ },
  { id: 'jwt-secret',     label: 'JWT Secret',       pattern: /jwt\.sign\([^,]+,\s*["']([^"']{8,})["']/ },
  { id: 'db-conn-string', label: 'DB Connection String', pattern: /(?:mongodb|mysql|postgres|postgresql):\/\/[^:]+:[^@]+@/ },
  { id: 'github-token',   label: 'GitHub Token',     pattern: /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/ },
  { id: 'stripe-key',     label: 'Stripe Key',       pattern: /sk_(?:live|test)_[A-Za-z0-9]{24,}/ },
  { id: 'sendgrid-key',   label: 'SendGrid Key',     pattern: /SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}/ },
];

/* ---- OWASP code vulnerability patterns ---- */
const OWASP_PATTERNS = [
  {
    id:       'eval-usage',
    label:    'Dangerous eval() usage',
    category: 'A03 Injection',
    severity: 'high',
    pattern:  /\beval\s*\(/,
    tip:      'eval() executes arbitrary code. Use JSON.parse() for data or a safe expression evaluator.',
  },
  {
    id:       'sql-injection',
    label:    'Potential SQL injection',
    category: 'A03 Injection',
    severity: 'high',
    pattern:  /(?:query|execute|db\.run|pool\.query|connection\.query)\s*\(\s*[`"'][^`"']*\$\{/,
    tip:      'String-interpolated SQL allows injection. Use parameterised queries or a query builder.',
  },
  {
    id:       'xss-inner-html',
    label:    'Possible XSS via innerHTML',
    category: 'A03 Injection',
    severity: 'medium',
    pattern:  /\.innerHTML\s*=/,
    tip:      'Setting innerHTML with unsanitised data enables XSS. Use textContent or a sanitisation library.',
  },
  {
    id:       'xss-dangerously',
    label:    'Possible XSS via dangerouslySetInnerHTML',
    category: 'A03 Injection',
    severity: 'medium',
    pattern:  /dangerouslySetInnerHTML/,
    tip:      'dangerouslySetInnerHTML bypasses Reacts XSS protection. Sanitise input with DOMPurify first.',
  },
  {
    id:       'child-process',
    label:    'Shell command injection risk',
    category: 'A03 Injection',
    severity: 'high',
    pattern:  /(?:exec|execSync|spawn|spawnSync)\s*\([`"'][^`"']*\$\{/,
    tip:      'Injecting variables into shell commands allows OS command injection. Use execFile with an args array.',
  },
  {
    id:       'hardcoded-http',
    label:    'Hardcoded HTTP (not HTTPS)',
    category: 'A02 Cryptographic Failures',
    severity: 'low',
    pattern:  /(?:fetch|axios\.get|axios\.post|http\.get|http\.request)\s*\(\s*["']http:\/\//,
    tip:      'Requests over plain HTTP can be intercepted. Use HTTPS for all external calls.',
  },
  {
    id:       'md5-sha1',
    label:    'Weak hashing algorithm (MD5 / SHA-1)',
    category: 'A02 Cryptographic Failures',
    severity: 'medium',
    pattern:  /createHash\s*\(\s*["'](?:md5|sha1)["']\)/i,
    tip:      'MD5 and SHA-1 are broken for cryptographic use. Use SHA-256 or bcrypt for passwords.',
  },
  {
    id:       'path-traversal',
    label:    'Potential path traversal',
    category: 'A01 Broken Access Control',
    severity: 'high',
    pattern:  /(?:readFile|writeFile|readFileSync|writeFileSync|createReadStream)\s*\(\s*(?:req\.|request\.|params\.|query\.)/,
    tip:      'Using request parameters directly in file paths allows path traversal. Sanitise and validate paths.',
  },
  {
    id:       'open-redirect',
    label:    'Potential open redirect',
    category: 'A01 Broken Access Control',
    severity: 'medium',
    pattern:  /res\.redirect\s*\(\s*(?:req\.|request\.|params\.|query\.)/,
    tip:      'Redirecting to a user-supplied URL is an open redirect. Validate against an allowlist.',
  },
  {
    id:       'no-rate-limit',
    label:    'No rate limiting on auth route',
    category: 'A07 Identification and Authentication',
    severity: 'low',
    pattern:  /(?:router|app)\.(?:post|put)\s*\(\s*["'][^"']*(?:login|signin|register|auth)[^"']*["']/i,
    tip:      'Auth endpoints without rate limiting are vulnerable to brute force. Add express-rate-limit.',
  },
  {
    id:       'insecure-cookie',
    label:    'Cookie set without Secure / HttpOnly flag',
    category: 'A02 Cryptographic Failures',
    severity: 'medium',
    pattern:  /res\.cookie\s*\([^)]*\)/,
    tip:      'Cookies should always be set with { httpOnly: true, secure: true, sameSite: "Strict" }.',
  },
  {
    id:       'cors-wildcard',
    label:    'CORS wildcard origin (*)',
    category: 'A01 Broken Access Control',
    severity: 'medium',
    pattern:  /cors\s*\(\s*\{[^}]*origin\s*:\s*['"]\*['"]/,
    tip:      'A wildcard CORS origin allows any site to read your API responses. Restrict to known origins.',
  },
  {
    id:       'prototype-pollution',
    label:    'Possible prototype pollution',
    category: 'A03 Injection',
    severity: 'medium',
    pattern:  /\.\s*__proto__\s*\[|Object\.assign\s*\(\s*\{\s*\}\s*,\s*(?:req\.|request\.)/,
    tip:      'Merging untrusted objects can pollute Object.prototype. Use Object.create(null) or validate inputs.',
  },
  {
    id:       'debug-console',
    label:    'console.log with sensitive variable name',
    category: 'A09 Security Logging',
    severity: 'low',
    pattern:  /console\.log\s*\([^)]*(?:password|token|secret|key|auth)[^)]*\)/i,
    tip:      'Logging sensitive values leaks them to stdout. Remove debug logs before production.',
  },
];

/* ---- Files to skip ---- */
const SKIP = /node_modules|\.min\.js|dist\/|\.git|vendor\/|\.lock$|\.map$/;

/* ---- Source file extensions to scan ---- */
const SRC_EXT = /\.[jt]sx?$|\.mjs$|\.cjs$/;

/**
 * Scan a single file's content for secrets and OWASP patterns.
 * Returns an array of finding objects.
 */
function scanContent(filePath, content) {
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    /* Skip comment-only lines for secret detection to reduce false positives */
    const trimmed = line.trim();
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#');

    /* Secret detection */
    const isTestFile = /test|spec|fixture|mock|__tests__|\.test\.|\.spec\./i.test(filePath);

    for (const sp of SECRET_PATTERNS) {
      if (sp.pattern.test(line)) {
        /* Do not flag example/placeholder values */
        const matchStr = (line.match(sp.pattern) || [])[0] || '';
        const lower = matchStr.toLowerCase();
        if (lower.includes('example') || lower.includes('your_') || lower.includes('placeholder') || lower.includes('xxxx') || lower.includes('your-')) continue;

        /* Extract the actual variable name from the line for a specific message */
        const varNameMatch = line.match(/([A-Za-z_][A-Za-z0-9_]*)\s*[=:]/);
        const varName = varNameMatch ? varNameMatch[1].trim() : null;

        /* Detect what kind of credential the variable name implies */
        const isToken   = varName && /token/i.test(varName);
        const isSession = varName && /session/i.test(varName);
        const isPass    = varName && /passw|passwd|pwd/i.test(varName);
        const isSecret  = varName && /secret/i.test(varName);
        const isAuth    = varName && /auth/i.test(varName);

        /* Build an informative detail message */
        const inTestFile = isTestFile
          ? ' NOTE: This file appears to be a test file. If this value is a fake placeholder used only in tests, it is low risk - but real credentials should never appear even in test files. Use environment variables or a secrets manager instead.'
          : '';

        /* Dynamic generic-secret detail based on the actual variable name */
        function genericDetail() {
          if (!varName) return `A hardcoded credential value was found in source code. If this is a real credential, anyone with read access to this repository can use it. Move it to an environment variable and rotate the value immediately.${inTestFile}`;
          if (isSession) return `The variable "${varName}" contains a hardcoded session token. Session tokens grant authenticated access - if this is a real token, anyone with repository access can impersonate the session owner. Session tokens must never be hardcoded; they are generated at runtime and should never appear in source code.${inTestFile}`;
          if (isToken)   return `The variable "${varName}" has a hardcoded token value. Tokens act like passwords - if this is a real token, anyone who reads the source code gains the same access it provides. Remove it from source code and load it at runtime from an environment variable (process.env.${varName}).${inTestFile}`;
          if (isPass)    return `The variable "${varName}" contains a hardcoded password. Hardcoded passwords are one of the most common causes of data breaches. If this is a real password, change it immediately and store it only in an environment variable or secrets manager - never in source code.${inTestFile}`;
          if (isSecret)  return `The variable "${varName}" holds a hardcoded secret value. Secrets must never be committed to source code. If this is a real secret, rotate it immediately and move it to an environment variable (process.env.${varName}) or a secrets manager such as AWS Secrets Manager or HashiCorp Vault.${inTestFile}`;
          if (isAuth)    return `The variable "${varName}" contains a hardcoded authentication credential. Auth credentials in source code give anyone with repository access the ability to authenticate as this service. Rotate this value immediately and load it from an environment variable instead.${inTestFile}`;
          return `The variable "${varName}" was assigned a hardcoded credential-like string value. If this is a real credential, move it to an environment variable (process.env.${varName}) and rotate the value immediately.${inTestFile}`;
        }

        const detailMap = {
          'api-key':        `A string matching the pattern of an API key was found assigned directly in source code. If this is a real key, anyone with access to this repository can use it to call the API on your behalf, incurring charges or leaking data. Revoke this key immediately${varName ? ' in the service dashboard' : ''} and store it in an environment variable (process.env.${varName || 'API_KEY'}) or a secrets manager.${inTestFile}`,
          'aws-access':     `An AWS Access Key ID (starts with AKIA) was detected in source code. This gives anyone who sees it programmatic access to your AWS account and all services that key has permissions for. Revoke this key immediately in the AWS IAM console, audit your CloudTrail logs for unexpected usage, and rotate all credentials. Store AWS credentials using IAM roles, AWS Secrets Manager, or environment variables only.${inTestFile}`,
          'aws-secret':     `An AWS Secret Access Key was found in source code. Combined with an Access Key ID this gives full programmatic AWS access. Revoke and rotate immediately via the AWS IAM console and check CloudTrail for any unauthorised actions. Never hardcode AWS secrets - use IAM roles attached to your compute resource, or store in environment variables.${inTestFile}`,
          'generic-secret': genericDetail(),
          'private-key':    `A PEM-encoded private key block was found in source code. Private keys should never be committed to a repository under any circumstances. Remove it immediately, regenerate the key pair, and store the private key only in a secure secrets manager or environment variable. Any certificate signed with the exposed key should be considered compromised and must be revoked.${inTestFile}`,
          'jwt-secret':     `A JWT signing secret was found hardcoded in a jwt.sign() call. Anyone who knows this secret can forge valid JWT tokens and impersonate any user in your system, including admins. Move the secret to an environment variable, rotate it immediately, and invalidate all existing tokens by changing the secret.${inTestFile}`,
          'db-conn-string': `A database connection string with embedded credentials (username and password in the URL) was found in source code. This exposes your database host, port, username, password, and database name to anyone with read access to the repo. Change the database password immediately and use an environment variable for the full connection string (process.env.DATABASE_URL).${inTestFile}`,
          'github-token':   `A GitHub Personal Access Token (ghp_ or github_pat_) was found in source code. This token can be used to read and write to your GitHub repositories and organisations with whatever scopes it was granted. Revoke it immediately at github.com/settings/tokens, check your repo audit log for unexpected activity, and use environment variables for any automation tokens.${inTestFile}`,
          'stripe-key':     `A Stripe secret key (sk_live_ or sk_test_) was found in source code. A live key allows anyone to charge cards, issue refunds, create customers, and access your full Stripe account data. Revoke it immediately in the Stripe dashboard under Developers > API keys, and store it in an environment variable (process.env.STRIPE_SECRET_KEY).${inTestFile}`,
          'sendgrid-key':   `A SendGrid API key was found in source code. This allows anyone to send emails from your SendGrid account, access your contact lists, and potentially damage your sending reputation. Revoke it immediately in the SendGrid dashboard under Settings > API Keys and move it to an environment variable.${inTestFile}`,
        };

        findings.push({
          file:     filePath,
          line:     lineNum,
          category: 'Secrets',
          severity: isTestFile ? 'high' : 'critical',
          rule:     sp.id,
          label:    sp.label + (isTestFile ? ' (in test file)' : ''),
          detail:   detailMap[sp.id] || `A possible ${sp.label} was detected. If this is a real credential, remove it from source code immediately and store it in an environment variable or secrets manager.${inTestFile}`,
          snippet:  line.trim().slice(0, 120),
        });
        break; /* One secret finding per line */
      }
    }

    /* OWASP pattern detection (skip comment lines for medium/low patterns) */
    for (const op of OWASP_PATTERNS) {
      if (isComment && op.severity !== 'high') continue;
      if (op.pattern.test(line)) {
        findings.push({
          file:     filePath,
          line:     lineNum,
          category: op.category,
          severity: op.severity,
          rule:     op.id,
          label:    op.label,
          detail:   op.tip,
          snippet:  line.trim().slice(0, 120),
        });
      }
    }
  }

  return findings;
}

/**
 * Aggregate findings into a summary object.
 */
function summarise(findings) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const byCategory = {};

  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
  }

  const totalIssues = findings.length;
  const riskScore = (bySeverity.critical * 10) + (bySeverity.high * 5) + (bySeverity.medium * 2) + (bySeverity.low * 1);

  let rating;
  if (bySeverity.critical > 0) rating = 'critical';
  else if (bySeverity.high > 0) rating = 'high';
  else if (bySeverity.medium > 2) rating = 'medium';
  else if (totalIssues > 0) rating = 'low';
  else rating = 'pass';

  return { totalIssues, bySeverity, byCategory, riskScore, rating };
}

/* ---- CHECKS_REGISTRY compatible run() function ---- */
async function run(fileTree, getContent, _ctx) {
  const findings = [];
  let filesScanned = 0;
  let filesSkipped = 0;

  /* Filter to source files only */
  const srcFiles = fileTree.filter(f => SRC_EXT.test(f) && !SKIP.test(f));

  /* Cap at 60 files to stay within time budget */
  const toScan = srcFiles.slice(0, 60);

  for (const filePath of toScan) {
    try {
      const content = await getContent(filePath);
      if (!content || typeof content !== 'string') { filesSkipped++; continue; }
      const fileFindings = scanContent(filePath, content);
      findings.push(...fileFindings);
      filesScanned++;
    } catch (_) {
      filesSkipped++;
    }
  }

  const summary = summarise(findings);

  /* Deduplicate: for secrets, group by file + variable name (same secret in multiple places = one finding).
     For OWASP patterns, keep per line since different lines may have different context. */
  const seen = new Set();
  const deduped = findings.filter(f => {
    const key = f.category === 'Secrets'
      ? `${f.file}:${f.rule}:${f.label}`   /* same secret type + variable name in same file = one finding */
      : `${f.file}:${f.line}:${f.rule}`;   /* OWASP: keep each line */
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  /* Sort: critical first, then high, medium, low */
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  deduped.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  return {
    filesScanned,
    filesSkipped,
    findings: deduped,
    ...summary,
    message: summary.totalIssues === 0
      ? 'No security issues detected in the scanned source files.'
      : `Found ${summary.totalIssues} issue${summary.totalIssues > 1 ? 's' : ''} across ${filesScanned} files (${summary.bySeverity.critical} critical, ${summary.bySeverity.high} high, ${summary.bySeverity.medium} medium, ${summary.bySeverity.low} low).`,
  };
}

module.exports = {
  name:        'Security Scan',
  description: 'Scans source files for hardcoded secrets and OWASP Top 10 vulnerability patterns.',
  isDefault:   true,
  run,
};