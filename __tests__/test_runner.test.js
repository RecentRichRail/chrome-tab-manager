const test = require('node:test');
const assert = require('node:assert');

test('synchronous passing test', (t) => {
  assert.strictEqual(1, 1);
});
