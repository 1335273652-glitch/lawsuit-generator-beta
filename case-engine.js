/* 0.4β 页面可直接加载的共用引擎副本；完整源文件见项目根目录 case-engine.js。 */
(function (g) {
  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const r = v => Math.round((n(v) + Number.EPSILON) * 100) / 100;
  function routeCase(a) {
    const traffic = ['b','traffic'].includes(a.A1) || ['14_6','f'].includes(a.A2);
    if (a.C10 === 'b' || a.C10 === 'yes') return {templateId:'template_5',caseType:'criminal_attached'};
    if (traffic) return {templateId:'template_1',caseType:'traffic'};
    if (a.A1 === 'a' || a.A1 === 'work') return a.A3 === 'yes' ? {templateId:'template_4',caseType:'work_third_party'} : {templateId:'template_3',caseType:'work'};
    return {templateId:'template_2',caseType:'general'};
  }
  function calculateFees(a, p) {
    p=p||{}; const medical=Math.max(0,n(a.E1)-n(a.E2)), meal=n(a.D2)*n(a.E3), nutrition=n(a.D11)*n(a.E4), lost=n(a.E7)/n(p.lostWageDaysPerMonth||21.75)*n(a.D9), care=n(a.D10)*n(a.E5)*n(a.E6), transport=n(a.E9), lodging=n(a.E10), mental=n(a.E13), property=n(a.E14), assessment=n(a.E15), paid=n(a.E16), device=n(a.D12a)*Math.ceil(n(a.D12c)/(n(a.D12b)||1)), total=medical+meal+nutrition+lost+care+transport+lodging+device+mental+property+assessment;
    return {medical:r(medical),meal:r(meal),nutrition:r(nutrition),lost:r(lost),care:r(care),transport:r(transport),lodging:r(lodging),device:r(device),mental:r(mental),property:r(property),assessment:r(assessment),paid:r(paid),total:r(total),claim:r(Math.max(0,total-paid)),reviewItems:['disabilityCompensation','dependentLiving']};
  }
  g.LawsuitEngine={routeCase,calculateFees,genderText:{a:'男',b:'女',male:'男',female:'女'}};
})(window);
