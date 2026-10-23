const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'miniapp.html'), 'utf8');
const questionnaire = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(home, /人身损害类诉状/);
assert.match(home, /startCase\(\)/);
assert.match(home, /productType:'personal_injury_lawsuit'/);
assert.doesNotMatch(home, /选择案件类型/);
assert.doesNotMatch(home, /startCase\('[abdi]'\)/);
assert.doesNotMatch(home, /const caseNames=/);
assert.match(home, /screen:'start',answers:\{\}/);
assert.match(questionnaire, /本次人身伤害是在什么场景下发生的/);

console.log('0.11β product positioning tests passed');
