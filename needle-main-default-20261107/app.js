'use strict';
const D=JSON.parse(document.getElementById('data').textContent),$=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('en-US').format(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={queued:'等待运行资源',preparing:'建立独立分支与工作区',baseline:'冻结原版功能基线',task_effort_design:'生成开发任务与隐藏验收',task_effort_original:'原版任务测量',task_effort:'第一次解题结束',refactoring:'首次独立重写',failed:'文件整合失败，流程停止'};
const descriptions={queued:'任务提交到 Slurm，等待运行资源。',preparing:'以固定原版提交创建工作区及功能计划。',baseline:'11 项保留检查全部通过；25 项未运行。',task_effort_design:'生成并冻结一个 modify 任务的开发和隐藏变体。',task_effort_original:'开始原版第一次开发任务解题。',task_effort:'第一次解题记录为 blocked。原版任务基线 unverified；其余重复和隐藏变体未完成。',refactoring:'重写 Agent 运行后退出码为 0。随后整合保护检查拒绝了生成的 LICENSE，候选验收尚未开始。',failed:'ValueError：生成输出触碰验证方保留的 LICENSE 文件。已生成文件与恢复记录留存，当前结果分支 HEAD 仍是原版。'};
const time=s=>new Date(s).toISOString().slice(11,19),duration=i=>i<D.events.length-1?((Date.parse(D.events[i+1].time)-Date.parse(D.events[i].time))/60000).toFixed(2)+' 分钟':'停止事件';
let selected=7,filter='passed';
function stages(){
 $('timeline-list').innerHTML=D.events.map((e,i)=>`<button data-stage="${i}" aria-pressed="${i===selected}"><span class="stage-dot ${i===7?'bad-dot':''}">${String(i+1).padStart(2,'0')}</span><span class="stage-label">${labels[e.phase]}<small>${time(e.time)} UTC</small></span><span class="stage-duration">${duration(i)}</span></button>`).join('');
 document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.stage);stages();}));
 const e=D.events[selected];$('stage-detail').innerHTML=`<span class="section-label">EVENT ${selected+1} / ${D.events.length}</span><h3>${labels[e.phase]}</h3><p>${descriptions[e.phase]}</p><div class="stage-detail-meta"><code>${esc(e.phase)}</code><span>${e.time.slice(0,10)} ${time(e.time)} UTC</span><span>${duration(selected)}</span></div><p class="event-original">${esc(e.message)}</p>`;
}
function checks(){const rows=D.checks.filter(c=>filter==='all'||c.status===filter);$('check-rows').innerHTML=rows.map(c=>`<tr><td>${esc(c.name)}</td><td><span class="result ${c.status==='passed'?'passed':'neutral'}">${c.status==='passed'?'通过':'未运行'}</span></td><td>${c.duration_seconds===null?'—':c.duration_seconds.toFixed(2)}</td></tr>`).join('');$('check-count').textContent='显示 '+rows.length+' / 36 项检查；原版保留检查为 11/11 通过。';document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.filter===filter));}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;checks();}));
function node(c,root=false){const kids=D.capabilities.filter(x=>x.parent===c.id);return `<details class="tree-node" ${root?'open':''}><summary>${esc(c.label)}</summary>${kids.length?'<div class="tree-children">'+kids.map(k=>node(k)).join('')+'</div>':'<p>'+esc(c.description)+'</p>'}</details>`;}
$('scope-tree').innerHTML=D.capabilities.filter(c=>!c.parent).map(c=>node(c,true)).join('');
$('expand-tree').addEventListener('click',()=>document.querySelectorAll('.tree-node').forEach(n=>n.open=true));
$('collapse-tree').addEventListener('click',()=>document.querySelectorAll('.tree-node').forEach((n,i)=>n.open=i===0));
$('usage-bars').innerHTML=D.usage.map(v=>`<div class="bar-row"><span class="bar-label">${esc(v.label)}</span><div class="bar-track"><div class="bar candidate" style="width:${v.usage.total_tokens/D.model_tokens*100}%"></div></div><span class="bar-value">${fmt(v.usage.total_tokens)}</span></div><p class="usage-duration">${(v.seconds/60).toFixed(2)} 分钟 · CLI usage complete</p>`).join('');
stages();checks();
