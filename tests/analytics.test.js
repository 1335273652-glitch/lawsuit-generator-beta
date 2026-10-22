const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const values = new Map();
const localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};
const context = {
  localStorage,
  crypto: { randomUUID: () => `id-${Math.random()}` },
  Date,
  Math,
  JSON,
  globalThis: null
};
context.globalThis = context;
vm.runInNewContext(fs.readFileSync(require.resolve('../analytics.js'), 'utf8'), context);

context.AppAnalytics.track('case_start', {
  caseType: 'traffic',
  stepId: 'A',
  phone: '13800000000',
  idNumber: 'secret',
  address: 'secret',
  answerText: 'secret'
});

const rows = context.AppAnalytics.events();
assert.equal(rows.length, 1);
assert.equal(rows[0].event, 'case_start');
assert.equal(rows[0].properties.caseType, 'traffic');
assert.equal(rows[0].properties.stepId, 'A');
assert.equal(rows[0].properties.phone, undefined);
assert.equal(rows[0].properties.idNumber, undefined);
assert.equal(rows[0].properties.address, undefined);
assert.equal(rows[0].properties.answerText, undefined);
assert.ok(rows[0].visitorId);
assert.ok(rows[0].sessionId);

context.AppAnalytics.clear();
assert.equal(context.AppAnalytics.events().length, 0);
console.log('0.8β analytics tests passed');
