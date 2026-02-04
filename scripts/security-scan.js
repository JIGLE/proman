#!/usr/bin/env node

/**
 * Security Scanning Script
 * 
 * Runs comprehensive security checks:
 * - npm audit for dependency vulnerabilities
 * - Custom security checks for common issues
 * - Reports findings with severity levels
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Severity levels
const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MODERATE: 'moderate',
  LOW: 'low',
  INFO: 'info',
};

// Track findings
const findings = {
  critical: [],
  high: [],
  moderate: [],
  low: [],
  info: [],
};

/**
 * Print colored message
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printSection(title) {
  console.log('\n' + '='.repeat(70));
  print(`  ${title}`, 'cyan');
  console.log('='.repeat(70) + '\n');
}

/**
 * Add finding
 */
function addFinding(severity, category, message, details = null) {
  findings[severity].push({
    category,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Run npm audit
 */
function runNpmAudit() {
  printSection('NPM AUDIT - Dependency Vulnerabilities');
  
  try {
    // Run npm audit and get JSON output
    const auditOutput = execSync('npm audit --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    const audit = JSON.parse(auditOutput);
    
    // Parse vulnerabilities
    const vulnerabilities = audit.vulnerabilities || {};
    const metadata = audit.metadata || {};
    
    const counts = {
      critical: metadata.vulnerabilities?.critical || 0,
      high: metadata.vulnerabilities?.high || 0,
      moderate: metadata.vulnerabilities?.moderate || 0,
      low: metadata.vulnerabilities?.low || 0,
      info: metadata.vulnerabilities?.info || 0,
    };
    
    // Display summary
    print(`Total vulnerabilities: ${metadata.vulnerabilities?.total || 0}`, 'blue');
    if (counts.critical > 0) print(`  Critical: ${counts.critical}`, 'red');
    if (counts.high > 0) print(`  High: ${counts.high}`, 'red');
    if (counts.moderate > 0) print(`  Moderate: ${counts.moderate}`, 'yellow');
    if (counts.low > 0) print(`  Low: ${counts.low}`, 'yellow');
    if (counts.info > 0) print(`  Info: ${counts.info}`, 'blue');
    
    // Add to findings
    Object.entries(vulnerabilities).forEach(([pkg, vuln]) => {
      const severity = vuln.severity || 'low';
      addFinding(
        severity,
        'Dependency Vulnerability',
        `${pkg}: ${vuln.via?.[0]?.title || 'Vulnerability detected'}`,
        {
          package: pkg,
          severity: vuln.severity,
          range: vuln.range,
          via: vuln.via,
        }
      );
    });
    
    if (metadata.vulnerabilities?.total === 0) {
      print('✓ No vulnerabilities found', 'green');
    }
    
  } catch (error) {
    // npm audit exits with code 1 if vulnerabilities are found
    if (error.stdout) {
      try {
        const audit = JSON.parse(error.stdout);
        const metadata = audit.metadata || {};
        
        print(`Found ${metadata.vulnerabilities?.total || 0} vulnerabilities:`, 'yellow');
        if (metadata.vulnerabilities?.critical) print(`  Critical: ${metadata.vulnerabilities.critical}`, 'red');
        if (metadata.vulnerabilities?.high) print(`  High: ${metadata.vulnerabilities.high}`, 'red');
        if (metadata.vulnerabilities?.moderate) print(`  Moderate: ${metadata.vulnerabilities.moderate}`, 'yellow');
        if (metadata.vulnerabilities?.low) print(`  Low: ${metadata.vulnerabilities.low}`, 'yellow');
        
        // Add to findings
        const vulnerabilities = audit.vulnerabilities || {};
        Object.entries(vulnerabilities).forEach(([pkg, vuln]) => {
          const severity = vuln.severity || 'low';
          addFinding(
            severity,
            'Dependency Vulnerability',
            `${pkg}: ${vuln.via?.[0]?.title || 'Vulnerability detected'}`,
            { package: pkg, severity: vuln.severity }
          );
        });
      } catch (parseError) {
        print('Error parsing npm audit output', 'red');
      }
    } else {
      print('Error running npm audit', 'red');
      print(error.message, 'red');
    }
  }
}

/**
 * Check for exposed secrets in code
 */
function checkForSecrets() {
  printSection('SECRET DETECTION - Exposed Credentials');
  
  const secretPatterns = [
    { name: 'API Key', pattern: /['"]?[a-zA-Z0-9_-]*api[_-]?key['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi },
    { name: 'Password in Code', pattern: /['"]?password['"]?\s*[:=]\s*['"][^'"]{1,}['"]/gi },
    { name: 'Private Key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi },
    { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/gi },
    { name: 'Generic Secret', pattern: /['"]?[a-zA-Z0-9_-]*secret['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{10,}['"]/gi },
  ];
  
  const filesToCheck = [
    'app',
    'components',
    'lib',
    'pages',
  ];
  
  let secretsFound = 0;
  
  filesToCheck.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) return;
    
    // Recursively check files
    function checkDirectory(directory) {
      const files = fs.readdirSync(directory);
      
      files.forEach(file => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkDirectory(filePath);
        } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Skip if file contains 'test' or 'mock'
          if (filePath.includes('test') || filePath.includes('mock')) return;
          
          secretPatterns.forEach(({ name, pattern }) => {
            const matches = content.match(pattern);
            if (matches) {
              matches.forEach(match => {
                // Skip common false positives
                if (match.includes('process.env') || 
                    match.includes('YOUR_') || 
                    match.includes('EXAMPLE_') ||
                    match.includes('test') ||
                    match.includes('demo')) {
                  return;
                }
                
                secretsFound++;
                const relativePath = path.relative(process.cwd(), filePath);
                print(`  ⚠ ${name} detected in ${relativePath}`, 'yellow');
                addFinding(
                  SEVERITY.HIGH,
                  'Secret Detection',
                  `Potential ${name} found in ${relativePath}`,
                  { file: relativePath, pattern: name }
                );
              });
            }
          });
        }
      });
    }
    
    checkDirectory(dirPath);
  });
  
  if (secretsFound === 0) {
    print('✓ No exposed secrets found', 'green');
  } else {
    print(`Found ${secretsFound} potential secrets`, 'red');
  }
}

/**
 * Check environment variable security
 */
function checkEnvSecurity() {
  printSection('ENVIRONMENT VARIABLES - Security Configuration');
  
  const envFiles = ['.env', '.env.local', '.env.example'];
  let issues = 0;
  
  envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check if .env files are in .gitignore
      if (file !== '.env.example') {
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        if (fs.existsSync(gitignorePath)) {
          const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
          if (!gitignore.includes(file)) {
            print(`  ⚠ ${file} not in .gitignore`, 'yellow');
            addFinding(
              SEVERITY.HIGH,
              'Environment Security',
              `${file} not excluded in .gitignore`,
              { file }
            );
            issues++;
          }
        }
      }
      
      // Check for placeholder values in production env
      if (file === '.env' && content.includes('YOUR_')) {
        print(`  ⚠ Placeholder values in ${file}`, 'yellow');
        addFinding(
          SEVERITY.MODERATE,
          'Environment Security',
          'Placeholder values detected in .env file',
          { file }
        );
        issues++;
      }
    }
  });
  
  if (issues === 0) {
    print('✓ Environment configuration secure', 'green');
  }
}

/**
 * Check security headers configuration
 */
function checkSecurityHeaders() {
  printSection('SECURITY HEADERS - Configuration Check');
  
  const middlewarePath = path.join(process.cwd(), 'middleware.ts');
  
  if (!fs.existsSync(middlewarePath)) {
    print('⚠ middleware.ts not found', 'yellow');
    addFinding(
      SEVERITY.MODERATE,
      'Security Headers',
      'No middleware.ts found for security headers',
      null
    );
    return;
  }
  
  const content = fs.readFileSync(middlewarePath, 'utf-8');
  
  const requiredHeaders = [
    { name: 'X-Frame-Options', severity: SEVERITY.HIGH },
    { name: 'X-Content-Type-Options', severity: SEVERITY.MODERATE },
    { name: 'Referrer-Policy', severity: SEVERITY.MODERATE },
    { name: 'Content-Security-Policy', severity: SEVERITY.HIGH },
  ];
  
  let missing = 0;
  
  requiredHeaders.forEach(({ name, severity }) => {
    if (!content.includes(name)) {
      print(`  ⚠ Missing: ${name}`, 'yellow');
      addFinding(
        severity,
        'Security Headers',
        `Missing security header: ${name}`,
        { header: name }
      );
      missing++;
    }
  });
  
  if (missing === 0) {
    print('✓ All critical security headers configured', 'green');
  } else {
    print(`Missing ${missing} security headers`, 'yellow');
  }
}

/**
 * Check for outdated dependencies
 */
function checkOutdatedDependencies() {
  printSection('OUTDATED DEPENDENCIES - Version Check');
  
  try {
    const output = execSync('npm outdated --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'], // Ignore stderr
    });
    
    if (output) {
      const outdated = JSON.parse(output);
      const count = Object.keys(outdated).length;
      
      if (count > 0) {
        print(`Found ${count} outdated dependencies`, 'yellow');
        
        // List critical ones
        Object.entries(outdated).forEach(([pkg, info]) => {
          if (info.current && info.latest) {
            const current = info.current;
            const latest = info.latest;
            
            // Check if major version behind
            const currentMajor = parseInt(current.split('.')[0], 10);
            const latestMajor = parseInt(latest.split('.')[0], 10);
            
            if (latestMajor > currentMajor) {
              print(`  ⚠ ${pkg}: ${current} → ${latest} (major update available)`, 'yellow');
              addFinding(
                SEVERITY.LOW,
                'Outdated Dependency',
                `${pkg} has a major update available: ${current} → ${latest}`,
                { package: pkg, current, latest }
              );
            }
          }
        });
      } else {
        print('✓ All dependencies up to date', 'green');
      }
    } else {
      print('✓ All dependencies up to date', 'green');
    }
  } catch (error) {
    // npm outdated exits with code 1 if there are outdated packages
    if (error.stdout) {
      try {
        const outdated = JSON.parse(error.stdout);
        const count = Object.keys(outdated).length;
        print(`Found ${count} outdated dependencies`, 'yellow');
      } catch (e) {
        // Ignore parse error
      }
    }
    // Don't fail on this check
  }
}

