#!/usr/bin/env node

/**
 * Load Testing Runner
 * 
 * Runs comprehensive load tests against the application
 * Validates performance under various load conditions
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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
 * Check if Artillery is installed
 */
function checkArtilleryInstalled() {
  try {
    execSync('npx artillery --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if application is running
 */
function checkAppRunning(targetUrl) {
  printSection('APPLICATION CHECK');
  
  try {
    const response = execSync(`curl -s -o /dev/null -w "%{http_code}" ${targetUrl}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    
    if (response && response.trim() !== '000') {
      print(`✓ Application is running at ${targetUrl}`, 'green');
      return true;
    }
  } catch (error) {
    print(`✗ Application is not running at ${targetUrl}`, 'red');
    print('\nStart your application first:', 'yellow');
    print('  npm run dev   # Development mode', 'yellow');
    print('  npm run build && npm start   # Production mode', 'yellow');
    return false;
  }
}

/**
 * Run quick smoke test
 */
function runSmokeTest(targetUrl) {
  printSection('SMOKE TEST - Quick Validation');
  
  print('Running quick smoke test (10 seconds, 5 users)...', 'blue');
  
  try {
    execSync(
      `npx artillery quick --count 5 --num 10 ${targetUrl}`,
      { stdio: 'inherit' }
    );
    
    print('\n✓ Smoke test completed', 'green');
    return true;
  } catch (error) {
    print('\n✗ Smoke test failed', 'red');
    return false;
  }
}

/**
 * Run full load test
 */
function runFullLoadTest() {
  printSection('FULL LOAD TEST - Realistic Scenarios');
  
  const configPath = path.join(__dirname, '..', 'load-tests', 'artillery.yml');
  const reportPath = path.join(__dirname, '..', 'load-tests', 'reports', `load-test-${Date.now()}.json`);
  
  // Ensure reports directory exists
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  print('Running full load test with Artillery...', 'blue');
  print('This will take approximately 7 minutes', 'blue');
  print(`Configuration: ${configPath}`, 'blue');
  print(`Report will be saved to: ${reportPath}\n`, 'blue');
  
  try {
    execSync(
      `npx artillery run ${configPath} --output ${reportPath}`,
      { stdio: 'inherit' }
    );
    
    print('\n✓ Load test completed', 'green');
    print(`Report saved to: ${reportPath}`, 'green');
    
    // Generate HTML report
    generateHtmlReport(reportPath);
    
    return true;
  } catch (error) {
    print('\n✗ Load test failed', 'red');
    return false;
  }
}

/**
 * Generate HTML report from JSON results
 */
function generateHtmlReport(jsonReportPath) {
  const htmlReportPath = jsonReportPath.replace('.json', '.html');
  
  print('\nGenerating HTML report...', 'blue');
  
  try {
    execSync(
      `npx artillery report ${jsonReportPath} --output ${htmlReportPath}`,
      { stdio: 'inherit' }
    );
    
    print(`✓ HTML report generated: ${htmlReportPath}`, 'green');
  } catch (error) {
    print('⚠ Could not generate HTML report', 'yellow');
  }
}

/**
 * Analyze results
 */
function analyzeResults(reportPath) {
  printSection('LOAD TEST ANALYSIS');
  
  if (!fs.existsSync(reportPath)) {
    print('⚠ Report file not found', 'yellow');
    return;
  }
  
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const summary = report.aggregate;
    
    print('Performance Metrics:', 'cyan');
    print(`  Total Requests: ${summary.counters['vusers.created']}`, 'blue');
    print(`  Successful: ${summary.counters['http.codes.200'] || 0}`, 'green');
    print(`  Failed: ${summary.counters['http.codes.500'] || 0}`, summary.counters['http.codes.500'] > 0 ? 'red' : 'green');
    
    print('\nResponse Times:', 'cyan');
    print(`  Min: ${summary.latency?.min || 'N/A'} ms`, 'blue');
    print(`  Max: ${summary.latency?.max || 'N/A'} ms`, 'blue');
    print(`  Median (p50): ${summary.latency?.median || 'N/A'} ms`, 'blue');
    print(`  p95: ${summary.latency?.p95 || 'N/A'} ms`, summary.latency?.p95 > 2000 ? 'yellow' : 'green');
    print(`  p99: ${summary.latency?.p99 || 'N/A'} ms`, summary.latency?.p99 > 5000 ? 'yellow' : 'green');
    
    if (summary.rates) {
      print('\nThroughput:', 'cyan');
      print(`  Requests/sec: ${summary.rates['http.request_rate'] || 'N/A'}`, 'blue');
    }
    
    // Performance verdict
    print('\nPerformance Verdict:', 'cyan');
    const p95 = summary.latency?.p95 || 0;
    const p99 = summary.latency?.p99 || 0;
    const errorRate = (summary.counters['http.codes.500'] || 0) / (summary.counters['vusers.created'] || 1) * 100;
    
    if (p95 < 2000 && p99 < 5000 && errorRate < 1) {
      print('✓ EXCELLENT - All metrics within targets', 'green');
    } else if (p95 < 3000 && p99 < 7000 && errorRate < 5) {
      print('⚠ ACCEPTABLE - Some metrics need improvement', 'yellow');
    } else {
      print('✗ POOR - Performance optimization needed', 'red');
    }
    
    print('\nTargets:', 'cyan');
    print(`  p95 < 2000ms: ${p95 < 2000 ? '✓' : '✗'}`, p95 < 2000 ? 'green' : 'red');
    print(`  p99 < 5000ms: ${p99 < 5000 ? '✓' : '✗'}`, p99 < 5000 ? 'green' : 'red');
    print(`  Error rate < 1%: ${errorRate < 1 ? '✓' : '✗'}`, errorRate < 1 ? 'green' : 'red');
    
  } catch (error) {
    print('⚠ Could not analyze results', 'yellow');
    print(error.message, 'red');
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'full';
  const targetUrl = process.env.TARGET_URL || 'http://localhost:3000';
  
  print('\n🚀 ProMan Load Testing Suite', 'cyan');
  print(`Target: ${targetUrl}`, 'blue');
  print(`Test Type: ${testType}\n`, 'blue');
  
  // Check prerequisites
  if (!checkArtilleryInstalled()) {
    print('✗ Artillery is not installed', 'red');
    print('\nInstall Artillery:', 'yellow');
    print('  npm install --save-dev artillery', 'yellow');
    print('  or use: npx artillery', 'yellow');
    process.exit(1);
  }
  
  if (!checkAppRunning(targetUrl)) {
    process.exit(1);
  }
  
  // Run tests based on type
  if (testType === 'smoke') {
    const success = runSmokeTest(targetUrl);
    process.exit(success ? 0 : 1);
  } else if (testType === 'full' || testType === 'load') {
    const success = runFullLoadTest();
    
    // Analyze latest report
    const reportsDir = path.join(__dirname, '..', 'load-tests', 'reports');
    if (fs.existsSync(reportsDir)) {
      const reports = fs.readdirSync(reportsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => ({ name: f, path: path.join(reportsDir, f), time: fs.statSync(path.join(reportsDir, f)).mtime }))
        .sort((a, b) => b.time - a.time);
      
      if (reports.length > 0) {
        analyzeResults(reports[0].path);
      }
    }
    
    process.exit(success ? 0 : 1);
  } else {
    print(`Unknown test type: ${testType}`, 'red');
    print('\nUsage:', 'yellow');
    print('  node scripts/load-test.js [smoke|full]', 'yellow');
    print('\nExamples:', 'yellow');
    print('  node scripts/load-test.js smoke  # Quick 10-second test', 'yellow');
    print('  node scripts/load-test.js full   # Full 7-minute load test', 'yellow');
    process.exit(1);
  }
}

main();
