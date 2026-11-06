'use strict';
const data=JSON.parse(document.getElementById('report-data').textContent);
const $=id=>document.getElementById(id);
const names={graphify:'Graphify',codegraph:'CodeGraph'};
const fmt=n=>new Intl.NumberFormat('en-US').format(n);
let selected='itsdangerous',metric='seconds';

function renderProject(){
 const p=data.projects.find(p=>p.id===selected),mode=$('size-metric').value;
 const base=mode==='total'?p.original+p.configuration:mode==='production'&&p.id==='glob'?8248:p.original;
 $('project-name').innerHTML=p.title+' <span aria-hidden="true">↗</span>';
 $('project-link').href='https://github.com/'+p.upstream+'/tree/'+p.commit;
 $('project-scope').textContent=p.scope;$('project-commit').textContent=p.commit.slice(0,8);
 $('project-panel').setAttribute('aria-labelledby','tab-'+p.id);
 const items=[{name:'原版',className:'original',value:base}];
 for(const provider of ['graphify','codegraph']){const v=p.providers[provider];items.push({name:names[provider],className:provider,value:v.source===null?null:v.source+(mode==='total'?v.configuration:0)});}
 const max=Math.max(...items.map(v=>v.value||0));
 $('size-chart').innerHTML=items.map(v=>`<div class="bar-row"><span class="bar-label">${v.name}</span><div class="bar-track">${v.value===null?'<span class="no-candidate">未生成候选</span>':`<div class="bar ${v.className}" style="width:${v.value/max*100}%"></div>`}</div><span class="bar-value">${v.value===null?'—':fmt(v.value)}</span></div>`).join('');
 let note='斜线柱代表未通过完整功能验收的候选；体积下降不表示功能保留成功。';
 if(mode==='total')note+=' 含配置和锁文件，尤其 Python 的巨大锁文件会放大降幅。';
 else if(p.id==='glob')note+=mode==='production'?' 原版去除内嵌测试与测试专用 doctest 后为 8,248 tokens；外部冻结测试未改变。':' 原版 11,778 tokens 包含内嵌测试；可切换“生产源码”查看拆分。';
 else note+=' 源码包含注释和文档字符串，不包含配置与依赖锁文件。';
 $('size-note').textContent=note;
 $('outcomes').innerHTML=['graphify','codegraph'].map(provider=>{const v=p.providers[provider],candidate=v.source!==null;const count=candidate?v.source+(mode==='total'?v.configuration:0):null;return `<div class="outcome"><div class="outcome-top"><h4>${names[provider]}</h4><span class="pill ${candidate?'':'blocked'}">${candidate?'功能验收未通过':'原版基线受阻'}</span></div><div class="reduction">${candidate?'↓ '+(100*(1-count/base)).toFixed(1)+'%':'未开始重写'}<small>${candidate?'当前口径的体积下降':'无压缩候选'}</small></div><p>${p.notes[provider]}</p><div class="outcome-meta"><span>完整验收尝试 ${v.verified_attempts}</span><span>安装：${v.installation==='passed'?'通过':v.installation==='failed'?'失败':'未运行'}</span></div></div>`;}).join('');
 document.querySelectorAll('[data-project]').forEach(b=>{const active=b.dataset.project===selected;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;});
}
function renderGraphs(){
 const max=Math.max(...data.projects.flatMap(p=>Object.values(p.providers).map(v=>v[metric])));
 $('graph-chart').innerHTML=data.projects.map(p=>`<div class="graph-column"><h4>${p.language}<small>${p.title}</small></h4>${['graphify','codegraph'].map(provider=>{const n=p.providers[provider][metric];const label=metric==='seconds'?n.toFixed(2):metric==='rss'?n.toFixed(1):fmt(n);return `<div class="mini-row" aria-label="${p.language} ${names[provider]} ${label}"><div class="mini-track"><div class="mini-bar ${provider}" style="width:${n/max*100}%"></div></div><span class="mini-value">${label}</span></div>`;}).join('')}</div>`).join('');
 $('metric-unit').textContent={seconds:'秒 / 首次建图与导出',rss:'MiB / 进程峰值 RSS',edges:'条 / 起点 + 终点 + 类型去重'}[metric];
 $('graph-note').textContent={seconds:'共享主机的单次观测；CodeGraph 的 init 已含索引，未重复计入额外重建。',rss:'共享主机的单次进程峰值内存观测，不是重复采样的性能基准。',edges:'边的类型和粒度不同，数量不代表准确率。CodeGraph 原始边数包含重复调用位置。'}[metric];
 document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.metric===metric));
}
function selectProject(id,focus=false){selected=id;renderProject();if(focus)$('tab-'+id).focus();}
document.querySelectorAll('[data-project]').forEach(b=>{b.addEventListener('click',()=>selectProject(b.dataset.project));b.addEventListener('keydown',e=>{const keys=['ArrowRight','ArrowLeft','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();const list=data.projects.map(p=>p.id),i=list.indexOf(selected);selectProject(list[e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length],true);});});
$('size-metric').addEventListener('change',renderProject);
document.querySelectorAll('[data-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.metric;renderGraphs();}));
document.querySelectorAll('[data-open-report]').forEach(a=>a.addEventListener('click',()=>{$('full-report').open=true;}));
function applyHash(){if(location.hash==='#paper'||location.hash.startsWith('#full-report'))$('full-report').open=true;}
window.addEventListener('hashchange',applyHash);applyHash();renderProject();renderGraphs();
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){document.querySelectorAll('.side-nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));}});},{rootMargin:'-10% 0px -65% 0px'});document.querySelectorAll('.section[id]').forEach(e=>observer.observe(e));}
