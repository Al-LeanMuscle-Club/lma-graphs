'use strict';
const $ = id => document.getElementById(id);
const number = value => value.toLocaleString('en-US');
const escapeText = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors = {old:'#ad7199',new:'#6f3ed1'};
let data;
function press(selector, attribute, value) {
  document.querySelectorAll(selector).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attribute] === value)));
}
function size(metric) {
  press('[data-size]', 'size', metric);
  const values = metric === 'combined' ? [175966,76443,89044] : metric === 'adjusted' ? [106460,76443,88976] : [101061,67087,74176];
  $('size-chart').innerHTML = values.map((v,i) => `<div class="bar-row"><span class="bar-label">${['原版','11月5日','11月9日'][i]}</span><div class="bar-track"><div class="bar-fill ${['original','old','new'][i]}" style="width:${100*v/values[0]}%"></div></div><span class="bar-value">${number(v)}<small>${(100*v/values[0]).toFixed(2)}% 保留</small></span></div>`).join('');
  $('size-caption').textContent = metric === 'combined' ? '冻结的源码与配置清单。总体减少比例：旧版 56.56%，本次 49.40%。SVG 和 llms.txt 明显影响了统计分母。' : metric === 'adjusted' ? '在两侧排除完全相同的八个文档路径。减少比例：旧版 28.20%，本次 16.42%。必需的运行时 JSON 数据仍计入统计。' : '生产源码口径：旧版减少 33.62%，本次减少 26.60%。将环境数据字面量迁移到 JSON 也会降低这个仅源码指标。';
}
function costs(metric) {
  press('[data-cost]', 'cost', metric);
  const arms=['old','new'], rows=arms.map(arm=>data.token_summary[arm]);
  const amounts=rows.map(r=>metric==='total'?r.total:r.uncached_input+r.output), max=Math.max(...amounts);
  $('cost-chart').innerHTML=rows.map((r,i)=>{
    const amount=amounts[i], cache=metric==='total'?r.cached:0;
    return `<div class="bar-row"><span class="bar-label">${i?'11月9日':'11月5日'}</span><div class="bar-track"><div class="bar-fill" style="width:${100*amount/max}%"><div class="segment cache-${arms[i]}" style="width:${100*cache/amount}%" title="缓存输入： ${number(cache)}"></div><div class="segment uncached-${arms[i]}" style="width:${100*(amount-cache)/amount}%" title="非缓存输入＋输出： ${number(amount-cache)}"></div></div></div><span class="bar-value">${(amount/1e4).toFixed(1)}万<small>${i?'15 次完整调用记录':'9 次已完成调用；统计不完整'}</small></span></div>`;
  }).join('');
  $('cost-caption').textContent=metric==='total'?'浅色表示缓存输入，深色表示非缓存输入＋输出。已记录小计下降 60.31%。旧版中断调用、可能存在的辅助 agent 用量及宿主侧工作未完整记录；旧版任务评估账本单独统计。':'在已记录的统计范围中，非缓存输入＋输出增加了 5.39%。这不是账单比较：不同模型 Token 的计费权重不同，旧版记录也不完整。';
}
function cases(query='') {
  const rows=data.case_comparison.filter(r=>r.old_classification==='regressed' && r.case.toLowerCase().includes(query.toLowerCase()));
  $('regression-list').innerHTML=rows.map(r=>`<details class="case"><summary><code>${escapeText(r.case)}</code><span class="case-state"><span class="badge bad">旧版失败</span>→<span class="badge good">本次通过</span></span></summary><p>原版基线：通过。本次对应检查： ${r.new_checks.map(escapeText).join(', ')}.<br>证据粒度：${r.new_evidence_resolution==='derived_from_frozen_selector_and_all_pass_group'?'根据未变的原始测试集合与冻结的选择条件推导用例范围；选中数量与整组全部通过的执行记录一致。':'标准输出或绑定到最终提交的高负载检查记录，包含该用例的独立结果。'}</p></details>`).join('') || '<p class="small">没有匹配的回归用例。</p>';
  $('case-count').textContent=`显示已记录的 23 项回归中的 ${rows.length} 项。全部 23 项均对应到本次最终候选版本的通过结果。`;
}
function wallTime() {
  const old=data.timing.old,newer=data.timing.new,roles=data.new_role_usage,ops=data.new_operation_totals;
  const modelNew=Object.values(roles).reduce((s,r)=>s+r.seconds,0);
  const oldValues=[old.completed_author_seconds,old.phase_seconds.baseline,old.phase_seconds.verifying,old.phase_seconds.installing,old.phase_seconds.task_effort_original];
  const newValues=[modelNew,ops.capture_baseline.seconds,ops.compare_behavior.seconds,ops.check_installation.seconds,0];
  oldValues.push(old.job_seconds-oldValues.reduce((a,b)=>a+b,0));newValues.push(newer.job_seconds-newValues.reduce((a,b)=>a+b,0));
  const labels=['已记录的模型调用','原版基线','候选版验证','安装','任务基线','其他／恢复'];
  const shades=['#7650ae','#b99bd5','#d8c7e7','#96b7aa','#c29e8c','#e9e3ed'];
  const scale=240*60;
  $('time-chart').innerHTML=[oldValues,newValues].map((v,i)=>`<div class="wall-row"><div><span>${i?'11月9日':'11月5日'}</span><span>${(v.reduce((a,b)=>a+b,0)/60).toFixed(1)} 分钟 <small> / 240 分钟刻度</small></span></div><div class="wall-track">${v.map((x,j)=>`<div class="wall-part" style="width:${100*x/scale}%;background:${shades[j]}" title="${labels[j]}: ${(x/60).toFixed(1)} 分钟"></div>`).join('')}</div></div>`).join('')+`<div class="wall-legend">${labels.map((l,i)=>`<span><i style="background:${shades[i]}"></i>${l}</span>`).join('')}</div>`;
}
function trajectory() {
  const W=900,H=300,L=42,R=20,T=25,B=45, xmax=220;
  const x=v=>L+v/xmax*(W-L-R), y=v=>H-B-v/21*(H-T-B);
  const points=[];
  const lines=['<svg viewBox="0 0 900 300" role="group" aria-label="共同检查组通过数量与任务经过时间的关系">'];
  [0,5,10,15,21].forEach(v=>lines.push(`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#eee6f6"/><text x="${L-12}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="#a08bae">${v}</text>`));
  [0,60,120,180,220].forEach(v=>lines.push(`<text x="${x(v)}" y="${H-B+23}" text-anchor="middle" font-size="11" fill="#a08bae">${v}分</text>`));
  ['old','new'].forEach(arm=>{
    const start=Date.parse(data.timing[arm].start), rows=arm==='old'?data.old_attempts.filter(r=>r.counts):data.new_attempts;
    const coords=rows.map((r,i)=>{
      const mins=(Date.parse(r.at)-start)/60000, passed=arm==='old'?r.counts.passed:r.common_passed;
      const text=`${arm==='old'?'11月5日第 '+r.attempt+' 次尝试':'11月9日候选版本 '+(i+1)}: 共同检查 ${passed}/21 组通过；提交后 ${mins.toFixed(1)} 分钟； ${number(arm==='old'?r.size.total_tokens:r.total_tokens)} 个 Token。${arm==='old'&&r.attempt===3?'缺少必需的运行数据。':''}`;
      points.push({arm,px:x(mins),py:y(passed),text});return `${x(mins)},${y(passed)}`;
    });
    lines.push(`<polyline points="${coords.join(' ')}" fill="none" stroke="${colors[arm]}" stroke-width="2.5"/>`);
  });
  points.forEach((p,i)=>lines.push(`<circle class="chart-point" data-point="${i}" tabindex="0" role="button" aria-label="${escapeText(p.text)}" cx="${p.px}" cy="${p.py}" r="5.5" fill="${colors[p.arm]}" stroke="white"><title>${escapeText(p.text)}</title></circle>`));
  lines.push('</svg>');$('trajectory-chart').innerHTML=lines.join('');
  document.querySelectorAll('[data-point]').forEach(node=>{
    const update=()=>{$('trajectory-selection').textContent=points[+node.dataset.point].text;};
    node.addEventListener('pointerenter',update);node.addEventListener('click',update);node.addEventListener('focus',update);node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();update();}});
  });
}
async function main() {
  const response=await fetch('comparison.json');if(!response.ok)throw Error('无法加载报告数据');data=await response.json();
  size('combined');costs('total');cases();wallTime();trajectory();
  document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>size(b.dataset.size)));
  document.querySelectorAll('[data-cost]').forEach(b=>b.addEventListener('click',()=>costs(b.dataset.cost)));
  $('case-filter').addEventListener('input',event=>cases(event.target.value));
  document.querySelectorAll('[data-run]').forEach(b=>b.addEventListener('click',()=>{
    const arm=b.dataset.run;press('[data-run]','run',arm);$('trajectory-grid').classList.toggle('single',arm!=='both');
    document.querySelectorAll('[data-column]').forEach(col=>col.hidden=arm!=='both'&&arm!==col.dataset.column);
  }));
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));}
  }),{rootMargin:'-10% 0px -65% 0px'});
  document.querySelectorAll('main section').forEach(section=>observer.observe(section));
  document.documentElement.dataset.ready='true';
}
main().catch(error=>{console.error(error);$('size-caption').textContent='交互数据未能加载，静态证据表格和下载链接仍可使用。';});
