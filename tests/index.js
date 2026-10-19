// Entry point so `node --test tests/` works on Node versions that treat the argument as a module path.
// Newer runners pick up the *.test.js files directly; this file only imports them.
import './tax.test.js';
import './holidays.test.js';
import './e2e.test.js';
