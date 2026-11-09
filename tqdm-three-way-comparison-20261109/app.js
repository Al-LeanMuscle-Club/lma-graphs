'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => new Intl.NumberFormat('en-US').format(n);
const million = n => (n / 1e6).toFixed(3) + 'M';
const duration = s => {const t = Math.round(s); return (t >= 3600 ? Math.floor(t / 3600) + '小时 ' : '') + Math.floor(t % 3600 / 60) + '分 ' + t % 60 + '秒';};
const clockUTC = seconds => new Date(seconds * 1000).toISOString().slice(11,19);
const runKeys = ['main','controller','memory','readable'];
const roleTitles = {author:'实现 / 修复 / 优化',controller:'Controller 决策',task_examiner:'任务出题',task_solver:'任务解题'};
const roleColors = {author:'#8054d5',controller:'#baa3e9',task_examiner:'#db9e45',task_solver:'#248b80'};
let data, metric = 'total_tokens', tokenMode = 'total_tokens', selected = {key:'readable',index:2};
const active = new Set(runKeys);
const header = first => '<thead><tr><th scope="col">' + first + '</th>' + runKeys.map(k => '<th scope="col"><span class="run-dot ' + k + '"></span> ' + esc(data.runs[k].name) + '</th>').join('') + '</tr></thead>';
const row = (label, values, cls='') => '<tr class="'+cls+'"><th scope="row">'+label+'</th>'+values.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
const tag = (pass, text) => '<span class="tag '+(pass?'pass':'fail')+'">'+esc(text ?? (pass?'通过':'未通过'))+'</span>';
function renderOverview(){
  $('#run-cards').innerHTML = runKeys.map(k=>{const r=data.runs[k];const p=r.retained_percent.total_tokens;return '<article class="run-card" style="--run-color:'+r.color+'"><div class="run-name"><i class="run-dot '+k+'"></i>'+esc(r.name)+'</div><div class="run-number'+(k==='controller'?' precise':'')+'">'+p.toFixed(k==='controller'?4:2)+'<small>%</small></div><div class="run-caption">源码＋配置保留比例</div><div class="run-micro"><span>源码保留<strong>'+r.retained_percent.source_tokens.toFixed(2)+'%</strong></span><span>流程耗时<strong>'+(r.wall_seconds/60).toFixed(1)+' 分钟</strong></span></div></article>';}).join('');
  const rows = [
    ['最终源码 tokens',runKeys.map(k=>'<strong>'+fmt(data.runs[k].candidate_tokens.source_tokens)+'</strong>')],
    ['源码保留比例',runKeys.map(k=>data.runs[k].retained_percent.source_tokens.toFixed(2)+'%')],
    ['最终配置 tokens',runKeys.map(k=>fmt(data.runs[k].candidate_tokens.configuration_tokens))],
    ['源码＋配置 tokens',runKeys.map(k=>'<strong>'+fmt(data.runs[k].candidate_tokens.total_tokens)+'</strong>')],
    ['源码＋配置保留比例',runKeys.map(k=>data.runs[k].retained_percent.total_tokens.toFixed(4)+'%')],
    ['体积验收要求',['总量 &lt;50%','总量 &lt;50%','源码与总量各 &lt;50%','<span class="tag neutral">不设比例门槛</span>']],
    ['原流程行为检查',runKeys.map(k=>{const n=data.runs[k].historical_checks.passed;return n+'/'+n+' 组<span class="number-small">检查集合不完全相同</span>';})],
    ['保存的候选版本',runKeys.map(k=>data.runs[k].history.length+' 个')],
    ['Author 调用',runKeys.map(k=>data.runs[k].usage_by_role.author.calls+' 次'+(k==='main'?'<span class="number-small">含 1 次中断</span>':''))],
    ['流程耗时',runKeys.map(k=>duration(data.runs[k].wall_seconds))]
  ];
  $('#overview-table').innerHTML=header('指标')+'<tbody>'+rows.map(r=>row(...r)).join('')+'</tbody>';
}
function selectIssue(id){
  const issue=data.quality_matrix.find(x=>x.id===id);
  $$('#quality-table tbody tr').forEach(el=>{el.classList.toggle('selected',el.dataset.issue===id);el.setAttribute('aria-selected',String(el.dataset.issue===id));});
  $('#issue-detail').innerHTML='<span class="issue-kicker">SUPPLEMENTAL CHECK</span><h3>'+esc(issue.title)+'</h3><span class="tag neutral">'+esc(issue.scope)+'</span><p style="margin-top:16px">'+esc(issue.detail)+'</p><div class="issue-results">'+runKeys.map(k=>'<div><span>'+esc(data.runs[k].name)+'</span><span class="result-mark '+(data.runs[k].quality_probes[issue.key].passed?'pass':'fail')+'">'+esc(issue.results[k])+'</span></div>').join('')+'</div>';
}
function renderQuality(){
  $('#quality-table').innerHTML=header('统一补测')+'<tbody>'+data.quality_matrix.map(issue=>'<tr data-issue="'+issue.id+'" tabindex="0" aria-selected="false"><th scope="row">'+esc(issue.title)+'</th>'+runKeys.map(k=>{const pass=data.runs[k].quality_probes[issue.key].passed;return '<td><span class="result-mark '+(pass?'pass':'fail')+'">'+(pass?'✓ 通过':'× 失败')+'</span></td>';}).join('')+'</tr>').join('')+'</tbody>';
  $('#quality-table').addEventListener('click',e=>{const r=e.target.closest('[data-issue]');if(r)selectIssue(r.dataset.issue);});
  $('#quality-table').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const r=e.target.closest('[data-issue]');if(r){e.preventDefault();selectIssue(r.dataset.issue);}}});
  selectIssue('cli');
  const workloads={disabled:'禁用显示 · 100 万次迭代',automatic:'自动刷新阈值 · 100 万次迭代',updates:'手动更新 · 2 万次',rendered:'逐次渲染 · 2,000 次'};
  $('#performance-table').innerHTML=header('工作负载')+'<tbody>'+Object.entries(workloads).map(([k,title])=>row(title,runKeys.map(run=>{const ratio=data.runs[run].performance[k];return '<span class="ratio '+(ratio>1.05?'slower':'')+'">'+ratio.toFixed(3)+'×</span>';}))).join('')+'</tbody>';
}
function renderCandidate(){
  const r=data.runs[selected.key],h=r.history.find(x=>x.index===selected.index),n=h.check_counts.passed||0;
  $('#candidate-choice').value=selected.key+':'+selected.index;
  const count=Object.values(h.check_counts).reduce((a,b)=>a+b,0);
  $('#candidate-detail').innerHTML='<div class="candidate-topline"><strong>'+esc(r.name)+' · V'+h.index+'</strong>'+tag(h.status==='checks_passed',n+'/'+count+' 组通过')+(!h.measurement_complete?'<span class="tag warning">计量清单不完整</span>':'')+'<a href="https://github.com/Al-LeanMuscle-Club/nanolize/commit/'+h.head+'" target="_blank" rel="noopener"><code>'+h.head.slice(0,12)+' ↗</code></a></div><div class="candidate-stats"><span>源码 <strong>'+fmt(h.source_tokens)+'</strong></span><span>源码＋配置 <strong>'+fmt(h.total_tokens)+'</strong></span><span>总量保留 <strong>'+(100*h.total_tokens/r.baseline_tokens.total_tokens).toFixed(4)+'%</strong></span></div><p>'+esc(h.note)+'</p>';
}
function renderChart(){
  const container=$('#trajectory-chart'),width=Math.max(350,Math.min(900,container.clientWidth)),height=width<550?270:320;
  const l=43,r=18,t=24,b=42,w=width-l-r,h=height-t-b;
  const min=metric==='total_tokens'?49.3:49,max=metric==='total_tokens'?56.5:67.5;
  const X=i=>l+(i-1)*w/9,Y=v=>t+(max-v)*h/(max-min);
  const ticks=metric==='total_tokens'?[50,52,54,56]:[50,54,58,62,66];
  let svg='<svg viewBox="0 0 '+width+' '+height+'" aria-labelledby="trajectory-title"><title id="trajectory-title">'+(metric==='total_tokens'?'源码加配置':'仅源码')+' tokens 保留比例，按候选版本排列</title>';
  ticks.forEach(v=>{svg+='<line class="chart-grid" x1="'+l+'" y1="'+Y(v)+'" x2="'+(width-r)+'" y2="'+Y(v)+'"/><text class="chart-label" x="'+(l-9)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+v+'%</text>';});
  svg+='<line x1="'+l+'" y1="'+Y(50)+'" x2="'+(width-r)+'" y2="'+Y(50)+'" stroke="#c18c9a" stroke-width="1.2" stroke-dasharray="5 4"/><text class="chart-label" x="'+(width-r)+'" y="'+(Y(50)-7)+'" text-anchor="end" style="fill:#b07c8c">50% 参考线 · Readable 无门槛</text>';
  for(let i=1;i<=10;i++)svg+='<text class="chart-label" x="'+X(i)+'" y="'+(height-18)+'" text-anchor="middle">'+i+'</text>';
  for(const key of runKeys){if(!active.has(key))continue;const run=data.runs[key];const points=run.history.map(p=>({x:X(p.index),y:Y(100*p[metric]/run.baseline_tokens[metric]),p}));
    svg+='<path class="chart-path" stroke="'+run.color+'" d="'+points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ')+'"/>';
    for(const point of points){const p=point.p,isSelected=key===selected.key&&p.index===selected.index;
      svg+='<g class="chart-point'+(isSelected?' selected':'')+'" data-point="'+key+':'+p.index+'" tabindex="0" role="button" aria-pressed="'+isSelected+'" aria-label="'+esc(run.name)+' 版本 '+p.index+'，'+(100*p[metric]/run.baseline_tokens[metric]).toFixed(4)+'% 保留"><circle cx="'+point.x+'" cy="'+point.y+'" r="13" fill="transparent"/><circle class="point-focus" cx="'+point.x+'" cy="'+point.y+'" r="9" fill="'+run.color+'" opacity=".18"/><circle cx="'+point.x+'" cy="'+point.y+'" r="4.6" fill="'+(p.measurement_complete?run.color:'white')+'" stroke="'+run.color+'" stroke-width="1.7"/></g>';
    }
  }
  svg+='</svg>';container.innerHTML=svg;renderCandidate();
}
function renderHistory(){
  const run=data.runs[$('#history-run').value];
  $('#history-table').innerHTML='<thead><tr><th>版本 / 提交</th><th>源码</th><th>源码＋配置</th><th>检查</th><th>发生了什么</th></tr></thead><tbody>'+run.history.map(h=>'<tr><th scope="row">V'+h.index+'<span class="number-small"><code>'+h.head.slice(0,8)+'</code></span></th><td>'+fmt(h.source_tokens)+'</td><td>'+fmt(h.total_tokens)+(!h.measurement_complete?'<span class="number-small">清单不完整</span>':'')+'</td><td>'+tag(h.status==='checks_passed',(h.check_counts.passed||0)+'/'+Object.values(h.check_counts).reduce((a,b)=>a+b,0))+'</td><td class="history-note">'+esc(h.note)+'</td></tr>').join('')+'</tbody>';
}
function renderCost(){
  const maxTime=Math.max(...runKeys.map(k=>data.runs[k].wall_seconds));
  $('#time-bars').innerHTML=runKeys.map(k=>{const r=data.runs[k];return '<div><div class="bar-heading"><span>'+esc(r.name)+'</span><strong>'+duration(r.wall_seconds)+'</strong></div><div class="bar-track"><div class="bar-fill" style="width:'+100*r.wall_seconds/maxTime+'%;background:'+r.color+'"></div></div></div>';}).join('');
  const maxTotal=Math.max(...runKeys.map(k=>Object.values(data.runs[k].usage_by_role).reduce((s,r)=>s+r[tokenMode],0)));
  $('#token-bars').innerHTML=runKeys.map(k=>{const r=data.runs[k];const total=Object.values(r.usage_by_role).reduce((s,r)=>s+r[tokenMode],0);return '<div><div class="bar-heading"><span>'+esc(r.name)+'</span><strong>'+(r.usage_complete?'':'≥ ')+million(total)+'</strong></div><div class="bar-track"><div class="bar-fill" style="width:'+100*total/maxTotal+'%">'+Object.keys(roleTitles).map(role=>{const amount=r.usage_by_role[role]?.[tokenMode]||0;return '<span class="bar-segment" style="width:'+100*amount/total+'%;background:'+roleColors[role]+'" title="'+roleTitles[role]+' '+million(amount)+'"></span>';}).join('')+'</div></div></div>';}).join('');
  const rows=Object.entries(roleTitles).map(([role,title])=>row(title,runKeys.map(k=>{const usage=data.runs[k].usage_by_role[role];return usage?(usage.usage_complete?'':'≥ ')+million(usage.total_tokens)+'<span class="number-small">'+usage.calls+' 次调用 · '+(usage.seconds/60).toFixed(1)+' 分钟累计</span>':k==='readable'&&role.startsWith('task_')?'未启用<span class="number-small">未运行出题或解题</span>':role==='task_examiner'?'本次未模型出题<span class="number-small">使用预先冻结题目</span>':'0<span class="number-small">无独立模型控制器</span>';})));
  rows.push(row('记录到的总量',runKeys.map(k=>'<strong>'+(data.runs[k].usage_complete?'':'≥ ')+million(data.runs[k].observed_total_tokens)+'</strong>')));
  rows.push(row('其中缓存输入',runKeys.map(k=>million(data.runs[k].observed_cached_input_tokens)+'<span class="number-small">占观测总量 '+(100*data.runs[k].observed_cached_input_tokens/data.runs[k].observed_total_tokens).toFixed(2)+'%</span>')));
  rows.push(row('未缓存输入＋输出',runKeys.map(k=>(data.runs[k].usage_complete?'':'≥ ')+million(data.runs[k].observed_uncached_input_plus_output))));
  $('#cost-table').innerHTML=header('消耗来源')+'<tbody>'+rows.join('')+'</tbody>';
  $('#token-mode-caption').textContent=tokenMode==='total_tokens'?'包含缓存输入的观测总量':'输入减去缓存输入，再加输出；仍不是费用';
}
function renderCalls(){
  const run=data.runs[$('#calls-run').value];
  const labels={implement:'首次实现',repair:'行为修复',optimize:'压缩优化',review:'审阅'};
  $('#calls-table').innerHTML='<thead><tr><th>序号</th><th>角色</th><th>开始 / UTC</th><th>时长</th><th>观测 tokens</th><th>缓存输入</th><th>计量</th></tr></thead><tbody>'+run.calls.map((c,i)=>{const n=c.usage.input_tokens+c.usage.output_tokens;return '<tr><th scope="row">'+(i+1)+'</th><td>'+esc(c.role==='controller'?'Controller':(labels[c.author_task_role]||'Author'))+'</td><td>'+clockUTC(c.started)+'</td><td>'+(c.seconds/60).toFixed(1)+' 分</td><td>'+(c.usage_complete?fmt(n):'未知 / 未完整计量')+'</td><td>'+(c.usage_complete?fmt(c.usage.cached_input_tokens):'未知')+'</td><td>'+(c.usage_complete?'<span class="tag pass">完整</span>':'<span class="tag warning">中断，无最终回执</span>')+'</td></tr>';}).join('')+'</tbody>';
}
function renderMethod(){
  const rows=[
    ['Harness 提交',runKeys.map(k=>'<code>'+data.runs[k].harness_commit.slice(0,12)+'</code>')],
    ['体积验收要求',['总源码＋配置 &lt;50%','总源码＋配置 &lt;50%','源码、源码＋配置各自 &lt;50%','无强制比例；以简洁、可读为目标']],
    ['功能检查',['原有 26 组','原有 26 组','28 组，另有补充探针','31 组，已纳入前轮兼容性发现']],
    ['任务题目来源',['复用经澄清的冻结题目','本次模型出题','本次模型出题，契约修订后再出题','未启用任务成本评测']],
    ['配置的任务重复次数',runKeys.map(k=>k==='readable'?'不适用':data.runs[k].budget.task_repetitions_configured+' 次<span class="number-small">配置值不代表均完成</span>')],
    ['任务用量预算',runKeys.map(k=>k==='readable'?'不适用（评测关闭）':million(data.runs[k].budget.task_max_total_tokens))],
    ['压缩优化调用',['0 次独立尺寸优化','4 / 4 次','6 / 6 次','0 / 0 次']],
    ['停止条件',['功能修复与后续任务评测','功能修复、体积优化与任务评测','双体积门槛、功能修复与任务评测','功能及安装通过后停止纯体积优化']],
    ['监督干预',['补 tokenizer；中断并恢复草稿；加强 CLI 检查','诊断、性能与大小规则复核','追加兼容契约；解析器与 range 修复；提供计数工具','开始前扩充共同验收；补充精确警告语义；静态可读性审阅']]
  ];
  $('#method-table').innerHTML=header('实验设置')+'<tbody>'+rows.map(r=>row(...r)).join('')+'</tbody>';
  $('#limits-list').innerHTML=data.limits.map(x=>'<li>'+esc(x)+'</li>').join('');
}
function renderEvidence(){
  $('#source-cards').innerHTML=runKeys.map(k=>{const r=data.runs[k];return '<article class="source-card"><h3><i class="run-dot '+k+'"></i> '+esc(r.name)+'</h3><div class="branch">'+esc(r.code.branch)+'</div><dl><dt>Harness</dt><dd><code>'+r.harness_commit.slice(0,12)+'</code></dd><dt>验证提交</dt><dd><code>'+r.code.verified_commit.slice(0,12)+'</code></dd><dt>发布提交</dt><dd><code>'+r.code.published_commit.slice(0,12)+'</code></dd></dl><div class="source-links"><a href="'+r.code.url+'" target="_blank" rel="noopener">代码分支 ↗</a><a href="'+r.report_url+'" target="_blank" rel="noopener">原运行报告 ↗</a></div></article>';}).join('');
  const evidence=data.evidence.cli_streams;
  $('#cli-evidence-table').innerHTML='<thead><tr><th>版本</th><th>Python</th><th>参数</th><th>退出码</th><th>stdout 字节</th><th>stderr 字节</th><th>结果</th></tr></thead><tbody>'+['original',...runKeys].map(k=>evidence[k].checks.map(c=>'<tr><th scope="row">'+(k==='original'?'原始 tqdm':esc(data.runs[k].name))+'</th><td>'+c.python+'</td><td><code>'+c.flag+'</code></td><td>'+c.exit_code+'</td><td>'+c.stdout_bytes+'</td><td>'+c.stderr_bytes+'</td><td>'+tag(c.passed)+'</td></tr>').join('')).join('')+'</tbody>';
  $('#collected-at').textContent=new Date(data.collected_at).toISOString().slice(0,16).replace('T',' ');
}
function bindInteractions(){
  $('#candidate-choice').innerHTML=runKeys.map(k=>'<optgroup label="'+esc(data.runs[k].name)+'">'+data.runs[k].history.map(h=>'<option value="'+k+':'+h.index+'">'+esc(data.runs[k].name)+' · V'+h.index+'</option>').join('')+'</optgroup>').join('');
  $('#candidate-choice').addEventListener('change',e=>{const [key,index]=e.target.value.split(':');selected={key,index:Number(index)};active.add(key);$('#branch-toggles [data-run-toggle="'+key+'"]').setAttribute('aria-pressed','true');renderChart();});
  $('#branch-toggles').innerHTML=runKeys.map(k=>'<button type="button" data-run-toggle="'+k+'" aria-pressed="true"><i class="run-dot '+k+'"></i>'+esc(data.runs[k].name)+'</button>').join('');
  $('#branch-toggles').addEventListener('click',e=>{const b=e.target.closest('[data-run-toggle]');if(!b)return;const k=b.dataset.runToggle;if(active.has(k)){if(active.size===1)return;active.delete(k);}else active.add(k);b.setAttribute('aria-pressed',String(active.has(k)));if(!active.has(selected.key)){const next=runKeys.find(k=>active.has(k));selected={key:next,index:data.runs[next].history.length};}renderChart();});
  $$('[data-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.metric;$$('[data-metric]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderChart();}));
  function pick(e){const node=e.target.closest('[data-point]');if(!node)return;if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;if(e.type==='keydown')e.preventDefault();const [key,index]=node.dataset.point.split(':');selected={key,index:Number(index)};renderChart();if(e.type==='keydown')$('#trajectory-chart [data-point="'+key+':'+index+'"]').focus();}
  $('#trajectory-chart').addEventListener('click',pick);$('#trajectory-chart').addEventListener('keydown',pick);
  $('#history-run').addEventListener('change',renderHistory);
  $$('[data-token-mode]').forEach(b=>b.addEventListener('click',()=>{tokenMode=b.dataset.tokenMode;$$('[data-token-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCost();}));
  $('#calls-run').addEventListener('change',renderCalls);
  let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(renderChart,120);});
  const links=$$('.rail nav a');const sections=links.map(l=>$(l.getAttribute('href')));
  const observer=new IntersectionObserver(entries=>{const visible=entries.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible.length){links.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+visible[0].target.id));}},{rootMargin:'-120px 0px -60% 0px'});sections.forEach(s=>observer.observe(s));
}
async function start(){
  try{const response=await fetch('report-data.json');if(!response.ok)throw new Error('Unable to load report data');data=await response.json();renderOverview();renderQuality();renderHistory();renderCost();renderCalls();renderMethod();renderEvidence();bindInteractions();renderChart();document.documentElement.dataset.reportReady='true';}
  catch(error){console.error(error);$('#run-cards').innerHTML='<div class="error">实验数据暂时无法读取。请刷新页面，或直接下载 <a href="report-data.json">JSON 数据</a> 与 <a href="comparison.pdf">PDF 图表</a>。</div>';}
}
start();
