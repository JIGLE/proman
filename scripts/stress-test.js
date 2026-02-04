#!/usr/bin/env node

/**
 * Stress Test Runner
 * 
 * Pushes the application to its limits to find breaking points
 * Gradually increases load until errors occur
 */

const { execSync } = require('child_process');
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
 * Run stress test with increasing load
 */
function runStressTest(targetUrl) {
  printSection('STRESS TEST - Finding Breaking Points');
  
  print('This test will gradually increase load until the system breaks', 'blue');
  print('Target URL: ' + targetUrl, 'blue');
  print('', 'reset');
  
  const stressConfig = {
    config: {
      target: targetUrl,
      phases: [
        { duration: 60, arrivalRate: 10, rampTo: 50, name: 'Ramp up to 50/sec' },
        { duration: 60, arrivalRate: 50, rampTo: 100, name: 'Ramp up to 100/sec' },
        { duration: 60, arrivalRate: 100, rampTo: 200, name: 'Ramp up to 200/sec' },
        { duration: 60, arrivalRate: 200, rampTo: 300, name: 'Ramp up to 300/sec' },
      ],
      defaults: {
        headers: {
          'User-Agent': 'Artillery Stress Test',
        },
      },
    },
    scenarios: [
      {
        name: 'Stress test main endpoints',
        flow: [
          { get: { url: '/' } },
          { get: { url: '/api/monitoring/health' } },
          { think: 1 },
        ],
      },
    ],
  };
  
  // Write temporary config
  const configPath = path.join(__dirname, '..', 'load-tests', 'stress-test.yml');
  const reportPath = path.join(__dirname, '..', 'load-tests', 'reports', `stress-test-${Date.now()}.json`);
  
  // Ensure directories exist
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Write YAML config
  const yaml = require('js-yaml');
  fs.writeFileSync(configPath, yaml.dump(stressConfig));
  
  print(`Running stress test...`, 'blue');
  print(`This will take approximately 4 minutes\n`, 'blue');
  
  try {
    execSync(
      `npx artillery run ${configPath} --output ${reportPath}`,
      { stdio: 'inherit' }
    );
    
    print('\n✓ Stress test completed', 'green');
    
    // Analyze results
    analyzeStressResults(reportPath);
    
    return true;
  } catch (error) {
    print('\n⚠ Stress test encountered failures (expected)', 'yellow');
    
    // Still try to analyze
    if (fs.existsSync(reportPath)) {
      analyzeStressResults(reportPath);
    }
    
    return false;
  }
}

/**
 * Analyze stress test results
 */
function analyzeStressResults(reportPath) {
  printSection('STRESS TEST ANALYSIS');
  
  if (!fs.existsSync(reportPath)) {
    print('⚠ Report file not found', 'yellow');
    return;
  }
  
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const summary = report.aggregate;
    
    print('System Limits:', 'cyan');
    
    const totalRequests = summary.counters['vusers.created'] || 0;
    const successful = summary.counters['http.codes.200'] || 0;
    const errors = (summary.counters['http.codes.500'] || 0) + 
                   (summary.counters['http.codes.502'] || 0) +
                   (summary.counters['http.codes.503'] || 0);
    const errorRate = (errors / totalRequests) * 100;
    
    print(`  Total Requests: ${totalRequests}`, 'blue');
    print(`  Successful: ${successful}`, 'green');
    print(`  Errors: ${errors}`, errors > 0 ? 'red' : 'green');
    print(`  Error Rate: ${errorRate.toFixed(2)}%`, errorRate > 5 ? 'red' : 'green');
    
    print('\nResponse Times at Peak:', 'cyan');
    print(`  Median: ${summary.latency?.median || 'N/A'} ms`, 'blue');
    print(`  p95: ${summary.latency?.p95 || 'N/A'} ms`, 'blue');
    print(`  p99: ${summary.latency?.p99 || 'N/A'} ms`, 'blue');
    print(`  Max: ${summary.latency?.max || 'N/A'} ms`, 'blue');
    
    if (summary.rates) {
      print('\nThroughput:', 'cyan');
      print(`  Max Requests/sec: ${summary.rates['http.request_rate'] || 'N/A'}`, 'blue');
    }
    
    print('\nRecommendations:', 'cyan');
    
    if (errorRate > 10) {
      print('  ⚠ High error rate detected', 'yellow');
      print('    - Consider horizontal scaling', 'yellow');
      print('    - Review database connection pool', 'yellow');
      print('    - Check rate limiting configuration', 'yellow');
    } else if (errorRate > 5) {
      print('  ⚠ Moderate error rate', 'yellow');
      print('    - Monitor in production', 'yellow');
      print('    - Consider auto-scaling triggers', 'yellow');
    } else {
      print('  ✓ System handled stress test well', 'green');
      print('    - Low error rate under extreme load', 'green');
    }
    
    const p99 = summary.latency?.p99 || 0;
    if (p99 > 10000) {
      print('  ⚠ Very high latency at peak', 'yellow');
      print('    - Review database query optimization', 'yellow');
      print('    - Consider caching strategies', 'yellow');
    }
    
  } catch (error) {
    print('⚠ Could not analyze stress test results', 'yellow');
    print(error.message, 'red');
  }
}

/**
 * Check if js-yaml is available
 */
function checkDependencies() {
  try {
    require('js-yaml');
    return true;
  } catch (error) {
    print('✗ js-yaml module not found', 'red');
    print('\nThis script requires js-yaml for YAML generation.', 'yellow');
    print('Install it with: npm install --save-dev js-yaml', 'yellow');
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  const targetUrl = process.env.TARGET_URL || 'http://localhost:3000';
  
  print('\n💪 ProMan Stress Testing', 'cyan');
  print(`Target: ${targetUrl}`, 'blue');
  print('Finding system breaking points...\n', 'blue');
  
  if (!checkDependencies()) {
    process.exit(1);
  }
  
  const success = runStressTest(targetUrl);
  
  printSection('STRESS TEST COMPLETE');
  print('Review the results above to understand system limits', 'cyan');
  print('Use this data to configure auto-scaling and alerts', 'cyan');
  
  process.exit(success ? 0 : 1);
}

main();
