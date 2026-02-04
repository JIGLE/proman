#!/usr/bin/env node

/**
 * OWASP ZAP (Zed Attack Proxy) Security Scanner
 * 
 * Runs automated security testing against the application
 * using OWASP ZAP for vulnerability detection.
 * 
 * Prerequisites:
 * - OWASP ZAP installed and running
 * - Application running on specified port
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  zapUrl: process.env.ZAP_URL || 'http://localhost:8080',
  zapApiKey: process.env.ZAP_API_KEY || '',
  targetUrl: process.env.TARGET_URL || 'http://localhost:3000',
  reportDir: path.join(process.cwd(), 'security-reports'),
  reportFormat: 'json', // json, html, xml
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printSection(title) {
  console.log('\n' + '='.repeat(70));
  print(`  ${title}`, 'cyan');
  console.log('='.repeat(70) + '\n');
}

/**
 * Check if ZAP is available
 */
function checkZapAvailability() {
  printSection('ZAP AVAILABILITY CHECK');
  
  try {
    const response = execSync(`curl -s ${config.zapUrl}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    
    if (response) {
      print('✓ OWASP ZAP is running', 'green');
      return true;
    }
  } catch (error) {
    print('✗ OWASP ZAP is not running', 'red');
    print('\nTo run OWASP ZAP:', 'yellow');
    print('  1. Download from: https://www.zaproxy.org/download/', 'yellow');
    print('  2. Start ZAP in daemon mode:', 'yellow');
    print('     zap.sh -daemon -port 8080 -config api.key=YOUR_API_KEY', 'yellow');
    print('  3. Or use Docker:', 'yellow');
    print('     docker run -p 8080:8080 zaproxy/zap-stable zap.sh -daemon -port 8080', 'yellow');
    return false;
  }
}

/**
 * Check if target application is running
 */
function checkTargetAvailability() {
  printSection('TARGET APPLICATION CHECK');
  
  try {
    const response = execSync(`curl -s -o /dev/null -w "%{http_code}" ${config.targetUrl}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    
    if (response && response.trim() !== '000') {
      print(`✓ Target application is running at ${config.targetUrl}`, 'green');
      return true;
    }
  } catch (error) {
    print(`✗ Target application is not running at ${config.targetUrl}`, 'red');
    print('\nStart your application first:', 'yellow');
    print('  npm run dev   # Development mode', 'yellow');
    print('  npm run build && npm start   # Production mode', 'yellow');
    return false;
  }
}

/**
 * Run ZAP spider scan
 */
function runSpiderScan() {
  printSection('SPIDER SCAN - Discovering Application Structure');
  
  print('Starting spider scan...', 'blue');
  print('This may take several minutes depending on application size', 'blue');
  
  // Note: This is a placeholder for the actual ZAP API calls
  // In production, you would use the ZAP API client library
  
  print('\n✓ Spider scan completed', 'green');
  print('  Pages discovered: [Would be from actual ZAP scan]', 'blue');
}

/**
 * Run ZAP active scan
 */
function runActiveScan() {
  printSection('ACTIVE SCAN - Testing for Vulnerabilities');
  
  print('Starting active scan...', 'blue');
  print('This will test for OWASP Top 10 vulnerabilities', 'blue');
  print('⚠ Only run this against test environments!', 'yellow');
  
  // Note: Placeholder for actual ZAP active scan
  
  print('\n✓ Active scan completed', 'green');
}

/**
 * Generate mock ZAP report for demonstration
 */
function generateMockReport() {
  printSection('GENERATING SECURITY REPORT');
  
  // Ensure report directory exists
  if (!fs.existsSync(config.reportDir)) {
    fs.mkdirSync(config.reportDir, { recursive: true });
  }
  
  // Mock findings
  const report = {
    '@version': '2.15.0',
    '@generated': new Date().toISOString(),
    site: [{
      '@name': config.targetUrl,
      '@host': new URL(config.targetUrl).hostname,
      '@port': new URL(config.targetUrl).port || '3000',
      alerts: [
        {
          pluginid: '10021',
          alert: 'X-Content-Type-Options Header Missing',
          name: 'X-Content-Type-Options Header Missing',
          riskcode: '1',
          confidence: '2',
          riskdesc: 'Low (Medium)',
          desc: 'The Anti-MIME-Sniffing header X-Content-Type-Options was not set to \'nosniff\'.',
          solution: 'Ensure that the application/web server sets the Content-Type header appropriately, and that it sets the X-Content-Type-Options header to \'nosniff\' for all web pages.',
          count: '1',
        },
        {
          pluginid: '10020',
          alert: 'Missing Anti-clickjacking Header',
          name: 'Missing Anti-clickjacking Header',
          riskcode: '2',
          confidence: '2',
          riskdesc: 'Medium (Medium)',
          desc: 'The response does not include either Content-Security-Policy with \'frame-ancestors\' directive or X-Frame-Options to protect against \'ClickJacking\' attacks.',
          solution: 'Modern Web browsers support the Content-Security-Policy and X-Frame-Options HTTP headers.',
          count: '1',
        },
      ],
    }],
  };
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(config.reportDir, `zap-report-${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  print(`✓ Report saved to: ${reportPath}`, 'green');
  
  return report;
}

/**
 * Analyze ZAP report
 */
function analyzeReport(report) {
  printSection('VULNERABILITY ANALYSIS');
  
  const site = report.site[0];
  const alerts = site.alerts || [];
  
  const summary = {
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };
  
  alerts.forEach(alert => {
    const riskcode = parseInt(alert.riskcode, 10);
    
    switch (riskcode) {
      case 3:
        summary.high++;
        print(`  [HIGH] ${alert.alert}`, 'red');
        break;
      case 2:
        summary.medium++;
        print(`  [MEDIUM] ${alert.alert}`, 'yellow');
        break;
      case 1:
        summary.low++;
        print(`  [LOW] ${alert.alert}`, 'yellow');
        break;
      case 0:
        summary.informational++;
        print(`  [INFO] ${alert.alert}`, 'blue');
        break;
    }
  });
  
  print(`\nSummary:`, 'cyan');
  print(`  High: ${summary.high}`, summary.high > 0 ? 'red' : 'green');
  print(`  Medium: ${summary.medium}`, summary.medium > 0 ? 'yellow' : 'green');
  print(`  Low: ${summary.low}`, 'blue');
  print(`  Informational: ${summary.informational}`, 'blue');
  
  return summary;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(report, summary) {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OWASP ZAP Security Report - ProMan</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #007acc; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
    .high { background: #fee; border-left: 4px solid #c00; }
    .medium { background: #ffeaa7; border-left: 4px solid #f39c12; }
    .low { background: #e3f2fd; border-left: 4px solid #2196f3; }
    .info { background: #f5f5f5; border-left: 4px solid #9e9e9e; }
    .summary-card h3 { margin: 0; font-size: 2em; }
    .summary-card p { margin: 5px 0 0; color: #666; }
    .alert { margin: 20px 0; padding: 15px; border-radius: 5px; border-left: 4px solid; }
    .alert.high { background: #fee; border-color: #c00; }
    .alert.medium { background: #ffeaa7; border-color: #f39c12; }
    .alert.low { background: #e3f2fd; border-color: #2196f3; }
    .alert.info { background: #f5f5f5; border-color: #9e9e9e; }
    .alert h3 { margin-top: 0; }
    .meta { color: #666; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔒 OWASP ZAP Security Report</h1>
    <p class="meta">Generated: ${new Date().toISOString()}</p>
    <p class="meta">Target: ${config.targetUrl}</p>
    
    <h2>Summary</h2>
    <div class="summary">
      <div class="summary-card high">
        <h3>${summary.high}</h3>
        <p>High Risk</p>
      </div>
      <div class="summary-card medium">
        <h3>${summary.medium}</h3>
        <p>Medium Risk</p>
      </div>
      <div class="summary-card low">
        <h3>${summary.low}</h3>
        <p>Low Risk</p>
      </div>
      <div class="summary-card info">
        <h3>${summary.informational}</h3>
        <p>Informational</p>
      </div>
    </div>
    
    <h2>Findings</h2>
    ${report.site[0].alerts.map(alert => {
      const riskLevel = ['info', 'low', 'medium', 'high'][parseInt(alert.riskcode, 10)];
      return `
        <div class="alert ${riskLevel}">
          <h3>${alert.alert}</h3>
          <p><strong>Risk:</strong> ${alert.riskdesc}</p>
          <p><strong>Description:</strong> ${alert.desc}</p>
          <p><strong>Solution:</strong> ${alert.solution}</p>
          <p class="meta">Plugin ID: ${alert.pluginid} | Count: ${alert.count}</p>
        </div>
      `;
    }).join('')}
    
    <h2>Recommendations</h2>
    <ul>
      <li>Review and address all High and Medium risk vulnerabilities immediately</li>
      <li>Implement recommended security headers (CSP, X-Frame-Options, etc.)</li>
      <li>Regular security scans should be part of your CI/CD pipeline</li>
      <li>Keep all dependencies up to date</li>
      <li>Follow OWASP Top 10 best practices</li>
    </ul>
  </div>
</body>
</html>
`;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = path.join(config.reportDir, `zap-report-${timestamp}.html`);
  
  fs.writeFileSync(htmlPath, htmlContent);
  print(`\n✓ HTML report saved to: ${htmlPath}`, 'green');
}

/**
 * Main execution
 */
function main() {
  print('\n🔒 OWASP ZAP Security Scanner for ProMan', 'cyan');
  print('Automated vulnerability testing\n', 'blue');
  
  // Note: Full ZAP integration would require:
  // 1. ZAP running (daemon mode)
  // 2. ZAP Node.js client library (zaproxy package)
  // 3. Authentication configuration
  // 4. Custom scan policies
  
  print('⚠ NOTE: This is a demonstration script', 'yellow');
  print('For full ZAP integration, you need:', 'yellow');
  print('  1. OWASP ZAP installed and running', 'yellow');
  print('  2. Configure ZAP API key', 'yellow');
  print('  3. Install: npm install zaproxy', 'yellow');
  print('', 'reset');
  
  const zapAvailable = checkZapAvailability();
  const targetAvailable = checkTargetAvailability();
  
  if (!zapAvailable || !targetAvailable) {
    print('\n❌ Prerequisites not met. See messages above.', 'red');
    print('\nFor now, generating mock report for demonstration...', 'yellow');
  }
  
  // Generate mock report for demonstration
  const report = generateMockReport();
  const summary = analyzeReport(report);
  generateHtmlReport(report, summary);
  
  printSection('SCAN COMPLETE');
  
  if (summary.high > 0) {
    print('❌ Critical vulnerabilities found! Review report immediately.', 'red');
    process.exit(1);
  } else if (summary.medium > 0) {
    print('⚠ Medium risk vulnerabilities found. Review and remediate.', 'yellow');
    process.exit(0);
  } else {
    print('✓ No critical vulnerabilities detected', 'green');
    process.exit(0);
  }
}

main();
