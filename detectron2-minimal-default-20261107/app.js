'use strict';
const D=JSON.parse(document.getElementById('data').textContent),$=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('en-US').format(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let attempt=10,filter='all';
function renderChecks(){
 const a=D.attempts[attempt],failures=Object.fromEntries(a.failed.map(f=>[f.name,f.status]));
 $('attempt-title').textContent=(attempt===0?'首次重写':'第 '+attempt+' 轮修复')+' · '+a.passed.length+' / 23 通过';
 $('attempt-meta').textContent=a.sha.slice(0,10)+' · 重写 '+(a.runner.duration/60).toFixed(1)+' 分钟 · 本轮重写与判定 '+fmt(a.tokens)+' tokens';
 const rows=D.original.passing.map(name=>({name,status:failures[name]||'passed'})).filter(c=>filter==='all'||(filter==='passed'?c.status==='passed':c.status!=='passed'));
 $('check-rows').innerHTML=rows.map(c=>`<tr><td>${esc(c.name.replace('upstream:',''))}</td><td><span class="result ${c.status==='passed'?'passed':c.status==='output_changed'?'changed':'failed'}">${c.status==='passed'?'通过':c.status==='output_changed'?'输出不同':'未通过'}</span></td></tr>`).join('');
 $('check-count').textContent='显示 '+rows.length+' / 23 项检查。原版基线：23 / 23 通过。';
 document.querySelectorAll('[data-attempt]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.attempt)===attempt));
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.filter===filter));
 document.querySelectorAll('[data-point]').forEach(p=>{const active=Number(p.dataset.point)===attempt;p.setAttribute('r',active?7:4);p.setAttribute('fill',active?'#6135bb':'#b79bdc');});
}
const x=i=>45+i*63,y=n=>180-n*6;
$('trajectory').innerHTML=`<line x1="45" y1="${y(23)}" x2="675" y2="${y(23)}" stroke="#c5b5da" stroke-dasharray="5 5"/><text x="13" y="${y(23)+5}">23</text><line x1="45" y1="180" x2="675" y2="180" stroke="#e6dff0"/><text x="22" y="185">0</text><polyline points="${D.attempts.map(a=>x(a.n)+','+y(a.passed.length)).join(' ')}" fill="none" stroke="#6135bb" stroke-width="3"/>${D.attempts.map(a=>`<circle data-point="${a.n}" cx="${x(a.n)}" cy="${y(a.passed.length)}" r="4" fill="#b79bdc"/><text x="${x(a.n)}" y="${y(a.passed.length)-17}" text-anchor="middle">${a.passed.length}</text><text x="${x(a.n)}" y="209" text-anchor="middle">${a.n}</text>`).join('')}`;
$('attempt-tabs').innerHTML=D.attempts.map(a=>`<button data-attempt="${a.n}" aria-label="${a.n===0?'首次重写':'第 '+a.n+' 轮修复'}" aria-pressed="${a.n===10}">${a.n}</button>`).join('');
document.querySelectorAll('[data-attempt]').forEach(b=>b.addEventListener('click',()=>{attempt=Number(b.dataset.attempt);renderChecks();}));
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;renderChecks();}));
function node(c,root=false){const children=D.capabilities.filter(v=>v.parent===c.id),features=c.features||[];return `<details class="tree-node" ${root?'open':''}><summary>${root?'Detectron2 · 默认保留范围':esc(c.label)}</summary>${c.description&&!children.length?`<p>${esc(c.description)}</p>`:''}${children.length?`<div class="tree-children">${children.map(c=>node(c)).join('')}</div>`:''}${features.length?`<ul class="features">${features.map(f=>`<li><b>${esc(f.label)}</b><p>${esc(f.description)}</p></li>`).join('')}</ul>`:''}</details>`;}
$('scope-tree').innerHTML=D.capabilities.filter(c=>!c.parent).map(c=>node(c,true)).join('');
$('removed-list').innerHTML=D.removed.map(label=>'<li>'+esc(label)+'</li>').join('');
$('expand-tree').addEventListener('click',()=>document.querySelectorAll('.tree-node').forEach(d=>d.open=true));
$('collapse-tree').addEventListener('click',()=>document.querySelectorAll('.tree-node').forEach((d,i)=>d.open=i===0));
function bar(label,n,max,kind=''){return `<div class="bar-row"><span class="bar-label">${esc(label)}</span><div class="bar-track"><div class="bar ${kind}" style="width:${n/max*100}%"></div></div><span class="bar-value">${fmt(n)}</span></div>`;}
function renderSize(){const metric=$('size-metric').value,b=D.original.size[metric],a=D.best.size[metric];$('size-reduction').textContent='↓ '+(100*(1-a/b)).toFixed(2)+'%';$('size-bars').innerHTML=bar('完整原版',b,b)+bar('核心范围候选',a,b,'candidate');$('size-values').textContent={bytes:'3,160,245 → 118,630 bytes；按源码文件计量，不包含测试和依赖文件。',lines:'71,189 → 2,823 行；以换行符计数，没有将行数当作源码 tokens。',files:'447 → 59 个源码文件；斜线柱代表功能验收未通过的候选。'}[metric];}
$('size-metric').addEventListener('change',renderSize);
const labels={rewrite:'重写与修复',judge:'独立判定',solver_original:'原版做题',solver_candidate:'候选做题',examiner:'出题'};
$('usage-bars').innerHTML=Object.entries(labels).map(([k,l])=>bar(l,D.usage[k],D.usage.total,'candidate')).join('');
document.querySelectorAll('[data-paper]').forEach(a=>a.addEventListener('click',()=>{$('full-report').open=true;}));
function hash(){if(location.hash==='#paper')$('full-report').open=true;}window.addEventListener('hashchange',hash);hash();renderChecks();renderSize();
