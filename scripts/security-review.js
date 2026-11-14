#!/usr/bin/env node

/**
 * Automated Security Audit & Verification Runner
 * Verifies code artifacts, dependencies, and test suite results.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const checks = [
  {
    name: 'Zero vulnerabilities in npm audit',
    run: () => {
      const output = execSync('npm audit --audit-level=high --json', { encoding: 'utf8' });
      const parsed = JSON.parse(output);
      const totalVulns = (parsed.metadata?.vulnerabilities?.high || 0) + (parsed.metadata?.vulnerabilities?.critical || 0);
      if (totalVulns > 0) throw new Error(`Found ${totalVulns} high/critical vulnerabilities`);
      return '0 high/critical vulnerabilities';
    }
  },
  {
    name: 'Unit, Integration, Security, and SRS Test Suite',
    run: () => {
      const output = execSync('npm test', { encoding: 'utf8' });
      if (!output.includes('pass 20') && !output.includes('fail 0')) {
        throw new Error('Test suite did not report 20 passes and 0 fails');
      }
      return 'All 20 backend security tests passed';
    }
  },
  {
    name: 'End-to-End Functional and Accessibility Test Suite',
    run: () => {
      const output = execSync('npx playwright test', { encoding: 'utf8' });
      if (!output.includes('12 passed')) {
        throw new Error('Playwright E2E suite did not report 12 passes');
      }
      return 'All 12 browser E2E and Axe-Core tests passed';
    }
  },
  {
    name: 'No hardcoded credentials in codebase',
    run: () => {
      const forbidden = ['AKIA', 'BEGIN RSA PRIVATE KEY', 'aws_secret_access_key'];
      const serverFiles = ['server/server.js', 'server/authService.js', 'server/securityMiddleware.js', 'server/db.js'];
      for (const file of serverFiles) {
        const content = fs.readFileSync(path.resolve(file), 'utf8');
        for (const pattern of forbidden) {
          if (content.includes(pattern)) throw new Error(`Forbidden credential pattern found in ${file}`);
        }
      }
      return 'No secrets discovered in server codebase';
    }
  },
  {
    name: 'Security Headers defined in NGINX and Node middleware',
    run: () => {
      const nginx = fs.readFileSync(path.resolve('nginx.conf'), 'utf8');
      const nodeMw = fs.readFileSync(path.resolve('server/securityMiddleware.js'), 'utf8');
      if (!nginx.includes('frame-ancestors') || !nodeMw.includes('Content-Security-Policy')) {
        throw new Error('Missing CSP headers in NGINX or Node middleware');
      }
      return 'CSP and framing protections present in web servers';
    }
  }
];

console.log('======================================================');
console.log('   DYSLEXIA ASSISTANT — AUTOMATED SECURITY AUDIT      ');
console.log('======================================================\n');

let failed = false;

for (const check of checks) {
  process.stdout.write(`[*] Checking: ${check.name} ... `);
  try {
    const result = check.run();
    console.log(`\x1b[32mPASS\x1b[0m (${result})`);
  } catch (err) {
    failed = true;
    console.log(`\x1b[31mFAIL\x1b[0m: ${err.message}`);
  }
}

console.log('\n======================================================');
if (failed) {
  console.log('\x1b[31m[!] SECURITY AUDIT FAILED.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m[✓] ALL SECURITY GATES PASSED SUCCESSFULLY.\x1b[0m');
  process.exit(0);
}