/**
 * Generate summary report
 */
function generateReport() {
  printSection('SECURITY SCAN SUMMARY');
  
  const totalFindings = 
    findings.critical.length +
    findings.high.length +
    findings.moderate.length +
    findings.low.length +
    findings.info.length;
  
  print(`Total findings: ${totalFindings}`, 'blue');
  
  if (findings.critical.length > 0) {
    print(`  Critical: ${findings.critical.length}`, 'red');
  }
  if (findings.high.length > 0) {
    print(`  High: ${findings.high.length}`, 'red');
  }
  if (findings.moderate.length > 0) {
    print(`  Moderate: ${findings.moderate.length}`, 'yellow');
  }
  if (findings.low.length > 0) {
    print(`  Low: ${findings.low.length}`, 'yellow');
  }
  if (findings.info.length > 0) {
    print(`  Info: ${findings.info.length}`, 'blue');
  }
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'security-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: totalFindings,
      critical: findings.critical.length,
      high: findings.high.length,
      moderate: findings.moderate.length,
      low: findings.low.length,
      info: findings.info.length,
    },
    findings,
  }, null, 2));
  
  print(`\n📄 Full report saved to: security-report.json`, 'cyan');
  
  // Exit with appropriate code
  const criticalIssues = findings.critical.length + findings.high.length;
  
  if (criticalIssues > 0) {
    print(`\n❌ Security scan failed: ${criticalIssues} critical/high severity issues found`, 'red');
    process.exit(1);
  } else if (findings.moderate.length > 0) {
    print(`\n⚠ Security scan completed with warnings: ${findings.moderate.length} moderate severity issues`, 'yellow');
    process.exit(0);
  } else {
    print('\n✓ Security scan passed: No critical issues found', 'green');
    process.exit(0);
  }
}

/**
 * Main execution
 */
function main() {
  print('\n🔒 ProMan Security Scanner', 'cyan');
  print('Running comprehensive security checks...\n', 'blue');
  
  runNpmAudit();
  checkForSecrets();
  checkEnvSecurity();
  checkSecurityHeaders();
  checkOutdatedDependencies();
  generateReport();
}

main();
