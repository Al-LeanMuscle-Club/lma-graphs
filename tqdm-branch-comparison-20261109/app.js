'use strict';
(() => {
  const D = JSON.parse(document.getElementById('report-data').textContent);
  const R = D.runs, keys = ['main', 'controller'];
  const $ = id => document.getElementById(id);
  const n = value => Number(value).toLocaleString('en-US');
  const fixed = (value, digits = 1) => Number(value).toFixed(digits);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const external = (href, label) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  const utc = iso => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
  const observed = (run, value) => `${run.usage_complete ? '' : '≥ '}${n(value)}`;
  const table = (head, rows) => `<table><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${row[0]}</th>${row.slice(1).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  function controls(attribute, render) {
    document.querySelectorAll(`[data-${attribute}]`).forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll(`[data-${attribute}]`).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      render(button.dataset[attribute]);
    }));
  }

  $('branch-identity').innerHTML = keys.map(key => {
    const run = R[key];
    return `<article class="identity ${key}"><div class="name">${run.label}</div>${external(run.code_url, esc(run.branch))}<div class="meta">流程：${esc(run.harness_branch)}</div><div class="meta">引擎提交 <code>${run.harness_commit.slice(0,12)}</code></div><div class="workflow">流程状态：<code>${run.workflow_status}</code><br>未达项：后续任务成本验收</div></article>`;
  }).join('');

  function sizeChart(mode) {
    const field = mode + '_tokens';
    const original = D.original[field];
    const rows = [{key:'original',label:'Original',value:original}, ...keys.map(key => ({key,label:R[key].label,value:R[key].size[field]}))];
    $('size-chart').innerHTML = rows.map(row => `<div class="bar-row"><span class="bar-label">${row.label}</span><div class="track" aria-hidden="true"><div class="fill ${row.key}" style="width:${row.value/original*100}%"></div>${mode==='total'?'<span class="threshold"></span>':''}</div><div class="bar-value">${n(row.value)}<small>${row.key==='original'?'原版基线':`保留 ${fixed(row.value/original*100,mode==='total'?3:2)}%`}</small></div></div>`).join('');
    $('size-caption').textContent = ({total:'源码＋配置合计 · 虚线为 50% 门槛',source:'仅源码 · 与原版源码比较',configuration:'仅配置与计入范围内的其他文本'})[mode];
    $('size-detail').textContent = ({
      total:'Main 比 Controller 少 203 tokens。Controller 为 36,073 tokens，距离 50% 阈值 36,074 仅少 1 token；49% 的规划目标未达到。',
      source:'纯源码仍保留原版的约 59%–60%。本次“低于 50%”指源码与配置合计，不能写成纯源码已减半。',
      configuration:'配置与计入范围的文本从 26,169 tokens 缩到约 8.6K，是合计缩减的重要来源。这里的计数不等于整个仓库的全部非代码文件。'
    })[mode];
  }
  controls('size', sizeChart); sizeChart('total');

  const performanceNames = {disabled:'关闭显示 · disabled',automatic:'自动刷新 · automatic',updates:'手动更新 · updates',rendered:'实际渲染 · rendered'};
  $('performance').innerHTML = table(['性能探针','Main / 原版','Controller / 原版'],Object.entries(performanceNames).map(([key,label]) => [label,...keys.map(k => `${fixed(R[k].performance[key].candidate_original_ratio,3)} ×`)]));

  const modules = {
    main:[
      ['核心与集成', [['tqdm/std.py','665 行；迭代、进度状态、格式化与错误类型'],['tqdm/_pandas.py','新模块：Pandas 集成职责'],['tqdm/cli.py','CLI 参数、类型与帮助说明']]],
      ['通知扩展', [['tqdm/contrib/_notify.py','新模块，28 行；共享通知逻辑'],['tqdm/contrib/telegram.py','Telegram 集成'],['tqdm/contrib/slack.py','Slack 集成'],['tqdm/contrib/discord.py','Discord 集成']]]
    ],
    controller:[
      ['核心与集成', [['tqdm/std.py','533 行；迭代和进度状态主体'],['tqdm/_format.py','新模块，168 行；显示格式化'],['tqdm/_errors.py','新模块：错误类型'],['tqdm/_pandas.py','新模块：Pandas 集成职责']]],
      ['CLI 与通知扩展', [['tqdm/_cli_docs.py','新模块：CLI 帮助与参数元数据'],['tqdm/cli.py','CLI 行为实现'],['tqdm/contrib/_remote.py','新模块，74 行；MessageIO 与 RemoteTqdm'],['tqdm/contrib/telegram.py','Telegram 集成'],['tqdm/contrib/slack.py','Slack 集成'],['tqdm/contrib/discord.py','Discord 集成']]]
    ]
  };
  $('structure').innerHTML = keys.map(key => `<article class="structure-panel"><h3 class="${key==='main'?'main':'controller'}-text">${R[key].label}</h3><p class="module-count">${R[key].docs.python_modules} 个 Python 模块 · 相对原版新增 ${R[key].docs.python_modules-D.original.python_modules} 个</p><div class="file-tree">${modules[key].map(([label,files],index) => `<details${index===0?' open':''}><summary>${label}</summary><ul>${files.map(([file,description]) => `<li>${external(R[key].file_base+file,`<code>${file.replace('tqdm/','')}</code>`)}<small>${description}</small></li>`).join('')}</ul></details>`).join('')}</div><p class="chart-note">展示与本次结构差异有关的模块；点击文件查看发布版本。</p></article>`).join('');

  function checks() {
    const query = $('check-search').value.trim().toLowerCase();
    const rows = R.main.checks.filter(c => c.name.toLowerCase().includes(query));
    $('check-count').textContent = `显示 ${rows.length} / 26 组 · 两版最终结果`;
    $('check-rows').innerHTML = rows.length ? rows.map(c => `<tr><th scope="row"><code>${esc(c.name)}</code></th><td><span class="badge pass">通过</span></td><td><span class="badge pass">通过</span></td></tr>`).join('') : '<tr><td colspan="3">没有匹配的检查组，请换一个关键词。</td></tr>';
  }
  $('check-search').addEventListener('input', checks); checks();

  let filter = 'both', selected = {key:'main',iteration:3};
  const colors = {main:'#6938bb',controller:'#267d78'};
  const candidateNotes = {
    main:[
      '规模已在门槛内。upstream-tqdm 未通过，剩余差异是弃用提示的精确文本与换行。',
      '26 个行为检查组均通过；额外 CLI 交付检查发现 help/version 输出流不一致，继续修复。',
      '最终候选：26 个行为组与额外交付检查通过；发布分支独立安装通过。后续任务成本验收仍未通过。'
    ],
    controller:[
      '首次实现。部分内容尚未完整计数；格式化、CLI、logging 与并发兼容仍需修复。',
      '第一次功能修复。CLI 检查通过，其余三个失败组继续修复；规模仍只是观测小计。',
      '第三个候选首次达到 26/26 组通过。完整规模 37,952 tokens，尚高于验收门槛。',
      '第一轮体积优化：功能检查继续通过，完整规模降至 37,014 tokens。',
      '第二轮体积优化：功能检查继续通过，完整规模降至 36,792 tokens。',
      '第三轮体积优化：功能检查继续通过，完整规模降至 36,717 tokens。',
      '最终候选：功能、严格低于 50% 的合计规模及独立安装通过。49% 规划目标未达到，后续任务成本验收仍未通过。'
    ]
  };
  function detail() {
    const run = R[selected.key], point = run.trajectory[selected.iteration-1];
    $('candidate-detail').innerHTML = `<h3>${run.label} · 候选 ${point.iteration}</h3><div class="numbers"><span><b>${n(point.tokens)}</b> tokens${point.measurement_complete?'':' · 观测小计'}</span><span><b>${point.passed}/26</b> 组通过</span><span>${point.measurement_complete?`保留 ${fixed(point.tokens/D.original.total_tokens*100,3)}%`:'计数不完整'}</span></div><p>${candidateNotes[selected.key][point.iteration-1]}</p>${point.failed.length?`<p>未通过：${point.failed.map(esc).join('、')}</p>`:''}<p>代码快照保存：${utc(point.saved_at)} UTC · 提交后 ${fixed(point.elapsed_minutes)} 分钟。该时间不是验证完成时间。</p><p>候选提交：<code>${point.commit}</code></p>${external(run.report_url+run.summary_file,'查看原始候选轨迹记录')}`;
    document.querySelectorAll('[data-candidate]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.candidate===`${selected.key}:${selected.iteration}`)));
    document.querySelectorAll('.plot-point').forEach(pointNode => {
      const active = pointNode.dataset.point===`${selected.key}:${selected.iteration}`;
      pointNode.setAttribute('r',active?'7':'5');
      pointNode.setAttribute('stroke-width',active?'3':'2');
      pointNode.setAttribute('aria-pressed',String(active));
    });
  }
  function choose(value) {
    const [key,iteration] = value.split(':'); selected = {key,iteration:Number(iteration)}; detail();
  }
  function trajectory(mode) {
    filter = mode;
    const shown = keys.filter(key => mode==='both' || key===mode);
    if (!shown.includes(selected.key)) selected = {key:shown[0],iteration:R[shown[0]].trajectory.length};
    const x = i => 73+(i-1)*112, y = value => 260-(value-34500)/4500*218;
    const yTicks = [34500,35500,36500,37500,38500];
    let svg = `<svg viewBox="0 0 820 310" role="group" aria-label="候选代码规模轨迹；也可使用下方候选按钮"><title>候选轮次与合计代码 tokens</title>${yTicks.map(v => `<line class="plot-grid" x1="66" x2="762" y1="${y(v)}" y2="${y(v)}"/><text class="plot-label" x="56" y="${y(v)+4}" text-anchor="end">${n(v)}</text>`).join('')}<line class="plot-threshold" x1="66" x2="762" y1="${y(36074)}" y2="${y(36074)}"/><text class="plot-label" x="762" y="${y(36074)-9}" text-anchor="end">50% 门槛 · 36,074</text>${Array.from({length:7},(_,i)=>`<text class="plot-label" x="${x(i+1)}" y="284" text-anchor="middle">${i+1}</text>`).join('')}<text class="plot-label" x="416" y="306" text-anchor="middle">候选轮次</text>`;
    for (const key of shown) {
      const points = R[key].trajectory;
      svg += points.slice(1).map((p,i) => `<path class="plot-path" stroke="${colors[key]}" d="M ${x(points[i].iteration)} ${y(points[i].tokens)} L ${x(p.iteration)} ${y(p.tokens)}"${!points[i].measurement_complete||!p.measurement_complete?' stroke-dasharray="5 5"':''}/>`).join('');
      svg += points.map(p => `<circle class="plot-point" role="button" tabindex="0" aria-pressed="false" data-point="${key}:${p.iteration}" aria-label="${R[key].label} 候选 ${p.iteration}，${n(p.tokens)} tokens，${p.measurement_complete?'完整计数':'计数不完整'}，${p.passed}/26 组通过" cx="${x(p.iteration)}" cy="${y(p.tokens)}" r="5" stroke="${colors[key]}" stroke-width="2" fill="${p.measurement_complete?colors[key]:'#fff'}"><title>${R[key].label} ${p.iteration} · ${n(p.tokens)} tokens</title></circle>`).join('');
    }
    $('trajectory-chart').innerHTML = svg+'</svg>';
    $('candidate-picker').innerHTML = shown.flatMap(key => R[key].trajectory.map(p => `<button data-candidate="${key}:${p.iteration}" aria-pressed="false">${key==='main'?'M':'C'}${p.iteration} · ${p.passed}/26</button>`)).join('');
    document.querySelectorAll('[data-point]').forEach(node => {
      node.addEventListener('click',()=>choose(node.dataset.point));
      node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(node.dataset.point);}});
    });
    document.querySelectorAll('[data-candidate]').forEach(button => button.addEventListener('click',()=>choose(button.dataset.candidate)));
    detail();
  }
  controls('trajectory',trajectory); trajectory(filter);

  function cost(mode) {
    const total = run => mode==='all'?run.total_observed_tokens:run.rewrite_tokens;
    const maximum = Math.max(...keys.map(key=>total(R[key])));
    $('cost-chart').innerHTML = keys.map(key=>{
      const run=R[key],parts=[['author',run.usage.author.total_tokens],['decision',run.usage.controller?.total_tokens||0],...(mode==='all'?[['task',run.task_cost.total_tokens]]:[])];
      return `<div class="bar-row"><span class="bar-label">${run.label}</span><div class="track" aria-hidden="true">${parts.filter(([,v])=>v).map(([role,value])=>`<span class="stack ${role}" style="width:${value/maximum*100}%" title="${role}: ${n(value)} tokens"></span>`).join('')}</div><div class="bar-value">${run.usage_complete?'':'≥ '}${fixed(total(run)/1e6,2)}M<small>${n(total(run))} tokens</small>${run.usage_complete?'':'<span class="unmetered">＋ 1 次调用未计量</span>'}</div></div>`;
    }).join('');
    const rows=[
      ['Author',...keys.map(key=>`${observed(R[key],R[key].usage.author.total_tokens)}<br><small>${R[key].usage.author.calls} 次调用${key==='main'?'，含 1 次中断':''}</small>`)],
      ['Controller 决策','无独立 Controller 调用',`${n(R.controller.usage.controller.total_tokens)}<br><small>13 次调用</small>`],
      ['重写与决策小计',...keys.map(key=>observed(R[key],R[key].rewrite_tokens))]
    ];
    if(mode==='all') rows.push(['任务评测',...keys.map(key=>`${n(R[key].task_cost.total_tokens)}<br><small>${R[key].task_cost.calls} 次调用</small>`)],['登记调用合计',...keys.map(key=>`<b>${observed(R[key],R[key].total_observed_tokens)}</b>`)]);
    $('cost-table').innerHTML = table(['统计口径 · tokens','Main','Controller'],rows);
  }
  controls('cost',cost); cost('all');
  $('wall-chart').innerHTML = keys.map(key => `<div class="bar-row"><span class="bar-label">${R[key].label}</span><div class="track" aria-hidden="true"><div class="fill ${key}" style="width:${R[key].wall_seconds/R.controller.wall_seconds*100}%"></div></div><div class="bar-value">${fixed(R[key].wall_seconds/60)} min<small>${utc(R[key].started_at).slice(11,16)} → ${utc(R[key].ended_at).slice(11,16)} UTC</small></div></div>`).join('');
  $('model-time-rows').innerHTML = [
    ['Author',...keys.map(key=>`${fixed(R[key].usage.author.seconds/60)} 分钟 / ${R[key].usage.author.calls} 次`)],
    ['Controller 决策','无独立调用',`${fixed(R.controller.usage.controller.seconds/60)} 分钟 / 13 次`],
    ['任务 Solver',`${fixed(R.main.usage.task_solver.seconds/60)} 分钟 / 5 次`,'未汇总可比的分角色计时']
  ].map(row=>`<tr><th scope="row">${row[0]}</th><td>${row[1]}</td><td>${row[2]}</td></tr>`).join('');
  $('call-rows').innerHTML = keys.flatMap(key => R[key].calls.filter(c=>c.role!=='task_solver').map(c=>`<tr><th scope="row">${R[key].label} · ${c.role==='author'?'Author':'Controller'}<br><small>${c.purpose||'决策'}</small></th><td><code>${utc(c.started_at)}</code></td><td>${c.seconds==null?'未登记':fixed(c.seconds/60,2)}</td><td>${c.tokens==null?'<span class="caution">未计量 · 中断</span>':n(c.tokens)}</td></tr>`)).join('');
  $('boundaries').innerHTML = D.boundaries.map((b,i)=>`<p>${i+1}. ${esc(b)}</p>`).join('')+'<p>Main 的 5 次任务 solver 调用包含一次用于较早候选、后来终止的 590,057-token 调用。该开销计入实验总量，但不属于最终候选的单项任务成本对照。</p><p>这里展示模型 tokens，不估算美元费用；缓存价格、模型价格和未计量调用都可能影响真实账单。</p>';
  $('evidence-links').innerHTML = keys.map(key => {
    const run=R[key];
    return `<article class="evidence-card"><h3 class="${key==='main'?'main':'controller'}-text">${run.label}</h3>${external(run.code_url,'压缩后的代码分支')}${external(run.report_url,'原始实验报告 · 公开')}${external(run.report_url+run.summary_file,'原始实验数据 · JSON')}<dl><dt>原始 tqdm 提交</dt><dd><code>${run.original_commit}</code></dd><dt>生成流程提交</dt><dd><code>${run.harness_commit}</code></dd><dt>验收时的代码提交</dt><dd><code>${run.verified_commit}</code></dd><dt>发布提交</dt><dd>${external('https://github.com/Al-LeanMuscle-Club/nanolize/commit/'+run.published_commit,`<code>${run.published_commit}</code>`)}</dd><dt>验收与发布共有的代码树</dt><dd><code>${run.tree}</code></dd><dt>verifier.py · SHA-256</dt><dd><code>${run.source_hashes['verifier.py']}</code></dd><dt>performance_probe.py · SHA-256</dt><dd><code>${run.source_hashes['performance_probe.py']}</code></dd></dl></article>`;
  }).join('');
  $('print-report').addEventListener('click',()=>window.print());
  $('snapshot').textContent = `数据整理：${utc(D.snapshot_at)} UTC`;
  const tocLinks = [...document.querySelectorAll('.toc nav a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if (visible[0]) tocLinks.forEach(link=>link.classList.toggle('active',link.hash===`#${visible[0].target.id}`));
    },{rootMargin:'-10% 0px -65% 0px'});
    document.querySelectorAll('.section').forEach(section=>observer.observe(section));
  }
})();
