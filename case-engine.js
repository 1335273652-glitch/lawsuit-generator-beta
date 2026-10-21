/* 诉状0.5β 赔偿计算引擎。计算与文书渲染分离，可同时运行于浏览器和 Node.js。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LawsuitEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const round = value => Math.round((number(value) + Number.EPSILON) * 100) / 100;
  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function money(value) { return Math.max(0, round(value)); }
  function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
  function ageOn(birth, reference) {
    if (!validDate(birth) || !validDate(reference)) return null;
    const [by, bm, bd] = birth.split('-').map(Number);
    const [ry, rm, rd] = reference.split('-').map(Number);
    if (!by || !bm || !bd || !ry || !rm || !rd) return null;
    let age = ry - by;
    if (rm < bm || (rm === bm && rd < bd)) age -= 1;
    return age >= 0 ? age : null;
  }
  function compensationYears(age) {
    if (age == null) return 0;
    return age <= 60 ? 20 : age < 75 ? 20 - (age - 60) : 5;
  }

  const levelLetters = {a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,j:10};
  function injuryLevel(value) {
    if (levelLetters[value]) return levelLetters[value];
    const parsed = parseInt(value, 10);
    return parsed >= 1 && parsed <= 10 ? parsed : 0;
  }
  function disabilityCoefficient(level, extraRate) {
    if (!level) return 0;
    return Math.min(1, (11 - level) / 10 + Math.min(0.1, Math.max(0, number(extraRate))));
  }

  const semantic = {
    A1:{a:'work',b:'traffic',c:'premises',d:'assault',e:'medical',f:'product',g:'animal',h:'falling',i:'labor',j:'school',k:'other'},
    A3:{a:'yes',b:'no',c:'unknown'}, A4:{a:'treating',b:'untested',c:'tested',d:'negotiating',e:'ready',f:'inprocess'},
    B1:{a:'alive',b:'dead'}, C5:{a:'yes',b:'no',c:'pending'}, C6:{a:'all',b:'major',c:'equal',d:'minor',e:'none',f:'unknown'},
    D3:{a:'yes',b:'no',c:'pending'}, D5:{a:'yes',b:'no'}, D7:{a:'yes',b:'possible',c:'no'},
    D8:{a:'none',b:'partial',c:'mostly',d:'complete'}, D12:{a:'yes',b:'no'},
    F5:{a:'yes',b:'no',c:'unknown'}, G1:{a:'yes',b:'no',c:'unknown'}, G11:{a:'yes',b:'no',c:'na'},
    H1:{a:'pedestrian',b:'nonmotor',c:'driver',d:'passenger'}, H3:{a:'yes',b:'no'}, K2:{a:'yes',b:'no'}
  };
  function valueOf(answers, id) {
    const raw = answers[id];
    return semantic[id] && semantic[id][raw] ? semantic[id][raw] : raw;
  }

  function routeCase(answers) {
    const a1 = valueOf(answers, 'A1');
    const traffic = a1 === 'traffic' || ['14_6','f'].includes(answers.A2);
    if (answers.C10 === 'b' || answers.C10 === 'yes') return {templateId:'template_5',caseType:'criminal_attached'};
    if (traffic) return {templateId:'template_1',caseType:'traffic'};
    if (a1 === 'work') return valueOf(answers, 'A3') === 'yes' ? {templateId:'template_4',caseType:'work_third_party'} : {templateId:'template_3',caseType:'work'};
    return {templateId:'template_2',caseType:'general'};
  }

  function detectProvince(answers, provinces) {
    const text = [answers.calcProvince, answers.J4, answers.C2, answers.B7].filter(Boolean).join(' ');
    return (provinces || []).find(item => text.includes(item.name)) || null;
  }

  function parseDependants(raw, referenceDate, consume, coefficient, warnings) {
    if (!raw || !consume || !coefficient) return {amount:0, details:[]};
    const rows = String(raw).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const details = [];
    for (const row of rows) {
      const cells = row.split('/').map(x => x.trim());
      const [name, relation, birth] = cells;
      const supporters = Math.max(1, number(cells.length >= 5 ? cells[4] : cells[3]));
      const age = ageOn(birth, referenceDate);
      if (age == null) { warnings.push(`被扶养人${name || '信息'}的出生日期格式不符，未计入。`); continue; }
      const eligibleText = cells.length >= 5 ? cells[3] : '';
      if (age >= 18 && eligibleText && /^(否|no|不)$/.test(eligibleText)) continue;
      let years;
      if (age < 18) {
        const [by,bm,bd] = birth.split('-').map(Number);
        const [ry,rm,rd] = referenceDate.split('-').map(Number);
        const months = Math.max(0, (by + 18 - ry) * 12 + (bm - rm) - (rd < bd ? 1 : 0));
        years = Math.round((months / 12) * 10) / 10;
      } else years = compensationYears(age);
      const annualShare = coefficient / supporters;
      details.push({name:name || '未填写姓名', relation:relation || '', birth, supporters, years, annualShare});
    }
    const annual = details.reduce((sum, row) => sum + consume * row.annualShare, 0);
    const scale = annual > consume ? consume / annual : 1;
    details.forEach(row => row.amount = money(consume * row.years * row.annualShare * scale));
    return {amount:money(details.reduce((sum, row) => sum + row.amount, 0)), details};
  }

  function buildWorkBenefits(answers, params, level, province, warnings) {
    const monthlyAverage = number(answers.G4) || number(params.wage) || (province && number(province.wage) / 12);
    let personalWage = number(answers.G3);
    if (monthlyAverage) personalWage = Math.min(monthlyAverage * 3, Math.max(monthlyAverage * 0.6, personalWage));
    const lumpMonths = {1:27,2:25,3:23,4:21,5:18,6:16,7:13,8:11,9:9,10:7};
    const pensionRates = {1:.9,2:.85,3:.8,4:.75,5:.7,6:.6};
    const careRates = {complete:.5,mostly:.4,partial:.3};
    const oneTime = [], monthly = [];
    if (level && personalWage) oneTime.push({name:'一次性伤残补助金', formula:`本人工资 ${round(personalWage)} × ${lumpMonths[level]}个月`, amount:money(personalWage*lumpMonths[level])});
    const stopMonths = number(answers.G5);
    if (personalWage && stopMonths) oneTime.push({name:'停工留薪期工资', formula:`本人工资 ${round(personalWage)} × ${stopMonths}个月`, amount:money(personalWage*stopMonths)});
    if (level <= 6 && pensionRates[level] && personalWage) monthly.push({name:'伤残津贴', formula:`本人工资 ${round(personalWage)} × ${pensionRates[level]*100}%`, amount:money(personalWage*pensionRates[level])});
    const careKey = valueOf(answers,'D8');
    if (careRates[careKey] && monthlyAverage) monthly.push({name:'生活护理费', formula:`月平均工资 ${round(monthlyAverage)} × ${careRates[careKey]*100}%`, amount:money(monthlyAverage*careRates[careKey])});
    if (level >= 5 && valueOf(answers,'G11') === 'yes') {
      const medMonths = number(params.twoMed), jobMonths = number(params.twoJob);
      if (monthlyAverage && (medMonths || jobMonths)) oneTime.push({name:'一次性工伤医疗补助金及伤残就业补助金', formula:`月平均工资 ${round(monthlyAverage)} × (${medMonths}+${jobMonths})个月`, amount:money(monthlyAverage*(medMonths+jobMonths))});
      else warnings.push('两金月数尚未配置，未计入一次性工伤医疗补助金和伤残就业补助金。');
    }
    return {oneTime, monthly, oneTimeTotal:money(oneTime.reduce((s,x)=>s+x.amount,0)), adjustedPersonalWage:round(personalWage), monthlyAverage:round(monthlyAverage)};
  }

  function calcCase(answers, params) {
    answers = answers || {}; params = params || {};
    const warnings = [];
    const province = params.province || detectProvince(answers, params.provinces);
    const income = number(params.income || (province && province.income));
    const consume = number(params.consume || (province && province.consume));
    const wage = number(params.wage || (province && province.wage ? province.wage / 12 : 0));
    const level = injuryLevel(answers.D4);
    const extraRate = number(answers.D5_extra || params.additionalDisabilityRate);
    const coefficient = disabilityCoefficient(level, extraRate);
    const status = valueOf(answers,'B1');
    const progress = valueOf(answers,'A4');
    const disabilityReady = status !== 'dead' && valueOf(answers,'D3') === 'yes' && !['treating','untested'].includes(progress);
    const referenceDate = status === 'dead' ? (answers.deathDate || answers.C1) : (answers.D6 || answers.C1);
    const age = ageOn(answers.B5, referenceDate);
    const years = compensationYears(age);
    if (answers.B5 && !validDate(answers.B5)) warnings.push('原告出生日期格式无效，应为 YYYY-MM-DD。');
    if (referenceDate && !validDate(referenceDate)) warnings.push('定残日或死亡日期格式无效，应为 YYYY-MM-DD。');
    if (valueOf(answers,'D5') === 'yes' && !extraRate) warnings.push('存在多等级伤残，但未填写附加指数；当前仅按最高伤残等级计算。');

    const items = [];
    const push = (name, amount, category, formula) => { amount = money(amount); if (amount > 0) items.push({name, amount, category, formula}); };
    push('医疗费', Math.max(0,number(answers.E1)-number(answers.E2)), 'medical', '医疗费总额－医保或大病保险已报销金额');
    push('住院伙食补助费', number(answers.D2)*number(answers.E3 || params.meal), 'medical', `${number(answers.D2)}天 × ${number(answers.E3 || params.meal)}元/天`);
    push('营养费', number(answers.D11)*number(answers.E4 || params.nut), 'medical', `${number(answers.D11)}天 × ${number(answers.E4 || params.nut)}元/天`);
    push('后续治疗费', number(answers.D7a), 'medical', '按医嘱或鉴定意见填写');
    const lostDivisor = number(params.lostWageDaysPerMonth) || 30;
    push('误工费', number(answers.E7)/lostDivisor*number(answers.D9), 'disability', `${number(answers.E7)}元/月 ÷ ${lostDivisor} × ${number(answers.D9)}天`);
    push('护理费', number(answers.D10)*number(answers.E5)*number(answers.E6 || params.care), 'disability', `${number(answers.D10)}天 × ${number(answers.E5)}人 × ${number(answers.E6 || params.care)}元/天`);
    push('交通费', answers.E9, 'disability', '按实际填写金额');
    push('住宿费', answers.E10, 'other', '按实际填写金额');
    if (status === 'dead') {
      if (income && years) push('死亡赔偿金', income*years, 'disability', `${income}元/年 × ${years}年`);
      else warnings.push('未取得省级收入基数或死亡年龄，死亡赔偿金未计入。');
      if (wage) push('丧葬费', wage*6, 'disability', `${round(wage)}元/月 × 6个月`);
      else warnings.push('该省职工平均工资尚待核实，丧葬费未计入。');
    } else if (disabilityReady) {
      if (income && years && coefficient) push('残疾赔偿金', income*years*coefficient, 'disability', `${income}元/年 × ${years}年 × ${round(coefficient*100)}%`);
      else warnings.push('未取得省级收入基数、定残年龄或伤残等级，残疾赔偿金未计入。');
    } else if (valueOf(answers,'D3') === 'pending' || ['treating','untested'].includes(progress)) warnings.push('尚未完成伤残鉴定，伤残类项目待鉴定后另行主张。');

    if ((status === 'dead' || disabilityReady) && consume && years) {
      const dep = parseDependants(answers.E12, referenceDate, consume, status === 'dead' ? 1 : coefficient, warnings);
      push('被扶养人生活费', dep.amount, 'disability', dep.details.length ? `按${dep.details.length}名被扶养人、共同扶养份额及年度封顶计算` : '');
    } else if (number(answers.E11) > 0 && !consume) warnings.push('未取得省级消费支出基数，被扶养人生活费未计入。');
    const deviceYears = number(answers.D12c) || years;
    if (valueOf(answers,'D12') === 'yes' && number(answers.D12a)) push('残疾辅助器具费', number(answers.D12a)*Math.ceil(deviceYears/Math.max(1,number(answers.D12b))), 'disability', `${number(answers.D12a)}元 × ${Math.ceil(deviceYears/Math.max(1,number(answers.D12b)))}次`);
    if (valueOf(answers,'K2') !== 'no') push('精神损害抚慰金', answers.E13, 'disability', '按用户填写金额，最终由法院酌定');
    push('财产损失', answers.E14, 'property', '按票据或定损金额');
    push('鉴定费等单列费用', answers.E15, 'standalone', '单列，不进入交强险或商业险分项');

    const total = money(items.reduce((sum,item)=>sum+item.amount,0));
    const ratio = answers.C7 === '' || answers.C7 == null ? 1 : Math.min(1,Math.max(0,number(answers.C7)/100));
    const caseRoute = routeCase(answers);
    const categories = key => money(items.filter(x=>x.category===key).reduce((s,x)=>s+x.amount,0));
    const medicalTotal=categories('medical'), disabilityTotal=categories('disability'), propertyTotal=categories('property'), standaloneTotal=categories('standalone'), otherTotal=categories('other');
    let jq = {medical:0,disability:0,property:0,sum:0,virtual:false,excluded:false};
    let commercial = 0, selfPay = 0, payable;
    if (caseRoute.caseType === 'traffic') {
      const inVehicle = ['driver','passenger'].includes(valueOf(answers,'H1')) || valueOf(answers,'H3') === 'yes';
      if (inVehicle) { jq.excluded=true; warnings.push('受害人属于本车人员，交强险不适用。'); }
      else {
        const noFault = valueOf(answers,'C6') === 'none' || ratio === 0;
        const limits = noFault ? {medical:1800,disability:18000,property:100} : {medical:18000,disability:180000,property:2000};
        jq.medical=money(Math.min(medicalTotal,limits.medical)); jq.disability=money(Math.min(disabilityTotal,limits.disability)); jq.property=money(Math.min(propertyTotal,limits.property)); jq.sum=money(jq.medical+jq.disability+jq.property);
        if (valueOf(answers,'F5') === 'no') { jq.virtual=true; warnings.push('车辆未投保交强险，已按法定限额虚拟计算，应考虑追加投保义务人。'); }
      }
      const insuranceEligibleBalance = Math.max(0,medicalTotal+disabilityTotal+propertyTotal-jq.sum);
      const liableBalance = money(insuranceEligibleBalance*ratio);
      commercial = money(Math.min(number(answers.F6)*10000,liableBalance));
      selfPay = money(liableBalance-commercial + otherTotal*ratio + standaloneTotal*ratio);
      payable = money(jq.sum+commercial+selfPay);
    } else payable = money(total*ratio);
    const paid = money(answers.E16);
    const net = money(Math.max(0,payable-paid));
    const workRelated = valueOf(answers,'A1') === 'work' || valueOf(answers,'A3') === 'yes';
    const work = workRelated ? buildWorkBenefits(answers,{...params,wage},level,province,warnings) : {oneTime:[],monthly:[],oneTimeTotal:0};

    return {items,total,ratio,jq,commercial,selfPay,payable,paid,net,province:province&&province.name,income,consume,wage,age,years,level,coefficient,work,warnings,categories:{medical:medicalTotal,disability:disabilityTotal,property:propertyTotal,standalone:standaloneTotal,other:otherTotal}};
  }

  return {calcCase,calculateFees:calcCase,routeCase,ageOn,compensationYears,disabilityCoefficient,genderText:{a:'男',b:'女',male:'男',female:'女'}};
});
