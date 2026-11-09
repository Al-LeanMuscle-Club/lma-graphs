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
  $('size-chart').innerHTML = values.map((v,i) => `<div class="bar-row"><span class="bar-label">${['Original','Nov 5','Nov 9'][i]}</span><div class="bar-track"><div class="bar-fill ${['original','old','new'][i]}" style="width:${100*v/values[0]}%"></div></div><span class="bar-value">${number(v)}<small>${(100*v/values[0]).toFixed(2)}% retained</small></span></div>`).join('');
  $('size-caption').textContent = metric === 'combined' ? 'Frozen source + configuration inventory. Headline reductions: old 56.56%; new 49.40%. SVGs and llms.txt materially affect the denominator.' : metric === 'adjusted' ? 'Exact same eight documentation paths excluded in both arms. Reduction: old 28.20%; new 16.42%. Required runtime JSON remains counted.' : 'Production source category: old 33.62% reduction; new 26.60%. Relocating environment literals to JSON also reduces this source-only figure.';
}
function costs(metric) {
  press('[data-cost]', 'cost', metric);
  const arms=['old','new'], rows=arms.map(arm=>data.token_summary[arm]);
  const amounts=rows.map(r=>metric==='total'?r.total:r.uncached_input+r.output), max=Math.max(...amounts);
  $('cost-chart').innerHTML=rows.map((r,i)=>{
    const amount=amounts[i], cache=metric==='total'?r.cached:0;
    return `<div class="bar-row"><span class="bar-label">${i?'Nov 9':'Nov 5'}</span><div class="bar-track"><div class="bar-fill" style="width:${100*amount/max}%"><div class="segment cache-${arms[i]}" style="width:${100*cache/amount}%" title="Cached input: ${number(cache)}"></div><div class="segment uncached-${arms[i]}" style="width:${100*(amount-cache)/amount}%" title="Uncached input + output: ${number(amount-cache)}"></div></div></div><span class="bar-value">${(amount/1e6).toFixed(3)}M<small>${i?'15 complete receipts':'9 completed streams; incomplete'}</small></span></div>`;
  }).join('');
  $('cost-caption').textContent=metric==='total'?'Pale = cached input; dark = uncached input + output. Recorded subtotal decreased 60.31%. The old interrupted call, potentially helper usage and host work are missing; the old task ledger is separate.':'Uncached input + output increased 5.39% in these recorded scopes. This is not a billing comparison; model tokens have different billing weights and old coverage is incomplete.';
}
function cases(query='') {
  const rows=data.case_comparison.filter(r=>r.old_classification==='regressed' && r.case.toLowerCase().includes(query.toLowerCase()));
  $('regression-list').innerHTML=rows.map(r=>`<details class="case"><summary><code>${escapeText(r.case)}</code><span class="case-state"><span class="badge bad">Old failed</span>→<span class="badge good">New passed</span></span></summary><p>Original baseline: passed. New checks: ${r.new_checks.map(escapeText).join(', ')}.<br>Evidence: ${r.new_evidence_resolution==='derived_from_frozen_selector_and_all_pass_group'?'Membership derived from the unchanged original test set and frozen selector; selected count equals the all-pass receipt.':'Individual case result recorded in stdout or a commit-bound heavy-check receipt.'}</p></details>`).join('') || '<p class="small">No matching regression cases.</p>';
  $('case-count').textContent=`Showing ${rows.length} of 23 recorded regressions. All 23 map to passing results on the final new candidate.`;
}
function wallTime() {
  const old=data.timing.old,newer=data.timing.new,roles=data.new_role_usage,ops=data.new_operation_totals;
  const modelNew=Object.values(roles).reduce((s,r)=>s+r.seconds,0);
  const oldValues=[old.completed_author_seconds,old.phase_seconds.baseline,old.phase_seconds.verifying,old.phase_seconds.installing,old.phase_seconds.task_effort_original];
  const newValues=[modelNew,ops.capture_baseline.seconds,ops.compare_behavior.seconds,ops.check_installation.seconds,0];
  oldValues.push(old.job_seconds-oldValues.reduce((a,b)=>a+b,0));newValues.push(newer.job_seconds-newValues.reduce((a,b)=>a+b,0));
  const labels=['Recorded model calls','Original baseline','Candidate verification','Installation','Task baseline','Other / recovery'];
  const shades=['#7650ae','#b99bd5','#d8c7e7','#96b7aa','#c29e8c','#e9e3ed'];
  const scale=240*60;
  $('time-chart').innerHTML=[oldValues,newValues].map((v,i)=>`<div class="wall-row"><div><span>${i?'Nov 9':'Nov 5'}</span><span>${(v.reduce((a,b)=>a+b,0)/60).toFixed(1)} min <small> / 240-minute scale</small></span></div><div class="wall-track">${v.map((x,j)=>`<div class="wall-part" style="width:${100*x/scale}%;background:${shades[j]}" title="${labels[j]}: ${(x/60).toFixed(1)} min"></div>`).join('')}</div></div>`).join('')+`<div class="wall-legend">${labels.map((l,i)=>`<span><i style="background:${shades[i]}"></i>${l}</span>`).join('')}</div>`;
}
function trajectory() {
  const W=900,H=300,L=42,R=20,T=25,B=45, xmax=220;
  const x=v=>L+v/xmax*(W-L-R), y=v=>H-B-v/21*(H-T-B);
  const points=[];
  const lines=['<svg viewBox="0 0 900 300" role="group" aria-label="Passing common check groups by elapsed job minutes">'];
  [0,5,10,15,21].forEach(v=>lines.push(`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" stroke="#eee6f6"/><text x="${L-12}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="#a08bae">${v}</text>`));
  [0,60,120,180,220].forEach(v=>lines.push(`<text x="${x(v)}" y="${H-B+23}" text-anchor="middle" font-size="11" fill="#a08bae">${v}m</text>`));
  ['old','new'].forEach(arm=>{
    const start=Date.parse(data.timing[arm].start), rows=arm==='old'?data.old_attempts.filter(r=>r.counts):data.new_attempts;
    const coords=rows.map((r,i)=>{
      const mins=(Date.parse(r.at)-start)/60000, passed=arm==='old'?r.counts.passed:r.common_passed;
      const text=`${arm==='old'?'Nov 5 attempt '+r.attempt:'Nov 9 candidate '+(i+1)}: ${passed}/21 common groups; ${mins.toFixed(1)} min after submission; ${number(arm==='old'?r.size.total_tokens:r.total_tokens)} tokens.${arm==='old'&&r.attempt===3?' Required runtime data absent.':''}`;
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
  const response=await fetch('comparison.json');if(!response.ok)throw Error('Report data unavailable');data=await response.json();
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
main().catch(error=>{console.error(error);$('size-caption').textContent='Interactive data did not load. The evidence tables and download links remain available.';});
