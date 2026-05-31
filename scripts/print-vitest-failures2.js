const fs = require('fs');
const path = './vitest-results.utf8.json';
if (!fs.existsSync(path)) { console.error('vitest results file not found:', path); process.exit(2); }
let data = fs.readFileSync(path, 'utf8');
// strip BOM if present
if (data.charCodeAt(0) === 0xFEFF) data = data.slice(1);
let r;
try {
  r = JSON.parse(data);
} catch (e) {
  console.error('Failed to parse JSON after BOM removal:', e.message);
  process.exit(1);
}
const failed = new Set();
(r.testResults||[]).forEach(s => {
  const name = s.name || s.testFilePath || s.filePath || s.file || s.testFile || s.title || null;
  if ((s.numFailingTests && s.numFailingTests > 0) || (s.assertionResults && s.assertionResults.some(a => a.status === 'failed'))) {
    failed.add(name);
  }
});
if (failed.size === 0) {
  console.log('No failing test suites found.');
  process.exit(0);
}
console.log(Array.from(failed).filter(Boolean).join('\n'));
