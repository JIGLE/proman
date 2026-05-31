const fs = require('fs');
const p = './vitest-results.utf8.json';
if (!fs.existsSync(p)) { console.error('file missing', p); process.exit(2); }
const buf = fs.readFileSync(p);
const s = buf.slice(0,1000).toString('utf8');
console.log('---HEAD---');
console.log(s);
console.log('---HEX (first 64 bytes)---');
console.log(buf.slice(0,64).toString('hex'));
