'use strict';
const D=JSON.parse(document.getElementById('data').textContent),$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('en-US').format(n), mins=s=>(s/60).toFixed(2), clock=t=>new Date(t).toISOString().slice(11,19);
let phase=0,filter='failed';
function showPhase(i){
 phase=i; const s=D.stages[i];
 document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.stage)===i));
 $('stage-detail').innerHTML=`<span class="section-label">PHASE 0${i+1} / 04</span><h3>${esc(s.label)} <span class="stage-time">${mins(s.seconds)} min</span></h3><p>${esc(s.description)}</p><p>${esc(s.detail)}</p><div class="stage-detail-meta"><span>${clock(s.start)} → ${clock(s.end)} UTC</span><span>墙钟时间的 ${(s.seconds/D.wall_seconds*100).toFixed(1)}%</span></div>`;
}
$('phase-strip').innerHTML=D.stages.map((s,i)=>`<button data-stage="${i}" style="flex:${s.seconds};background:${s.color}" aria-label="${esc(s.label)}，${mins(s.seconds)} 分钟" aria-pressed="${i===0}"><span>${mins(s.seconds)}</span></button>`).join('');
$('phase-legend').innerHTML=D.stages.map((s,i)=>`<button data-stage="${i}" aria-pressed="${i===0}"><i style="background:${s.color}"></i><span>${esc(s.label)}<small>${mins(s.seconds)} 分钟</small></span></button>`).join('');
document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>showPhase(Number(b.dataset.stage))));
$('event-log').innerHTML=D.events.map(e=>`<li><time datetime="${esc(e.time)}">${clock(e.time)}<small>${e.time.slice(0,10)}</small></time><div><b>${esc(e.label)}</b><p>${esc(e.description)}</p></div></li>`).join('');
function checks(){
 const rows=D.checks.filter(c=>filter==='all'||c.candidate===filter);
 $('check-rows').innerHTML=rows.map(c=>`<tr><td>${esc(c.name)}</td><td><span class="result ${c.original}">${c.original==='passed'?'通过':'已知失败'}</span></td><td><span class="result ${c.candidate==='not_required'?'neutral':c.candidate}">${c.candidate==='passed'?'一致':c.candidate==='failed'?'未通过':'非必需 · 未运行'}</span></td><td>${c.candidate_seconds==null?'—':c.candidate_seconds.toFixed(2)+' s'}</td></tr>`).join('');
 $('check-count').textContent=`显示 ${rows.length} / 29 项。首版必需检查 7/28 一致；原版检查 28/29 通过。`;
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.filter===filter));
}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;checks();}));

