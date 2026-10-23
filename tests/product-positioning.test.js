const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'miniapp.html'), 'utf8');
const questionnaire = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');

assert.match(home, /<div class="nav-title">速述通<\/div>/);
assert.doesNotMatch(home, /诉状助手/);
assert.match(admin, /速述通 · 管理后台/);
assert.match(home, /人身损害类诉状/);
assert.match(home, /startCase\(\)/);
assert.match(home, /productType:'personal_injury_lawsuit'/);
assert.doesNotMatch(home, /选择案件类型/);
assert.doesNotMatch(home, /startCase\('[abdi]'\)/);
assert.doesNotMatch(home, /const caseNames=/);
assert.match(home, /screen:'start',answers:\{\}/);
assert.match(questionnaire, /本次人身伤害是在什么场景下发生的/);
assert.doesNotMatch(home, />账号资料</);
assert.doesNotMatch(home, />数据同步</);
assert.doesNotMatch(home, /class="card summary"/);
assert.equal((home.match(/class="action-card/g) || []).length, 3);
assert.match(home, /class="intro-copy">适用于交通事故/);
assert.match(home, />隐私政策</);
assert.match(home, />清除所有数据</);
assert.match(home, />免责声明</);
assert.ok(home.indexOf('>清除所有数据<') < home.indexOf('>隐私政策<'), '清除所有数据应位于隐私政策上方');
assert.match(home, /速述通仅收集生成文书所必需的信息/);
assert.match(home, /不构成法律咨询、案件代理或诉讼结果承诺/);
assert.match(home, /function clearAllData\(\)/);

console.log('0.11β product positioning tests passed');
