'use strict';
const D=JSON.parse(document.querySelector('#report-data').textContent);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external=(url,label)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>';
const number=v=>typeof v==='number'?v.toLocaleString('en-US',{maximumFractionDigits:2}):'待验证';
function link(id,url){const a=$(id);a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
['#nav-branch','#hero-branch','#branch-link'].forEach(id=>link(id,D.branch_url));
link('#compare-link',D.compare_url);link('#proposal-link',D.proposal_url);
link('#guide-link','https://github.com/Al-LeanMuscle-Club/nanolize/blob/'+D.implementation_commit+'/docs/controller-comparison.md');
$('#branch-link').textContent=D.branch;$('#commit-label').textContent='提交 '+D.implementation_commit+' · 基线 '+D.baseline_commit.slice(0,12);
$('#snapshot').textContent='Commit '+D.implementation_commit.slice(0,12)+' · 2026-11-09';
$('#test-total').textContent=number(D.checks[0].count);$('#run-total').textContent=D.benchmark.runs.length||'—';
$('#build-status').textContent=D.draft?'预览稿：验证结果仍在收集中。':'已核对本次代码与验证摘要；所有源码链接固定到交付提交。';
let filter='all';
function changes(){
 const query=$('#change-search').value.trim().toLowerCase();
 const rows=D.changes.filter(c=>(filter==='all'||c.status===filter)&&JSON.stringify(c).toLowerCase().includes(query));
 $('#change-count').textContent=rows.length+' / '+D.changes.length+' 组 · 点击展开实现、文件与验收要点';
 $$('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===filter)));
 $('#change-list').innerHTML=rows.length?rows.map((c,i)=>'<details class="completion-item" data-change="'+c.id+'"'+(i===0||query?' open':'')+'><summary><span class="completion-phase">'+esc(c.phase)+'</span><span>'+esc(c.title)+'</span><span class="badge'+(c.status==='部分完成'?' caution':'')+'">'+esc(c.status)+'</span></summary><div class="completion-body"><p>'+esc(c.implementation)+'</p><h4>对应实现</h4><div class="source-links">'+c.links.map(l=>external(l.url,l.path)).join('')+'</div><h4>验收要点</h4><ul class="plain-list">'+c.acceptance.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>'+(c.id==='benchmark'?'<p class="pending-note">真实模型效率验收尚未完成；此项不能标记为全部完成。</p>':'')+'</div></details>').join(''):'<p class="muted">没有匹配项。清空关键词或切换筛选查看全部修改。</p>';
}
$('#change-search').addEventListener('input',changes);$$('[data-status]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.status;changes();}));changes();
$('#check-list').innerHTML=D.checks.map(c=>'<article><span class="check-symbol '+(c.passed?'passed':'pending')+'">'+(c.passed?'✓':'…')+'</span><div><h3>'+esc(c.label)+(c.count?' <span>'+c.count+' 项</span>':'')+'</h3><code>'+esc(c.command)+'</code></div><span class="badge'+(c.passed?'':' caution')+'">'+(c.passed?'通过':'验证中')+'</span></article>').join('');
const cases={normal:{label:'正常完成',description:'第一个候选通过配置的检查。三组均只调用一次 Author，auto 不咨询 Controller。'},ordinary_repair:{label:'一次普通修复',description:'第一个候选失败、一次修复后通过。三组保留相同的常规路径，auto 不提前介入。'},stalled:{label:'连续停滞',description:'脚本连续输出相同回归；auto 的建议改变下一次修复重点。该有利情形由夹具预先设计，只验证接入行为。'}};
let selectedCase='normal';
function range(rows,key){const values=[...new Set(rows.map(r=>r[key]).filter(v=>typeof v==='number'))].sort((a,b)=>a-b);return values.length===1?number(values[0]):values.length?number(values[0])+'–'+number(values.at(-1)):'待验证';}
function comparison(){
 $$('[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case===selectedCase)));
 $('#case-description').textContent=cases[selectedCase].description;
 const rows=D.benchmark.runs.filter(r=>r.case===selectedCase);
 $('#comparison-table').innerHTML='<table><thead><tr><th scope="col">版本</th><th scope="col">通过 / 运行</th><th scope="col">Author 调用 / 次运行</th><th scope="col">Controller 调用 / 次运行</th><th scope="col">注入 tokens / 次运行</th><th scope="col">离线墙钟中位数</th></tr></thead><tbody>'+['main','off','auto'].map(arm=>{
  const runs=rows.filter(r=>r.arm===arm),summary=D.benchmark.summary.find(s=>s.case===selectedCase&&s.arm===arm);
  return '<tr><th scope="row">'+({main:'原 main',off:'新版本 · off',auto:'新版本 · auto'}[arm])+'</th><td>'+runs.filter(r=>r.quality==='passed'&&r.status==='completed').length+' / '+runs.length+'</td><td>'+range(runs,'author_calls')+'</td><td>'+range(runs,'controller_calls')+'</td><td>'+range(runs,'scripted_tokens')+'</td><td>'+number(summary?.wall_median_seconds)+' s</td></tr>';
 }).join('')+'</tbody></table>';
 $('#comparison-note').textContent=D.benchmark.contract_matched?'所有三组运行的完整语义契约哈希一致。任务评测在本夹具中关闭；安装验证与更广泛的功能覆盖缺口仍保持原状态。':'完整语义契约一致性检查待完成。';
}
$$('[data-case]').forEach(b=>b.addEventListener('click',()=>{selectedCase=b.dataset.case;comparison();}));comparison();
$('#trial-table').innerHTML='<table><thead><tr><th>运行 ID</th><th>检查结果</th><th>Author / Controller</th><th>注入 tokens</th><th>离线墙钟</th></tr></thead><tbody>'+D.benchmark.runs.map(r=>'<tr><th scope="row">'+esc(r.id)+'</th><td>'+(r.quality==='passed'?'配置检查通过':esc(r.quality))+'</td><td>'+r.author_calls+' / '+r.controller_calls+'</td><td>'+number(r.scripted_tokens)+'</td><td>'+number(r.wall_seconds)+' s</td></tr>').join('')+'</tbody></table>';
$('#limitations').innerHTML='<ul class="plain-list">'+D.limitations.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>';
$('#file-total').textContent=D.changed_files.length+' 个文件';
$('#file-links').innerHTML=D.changed_files.map(path=>'<div>'+external('https://github.com/Al-LeanMuscle-Club/nanolize/blob/'+D.implementation_commit+'/'+path,path)+'</div>').join('');
$('#print-report').addEventListener('click',()=>window.print());
let closed=[],oldFilter,oldQuery;
window.addEventListener('beforeprint',()=>{
 oldFilter=filter;oldQuery=$('#change-search').value;filter='all';$('#change-search').value='';changes();
 closed=$$('details:not([open])');closed.forEach(el=>el.open=true);
});
window.addEventListener('afterprint',()=>{closed.forEach(el=>el.open=false);filter=oldFilter;$('#change-search').value=oldQuery;changes();});
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)$$('.toc nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));},{rootMargin:'-10% 0px -65% 0px'});$$('.section').forEach(s=>observer.observe(s));}
