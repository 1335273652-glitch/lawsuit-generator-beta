const assert = require('node:assert/strict');
const engine = require('../case-engine.js');
const params = {income:43910,consume:29052,wage:8948};
const base = {A4:'c',B1:'a',B5:'1986-01-01',D3:'a',D4:'i',D6:'2026-03-01',K2:'b'};

function item(result,name){ return result.items.find(x=>x.name===name)?.amount || 0; }
function close(actual,expected,tolerance=1){ assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} != ${expected}`); }

close(item(engine.calcCase(base,params),'残疾赔偿金'),175640);
close(item(engine.calcCase({...base,B5:'1965-01-01'},params),'残疾赔偿金'),166858);
close(item(engine.calcCase({...base,E11:1,E12:'女儿/女/2012-06-01/2'},params),'被扶养人生活费'),12492.36);

const traffic = engine.calcCase({A1:'b',A4:'c',B1:'a',B5:'1986-01-01',D3:'a',D4:'i',D6:'2026-03-01',C7:70,F5:'a',F6:100,H1:'a',E1:86500,E13:95482.76,E15:3000,K2:'a'},params);
assert.equal(traffic.jq.medical,18000);
assert.equal(traffic.jq.disability,180000);

const work = engine.calcCase({A1:'a',A4:'c',B1:'a',B5:'1986-01-01',D3:'a',D4:'i',D6:'2026-03-01',G3:6000,G4:6800,G5:6,G11:'a',K2:'b'}, {...params,twoMed:6,twoJob:10});
close(work.work.oneTime.find(x=>x.name==='一次性伤残补助金').amount,54000);
close(work.work.oneTime.find(x=>x.name==='停工留薪期工资').amount,36000);
close(work.work.oneTime.find(x=>x.name.includes('医疗补助金')).amount,108800);

const death = engine.calcCase({A1:'c',B1:'b',B5:'1981-01-01',C1:'2026-03-01',K2:'b'},params);
close(item(death,'死亡赔偿金'),878200);
close(item(death,'丧葬费'),53688);

const paid = engine.calcCase({E1:126482,E16:78241},{});
close(paid.net,48241);
assert.equal(engine.calcCase({A1:'b',H1:'d',E1:100000},{}).jq.sum,0);
assert.equal(item(engine.calcCase({...base,A4:'a'},params),'残疾赔偿金'),0);
assert.equal(item(engine.calcCase({...base,E13:50000,K2:'b'},params),'精神损害抚慰金'),0);
assert.equal(item(engine.calcCase(base,{}),'残疾赔偿金'),0);

console.log('0.7β calculation tests passed');
