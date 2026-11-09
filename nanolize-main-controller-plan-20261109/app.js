'use strict';
const D = JSON.parse(document.querySelector('#report-data').textContent);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list = items => '<ul class="plain-list">'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
const external = (url,label) => '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>';
const num = n => n.toLocaleString('en-US');
const node = (id,title,role,description) => ({id,title,role,description});
const flows = {
 proposed:{label:'拟议方案 · 按需介入，尚未实现',summary:'主线保持 main 调度；只有触发、预算与校验都通过，建议才影响下一步。',nodes:[
  node('observe','读取当前证据','程序','整理本轮候选、功能回归、未验证状态和已有收据。冻结输入异常不能交给模型裁决。'),
  node('default','生成默认下一步','原 main 程序','沿用当前的实现、定向修复、恢复、完整验证或收尾判断。保留可继续执行的默认动作。'),
  node('gate','是否值得介入？','确定性规则','普通完成、一次普通修复均不触发。连续停滞、反复回归或有证据的知识缺口才进入准入判断。'),
  node('budget','预算是否允许？','程序','检查决策次数、剩余时间、已记录 tokens 与用量完整性；预算不足不启动模型，也不增加 Author 配额。'),
  node('decision','咨询一次建议','Controller 模型','接收简短的变化与失败摘要、必要规格和剩余预算，只输出当前边界的一条结构化建议。'),
  node('validate','建议能否执行？','程序','检查 action 白名单、当前候选、契约与环境绑定、证据引用、范围和预算。非法或过期建议不能直接执行。'),
  node('execute','执行与验证','原 main 程序 + Author','执行通过校验的建议或原默认动作。需要修改代码时才调用 Author；筛查后仍需完整验收。'),
  node('finish','继续原流程或结束','原 main 程序','记录候选、进展与费用。按原配置继续任务评测或收尾，不因建议体积未达重开纯压缩循环。')
 ]},
 main:{label:'当前 main · 已核对的调度结构',summary:'模型负责实现与修复，程序控制下一步；已有定向检查与候选恢复。',nodes:[
  node('main-input','冻结输入与规格','程序','使用知识包、功能范围、原版基线和已有配置准备任务；Author 遵守 source-free 边界。'),
  node('main-author','实现或修复','Author 模型','根据当前规格与证据生成代码。main 不是无模型流水线，固定的是调度方式。'),
  node('main-check','筛查与完整验收','程序','相关能力、依赖与常驻检查用于修复筛查；最终通过仍需完整验收。'),
  node('main-next','计算下一步','程序','根据回归、未验证状态和预算选择继续修复、恢复已保存候选或停止；恢复后重新验证。'),
  node('main-task','配置的任务评测','任务评测流程','功能通过后不再进行纯体积优化；独立任务成本评测与相应优化仍按配置运行。'),
  node('main-finish','保存与报告','程序','保留最终结果、验证缺口、候选与报告。目前 Author 收据仍可能缺失完整模型用量。')
 ]},
 historical:{label:'旧 tqdm 实验 · Controller 调度方式的概念概括',summary:'此处描述历史比较报告中的运行方式，不代表 Controller 分支现在的最新实现。',nodes:[
  node('old-decide','模型决定下一步','Controller','模型反复读取状态并选择工具或下一阶段。那次实验记录了 13 次决策调用。'),
  node('old-execute','调用执行工具','程序与 Author','执行实现、修复或进一步压缩；既有预算和验收仍影响可执行操作。'),
  node('old-read','把执行结果交回模型','Controller','重新分析候选和验证反馈，再判断是否继续。决策输入和调用本身产生额外成本。'),
  node('old-repeat','继续决策或结束','循环决策','历史运行在功能通过后仍进行了四次体积优化。该记录说明额外工作来自哪些环节，不能证明本方案已经更快。')
 ]}
};
let flowMode='proposed',scenario=D.scenarios[0],step=0,selectedNode='observe';
function renderFlow(){
 const flow=flows[flowMode];
 $$('[data-flow]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.flow===flowMode)));
 const pathIds=flowMode==='proposed'?scenario.route:flow.nodes.map(n=>n.id);
 $('#flow-summary').innerHTML='<div><span>'+esc(flow.label)+'</span><p class="flow-route"><strong>'+(flowMode==='proposed'?'本情景路径':'概念顺序')+'：</strong>'+pathIds.map(id=>esc(flow.nodes.find(n=>n.id===id).title)).join(' <span aria-hidden="true">→</span> ')+(flowMode==='historical'?' → 再次决策或结束':'')+'</p></div>';
 const route=scenario.route;
 $('#flow-map').className='flow-map '+flowMode;
 $('#flow-map').innerHTML=flow.nodes.map((n,i)=>{
  const visited=flowMode==='proposed'&&route.slice(0,step).includes(n.id);
  const current=flowMode==='proposed'&&route[step]===n.id;
  const optional=['budget','decision','validate'].includes(n.id);
  return '<button class="flow-node'+(optional?' optional':'')+(visited?' visited':'')+(current?' current':'')+'" data-node="'+n.id+'" aria-pressed="'+(selectedNode===n.id)+'"><span class="node-index">'+String(i+1).padStart(2,'0')+(optional?' · 条件分支':'')+'</span><strong>'+esc(n.title)+'</strong><small>'+esc(n.role)+'</small>'+(current?'<span class="current-label">演示当前位置</span>':'')+'</button>';
 }).join('');
 const n=flow.nodes.find(n=>n.id===selectedNode)||flow.nodes[0];
 $('#flow-detail').innerHTML='<span class="section-label">'+esc(n.role)+'</span><h3>'+esc(n.title)+'</h3><p>'+esc(n.description)+'</p><p class="chart-note">'+esc(flow.summary)+'</p>';
 $$('[data-node]').forEach(b=>b.addEventListener('click',()=>{selectedNode=b.dataset.node;renderFlow();}));
}
function renderScenario(){
 $('#scenario-fact').innerHTML='<span class="badge">'+esc(scenario.title)+'</span><p>'+esc(scenario.fact)+'</p>';
 $('#step-count').textContent=(step+1)+' / '+scenario.route.length+' 步';
 $('#step-prev').disabled=step===0;$('#step-next').disabled=step===scenario.route.length-1;
 const atEnd=step===scenario.route.length-1;
 $('#scenario-outcome').innerHTML='<strong>本情景计划：'+scenario.calls+' 次 Controller 调用</strong><p>'+(atEnd?'演示到达路径终点。':'当前演示节点：'+esc(flows.proposed.nodes.find(n=>n.id===scenario.route[step]).title)+'。')+' '+esc(scenario.outcome)+'</p><small>'+esc(scenario.caveat)+'</small>';
}
function moveStep(next){step=next;flowMode='proposed';selectedNode=scenario.route[step];renderFlow();renderScenario();}
$('#scenario-select').innerHTML=D.scenarios.map(s=>'<option value="'+s.id+'">'+esc(s.title)+'</option>').join('');
$('#scenario-select').addEventListener('change',e=>{scenario=D.scenarios.find(s=>s.id===e.target.value);moveStep(0);});
$('#step-prev').addEventListener('click',()=>moveStep(Math.max(0,step-1)));
$('#step-next').addEventListener('click',()=>moveStep(Math.min(scenario.route.length-1,step+1)));
$('#step-reset').addEventListener('click',()=>moveStep(0));
$$('[data-flow]').forEach(b=>b.addEventListener('click',()=>{flowMode=b.dataset.flow;selectedNode=flowMode==='proposed'?scenario.route[step]:flows[flowMode].nodes[0].id;renderFlow();}));
renderFlow();renderScenario();

const kinds={new:'拟新增',modify:'修改现有',mixed:'新增与调整'};
let kind='all',selectedChange='pipeline';
const openGroups=new Set(['运行主线']);
function changeHTML(c){
 return '<div class="heading-row"><span class="badge">'+kinds[c.kind]+'</span><span class="section-label">'+esc(c.phase)+' · '+esc(c.group)+'</span></div><h3>'+esc(c.title)+'</h3><div class="change-paths">'+c.paths.map(p=>'<code>'+esc(p)+'</code>').join('')+'</div><h4>已核对的起点</h4><p>'+esc(c.current)+'</p><h4>拟议修改</h4>'+list(c.proposed)+'<h4>验收时检查什么</h4>'+list(c.tests)+'<div class="change-source">'+(c.source?external(c.source,'核对当前 main 源码'):'拟新增模块；实现前无源码链接')+'</div>';
}
function renderChanges(){
 const query=$('#file-search').value.trim().toLocaleLowerCase();
 const visible=D.changes.filter(c=>(kind==='all'||c.kind===kind)&&JSON.stringify(c).toLocaleLowerCase().includes(query));
 if(!visible.some(c=>c.id===selectedChange))selectedChange=visible[0]?.id;
 $('#file-count').textContent=visible.length+' / '+D.changes.length+' 组变更 · 选择分组中的条目查看细节';
 $$('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(kind===b.dataset.kind)));
 const groups=[...new Set(visible.map(c=>c.group))];
 $('#change-tree').innerHTML=groups.length?groups.map(g=>'<details data-group="'+esc(g)+'"'+(query||kind!=='all'||openGroups.has(g)?' open':'')+'><summary>'+esc(g)+'<span>'+visible.filter(c=>c.group===g).length+'</span></summary><div>'+visible.filter(c=>c.group===g).map(c=>'<button data-change="'+c.id+'" aria-pressed="'+(c.id===selectedChange)+'"><span>'+esc(c.title)+'</span><small>'+esc(c.paths[0].split('/').pop())+'</small></button>').join('')+'</div></details>').join(''):'<p class="muted">没有匹配的变更。试试“预算”“恢复”或文件名。</p>';
 $('#change-detail').innerHTML=visible.length?changeHTML(visible.find(c=>c.id===selectedChange)):'<h3>未找到匹配项</h3><p>清空关键词或切换到“全部”查看完整清单。</p>';
 $$('[data-change]').forEach(b=>b.addEventListener('click',()=>{selectedChange=b.dataset.change;renderChanges();}));
 $$('[data-group]').forEach(el=>el.addEventListener('toggle',()=>{if(el.open)openGroups.add(el.dataset.group);else openGroups.delete(el.dataset.group);}));
}
$('#file-search').addEventListener('input',renderChanges);
$$('[data-kind]').forEach(b=>b.addEventListener('click',()=>{kind=b.dataset.kind;renderChanges();}));
renderChanges();
const appendix=document.createElement('div');appendix.id='print-changes';appendix.className='print-only';appendix.innerHTML=D.changes.map(c=>'<article class="print-change">'+changeHTML(c)+'</article>').join('');$('#change-detail').parentElement.after(appendix);

function renderBudget(){
 const calls=Number($('#spent-calls').value),seconds=Number($('#spent-time').value),tokens=Number($('#spent-tokens').value),mode=$('#usage-mode').value;
 const b=D.budgets,remaining={calls:Math.max(0,b.max_calls-calls),seconds:Math.max(0,b.total_seconds-seconds),tokens:Math.max(0,b.total_tokens-tokens)};
 $('#calls-value').textContent=calls+' 次';$('#time-value').textContent=seconds+' 秒';$('#tokens-value').textContent=num(tokens);
 const reasons=[];
 if(!remaining.calls)reasons.push('决策次数已用完');if(!remaining.seconds)reasons.push('累计时间已用完');if(!remaining.tokens)reasons.push('token 准入预算已用完');if(mode==='missing')reasons.push('存在缺失用量，不能按零结算');
 const allowed=!reasons.length;
 const caveat=mode==='settled'?'结束后结算可能出现单次 token 超额；结算后禁止超预算的下一次调用。':mode==='stream'?'流式用量可支持更及时停止，但事件延迟仍可能造成实际超额，必须记录。':'用量记录不完整时暂停后续决策调用；剩余已知 tokens 不是实际余额。';
 $('#budget-result').className='budget-result '+(allowed?'allowed':'stopped');
 $('#budget-result').innerHTML='<span class="section-label">'+(allowed?'ADMISSION ALLOWED':'NO NEW CONTROLLER CALL')+'</span><h3>'+(allowed?'允许再启动一次受限决策':'不再启动 Controller')+'</h3><p>'+(allowed?'下一次最多 '+Math.min(b.per_call_seconds,remaining.seconds)+' 秒；剩余 '+remaining.calls+' 次、已知可用 '+num(remaining.tokens)+' tokens。':reasons.map(esc).join('；')+'。')+'</p><p class="small">'+esc(caveat)+'</p><p class="small">实际运行还受作业剩余时间、建议合法性和原 Author 预算约束。本演示不预测节省量。</p>';
}
['spent-calls','spent-time','spent-tokens','usage-mode'].forEach(id=>$('#'+id).addEventListener('input',renderBudget));renderBudget();
$('#gate-table').innerHTML='<table><thead><tr><th scope="col">合并检查</th><th scope="col">要求与证据</th><th scope="col">不能接受的结果</th></tr></thead><tbody>'+D.gates.map(g=>'<tr><th scope="row"><span class="section-label">'+g.id+'</span>'+esc(g.name)+'</th><td>'+esc(g.rule)+'<small class="table-evidence">所需证据：'+esc(g.evidence)+'</small></td><td>'+esc(g.fail)+'</td></tr>').join('')+'</tbody></table>';
$('#milestones').innerHTML=D.milestones.map(m=>'<article><div class="milestone-id">'+m.id+'</div><div><h3>'+esc(m.title)+'</h3><p>'+esc(m.deliverable)+'</p><small><strong>退出条件</strong> '+esc(m.exit)+'</small></div></article>').join('');
$('#source-links').innerHTML=D.sources.map(s=>'<article>'+external(s.url,s.title)+'<code>'+esc(s.path)+':'+s.line+'</code></article>').join('');
$('#snapshot').textContent='基线 '+D.baseline.commit.slice(0,12)+' · 2026-11-09';
$('#print-report').addEventListener('click',()=>window.print());
let printClosed=[];
window.addEventListener('beforeprint',()=>{printClosed=$$('details:not([open])');printClosed.forEach(el=>el.open=true);});
window.addEventListener('afterprint',()=>{printClosed.forEach(el=>el.open=false);printClosed=[];});
const toc=$$('.toc a[href^="#"]');
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)toc.forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));},{rootMargin:'-10% 0px -65% 0px'});$$('.section').forEach(s=>observer.observe(s));}