const capMap=new Map(D.capabilities.map(c=>[c.id,c])),groupMap=new Map(D.presentation_groups.map(g=>[g.id,g]));
const root={id:'needle',label:'Needle',description:'全功能保留 · 39 capabilities'};
const kids=id=>id==='needle'?D.presentation_groups.map(g=>g.id):groupMap.has(id)?groupMap.get(id).roots:D.capabilities.filter(c=>c.parent===id).map(c=>c.id);
const expanded=new Set(['needle']); let inspected='needle';
function treeNode(id){
 const item=id==='needle'?root:groupMap.get(id)||capMap.get(id),children=kids(id),open=expanded.has(id);
 const kind=id==='needle'?'FULL SCOPE':groupMap.has(id)?'展示分组':id;
 const title=groupMap.has(id)?item.label_zh:item.label;
 return `<li><div class="node-card ${inspected===id?'selected':''} ${groupMap.has(id)?'group-card':''}"><button class="node-label" data-inspect="${esc(id)}" aria-pressed="${inspected===id}"><b>${esc(title)}</b><small>${esc(kind)}</small></button>${children.length?`<button class="node-toggle" data-toggle="${esc(id)}" aria-label="${open?'收起':'展开'} ${esc(title)}" aria-expanded="${open}">${open?'−':'+'}</button>`:'<span class="leaf-dot" aria-hidden="true"></span>'}</div>${children.length&&open?'<ul class="branch">'+children.map(treeNode).join('')+'</ul>':''}</li>`;
}
function draw(){
 const viewport=$('graph-viewport'),sx=viewport.scrollLeft,sy=viewport.scrollTop;
 $('scope-tree').innerHTML='<ul class="tree-root">'+treeNode('needle')+'</ul>';
 document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{expanded.has(b.dataset.toggle)?expanded.delete(b.dataset.toggle):expanded.add(b.dataset.toggle);draw();}));
 document.querySelectorAll('[data-inspect]').forEach(b=>b.addEventListener('click',()=>{inspected=b.dataset.inspect;draw();inspect();}));
 $('visible-count').textContent=`${document.querySelectorAll('.node-card').length} 个可见节点 · 点击 + 展开`;
 viewport.scrollLeft=sx;viewport.scrollTop=sy;
}
function inspect(){
 const item=capMap.get(inspected),group=groupMap.get(inspected);
 if(!item){$('scope-inspector').innerHTML=`<span class="section-label">${group?'PRESENTATION GROUP':'FULL SCOPE'}</span><h3>${group?esc(group.label):'Needle · 完整功能保留'}</h3><p>${group?'该分组用于组织展示；展开后可选择具体能力查看说明和关联检查。':'39 个原计划能力全部保留，未移除功能。展开五个领域查看具体分支；原版与候选的检查结果见上方对比。'}</p>`;return;}
 const associated=D.checks.filter(c=>c.related_capabilities.includes(item.id));
 $('scope-inspector').innerHTML=`<span class="section-label">RETAINED CAPABILITY · ${esc(item.id)}</span><h3>${esc(item.label)}</h3><p>${esc(item.description)}</p><div class="associated-checks">${associated.length?associated.map(c=>`<span><code>${esc(c.name)}</code><small>原版${c.original==='passed'?'通过':'已知失败'} · 候选${c.candidate==='passed'?'一致':c.candidate==='failed'?'未通过':'非必需 / 未运行'}</small></span>`).join(''):'<p>没有关联检查。保留范围不等于已有验证证据。</p>'}</div><p class="inspector-note">关联检查可能同时涉及多个能力，仅作上下文，不代表该节点已通过或失败。</p>`;
}
$('expand-tree').addEventListener('click',()=>{['needle',...groupMap.keys(),...capMap.keys()].forEach(id=>expanded.add(id));draw();});
$('collapse-tree').addEventListener('click',()=>{expanded.clear();expanded.add('needle');inspected='needle';draw();inspect();$('graph-viewport').scrollTo(0,0);});

let usageSelected=D.usage[0].role;
function showUsage(role){
 usageSelected=role; const u=D.usage.find(r=>r.role===role),o=u.observed;
 document.querySelectorAll('[data-role]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.role===role));
 $('usage-detail').innerHTML=`<b>${esc(u.label)}</b><p>${u.calls} 次登记调用 · ${u.status==='complete'?'用量完整':u.status==='partial'?'用量部分可得':'用量未知'}</p><dl><div><dt>已完成调用 tokens</dt><dd>${o.total_tokens==null?'未知':fmt(o.total_tokens)}</dd></div><div><dt>其中缓存输入</dt><dd>${o.cached_input_tokens==null?'未知':fmt(o.cached_input_tokens)}</dd></div><div><dt>该角色完整总量</dt><dd>${u.total_tokens==null?'未知':fmt(u.total_tokens)}</dd></div></dl>`;
}
const maxUsage=Math.max(...D.usage.map(u=>u.observed.total_tokens||0));
$('usage-bars').innerHTML=D.usage.map(u=>`<button data-role="${u.role}" aria-pressed="${u.role===usageSelected}" class="usage-row"><span class="usage-label">${esc(u.label)}</span><span class="usage-track"><span style="width:${(u.observed.total_tokens||0)/maxUsage*100}%"></span></span><span class="usage-value">${u.observed.total_tokens==null?'未知':(u.observed.total_tokens/1e6).toFixed(2)+'M'}</span></button>`).join('');
document.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>showUsage(b.dataset.role)));
showPhase(0);checks();draw();inspect();showUsage(usageSelected);
