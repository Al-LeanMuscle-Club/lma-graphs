(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => Number(value).toLocaleString('en-US');
  const decimal = (value, digits=1) => Number(value).toFixed(digits);
  const tag = (text, type='neutral') => `<span class="tag ${type}">${esc(text)}</span>`;
  const status = pass => tag(pass ? '一致' : '有差异', pass ? 'good' : 'bad');
  const table = (headers, rows) => `<table><thead><tr>${headers.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr${r.current?' class="current"':''}>${r.cells.map((c,i)=>`<${i===0?'th scope="row"':'td'}>${c}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table>`;
  const source = r => `<a href="${r.code_url}" target="_blank" rel="noopener">${esc(r.name)} ↗</a>${r.id==='feedback'?` <span class="tag purple">本次</span>`:''}<span class="row-sub">${esc(r.commit.slice(0,8))}</span>`;
  const roleLabels = {author:'重写作者',controller:'Controller',examiner:'出题 Agent',solver:'任务解题'};
  let data, ledger, audit, runs;

  function overview() {
    const r=runs.at(-1);
    const cards=[
      ['本次交付记录跨度',decimal(r.wall_seconds/60),'分钟','包含验收与宿主等待'],
      ['本次已观测模型用量',decimal(r.usage.total_tokens/10000),'万 tokens','含缓存输入 · 不是完整账单'],
      ['本次最终源代码',number(r.size.source_tokens),'tokens','相对完整原仓库减少 86.59%'],
      ['本次补充复测新发现','1','项 schema 差异','嵌套 Annotated 约束偏移']
    ];
    $('hero-metrics').innerHTML=cards.map(c=>`<div class="metric"><span class="label">${c[0]}</span><span class="value">${c[1]}<em>${c[2]}</em></span><span class="sub">${c[3]}</span></div>`).join('');
    $('overview-table').innerHTML=table(['最终分支','源代码 tokens','源码减少¹','实验跨度','已观测总 tokens²','任务成本评测'],runs.map(r=>({current:r.id==='feedback',cells:[source(r),`<strong>${number(r.size.source_tokens)}</strong>`,`${decimal(r.source_reduction_pct,2)}%`,`${decimal(r.wall_seconds/60)} 分钟`,`${decimal(r.usage.total_tokens/10000)} 万`,r.id==='auto50'?tag('最终修订未验证','partial'):r.id==='tasks49'?tag('不确定','partial'):tag('未启用')]})));
  }
  function quality() {
    const heads=['检查项',...runs.map(r=>esc(r.name)+(r.id==='feedback'?' · 本次':''))];
    const row=(title,fn)=>({cells:[title,...runs.map(fn)]});
    $('quality-table').innerHTML=table(heads,[
      row('原有 core 检查组',r=>tag('11 / 11 通过','good')),
      row('其中 pytest 用例',r=>`105 通过 · 0 失败 · 0 跳过`),
      row('fresh wheel 安装验收',r=>tag('3 / 3 通过','good')),
      row('真实 generation 2 / 3 推理',r=>tag('通过','good')),
      row('schema：默认 Field 优先级',r=>status(r.quality.schema_priority)),
      row('schema：嵌套 Annotated 元素',r=>status(r.quality.schema_nested)),
      row('CLI：generation 3 平台权重',r=>r.quality.cli_generation3_weights?tag('保留权重步骤','good'):tag('缺少权重步骤','bad')),
      row('CLI：6 个输出比较',r=>tag(`${r.quality.cli_outputs_matched} / 6 一致`,r.quality.cli_outputs_matched===6?'good':'partial')),
      row('数值辅助函数：8 个边界输入',r=>tag(`${r.quality.numeric_cases_matched} / 8 一致`,r.quality.numeric_cases_matched===8?'good':'partial')),
      row('Needle2 / Needle3 别名存在性',r=>r.quality.aliases?tag('与原版一致（均无）','good'):tag('新增了原版没有的别名','partial')),
      row('补充两组并入后的结果',r=>`<strong>${r.audit.passed_groups} / 13 组一致 / 通过</strong>`)
    ]);
    const descriptions={
      'upstream-tools':'工具 schema · 17 pytest','upstream-grounding':'grounding · 36 pytest','upstream-worker':'worker · 6 pytest',
      'upstream-weights':'权重处理 · 22 pytest','upstream-inference':'真实推理 · 5 pytest','core-fetch':'核心资源下载 · 19 pytest',
      'core-packaging':'运行时打包契约','core-api-contract':'公开 API 输出比较','core-native-output':'真实 native 输出 / embedding 比较',
      'schema-performance':'2,000 次 schema 构建小于 5 秒','telemetry-policy':'遥测 opt-out',
      'clarified-boundaries':'补充：CLI / 数值 / API 表面','schema-compatibility':'补充：两项 schema 精确比较'
    };
    $('group-table').innerHTML=table(heads,audit.original.checks.map(c=>row(descriptions[c.name]||esc(c.name),r=>{
      const a=audit[r.id].checks.find(x=>x.name===c.name);
      return tag(a.passed?'通过 / 一致':'观察到差异',a.passed?'good':'bad');
    })));
  }
  function bars(target, values, formatter) {
    const max=Math.max(...values)*1.08;
    $(target).innerHTML=runs.map((r,i)=>`<div class="bar-row ${r.id==='feedback'?'current':''}"><span class="bar-label">${r.id==='feedback'?'<b>'+esc(r.name)+' · 本次</b>':esc(r.name)}</span><span class="bar-value">${formatter(values[i])}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${values[i]/max*100}%"></div></div></div>`).join('');
  }
  function timeChart() {
    const key=$('time-metric').value;bars('time-chart',runs.map(r=>r[key]/60),v=>`${decimal(v)} 分钟`);
    $('time-note').textContent=key==='wall_seconds'?'从首次提交到最终验收 / 流水线终态；含失败恢复、队列与补修。每次提交前准备、报告生成发布不在此计时范围。':key==='pipeline_seconds'?'只看最后流水线会漏掉恢复成本；Auto50 这一段结束后还补修了交付代码，因此此口径不是最终交付耗时。':'作者调用持续时间之和；不含 Controller、任务评测、验证、调度与宿主等待。不能直接替代墙钟耗时。';
  }
  function tokenChart() {
    const key=$('token-metric').value;
    bars('token-chart',runs.map(r=>key==='author'?r.roles.author.tokens:r.usage[key]),v=>`${decimal(v/10000)} 万`);
    $('token-note').textContent=key==='total_tokens'?'含缓存输入的已观测总量。包含记录到的失败 / 作废调用；不包含外层协调、知识准备与报告制作。':key==='uncached_plus_output'?'总量减去缓存输入，即非缓存输入 + 输出。两者的计费价格不同；本图仍不等于实付成本。':key==='author'?'只统计重写作者；旧实验的出题、解题和本次 Controller 成本被排除，不能称为实验总成本。':'只统计输出，已包含 reasoning output，不重复相加。该数值同样不是完整计费量。';
  }
  function cost() {
    const buckets=runs.map(r=>{
      const b={author:0,controller:0,solver:0,recovery:0};
      for(const c of ledger[r.id]) {
        if(c.total_tokens===null) continue;
        const type=c.role==='author'?'author':c.role==='controller'?'controller':c.role==='examiner'||c.recovery?'recovery':'solver';
        b[type]+=c.total_tokens;
      }
      return b;
    });
    const max=Math.max(...runs.map(r=>r.usage.total_tokens));
    const labels={author:'重写作者',controller:'Controller',solver:'有效任务解题',recovery:'出题 / 作废解题'};
    $('role-breakdown').innerHTML=runs.map((r,i)=>`<div class="breakdown-row"><span>${esc(r.name)}</span><div class="stack-track" aria-label="${esc(r.name)} 的角色用量">${Object.entries(buckets[i]).map(([k,v])=>v?`<div class="${k}" style="width:${v/max*100}%" title="${labels[k]}：${number(v)} tokens"></div>`:'').join('')}</div><strong>${decimal(r.usage.total_tokens/10000)} 万</strong></div>`).join('');
    $('cost-table').innerHTML=table(['已观测用量',...runs.map(r=>esc(r.name))],[
      ['输入（含缓存）',r=>number(r.usage.input_tokens)],['其中：缓存输入',r=>number(r.usage.cached_input_tokens)],
      ['非缓存输入',r=>number(r.usage.input_tokens-r.usage.cached_input_tokens)],['输出（含推理输出）',r=>number(r.usage.output_tokens)],
      ['输入 + 输出',r=>`<strong>${number(r.usage.total_tokens)}</strong>`],['缓存占总用量',r=>`${decimal(r.usage.cached_input_tokens/r.usage.total_tokens*100,2)}%`],
      ['有 usage 的模型调用',r=>`${r.model_calls_with_usage} 次`],['重写作者调用',r=>`${r.author_calls} 次`],
      ['Controller 模型调用',r=>r.id==='feedback'?'6 次':'0 次'],['无 usage 的启动失败',r=>r.id==='tasks49'?tag('1 次 · 调模型前失败','partial'):'无记录']
    ].map(([label,fn])=>({cells:[label,...runs.map(fn)]})));
    populateSelect('ledger-run','feedback');$('ledger-run').addEventListener('change',renderLedger);renderLedger();
    $('time-metric').addEventListener('change',timeChart);$('token-metric').addEventListener('change',tokenChart);timeChart();tokenChart();
  }
  function populateSelect(id,selected) {
    $(id).innerHTML=runs.map(r=>`<option value="${r.id}" ${selected===r.id?'selected':''}>${esc(r.name)}</option>`).join('');
  }
  function renderLedger() {
    const key=$('ledger-run').value;const list=ledger[key];
    $('ledger-table').innerHTML=table(['角色 / 记录','输入','缓存输入¹','输出','合计','调用持续时间'],list.map((c,i)=>({cells:[
      `<span class="ledger-role">${esc(roleLabels[c.role]||c.role)}${c.attempt?` · 第 ${c.attempt} 轮`:''}</span><span class="row-sub">${c.recovery?'此前恢复 / 出题成本':c.role==='controller'?'本次决策调用':c.role==='solver'?'有效任务测量':'实验调用'}${!c.usage_complete?' · usage 缺失':''}</span>`,
      ...['input_tokens','cached_input_tokens','output_tokens','total_tokens'].map(k=>c[k]===null||c[k]===undefined?'—':number(c[k])),
      c.seconds==null?'—':`${decimal(c.seconds,2)} 秒`
    ]})));
  }
  function sizeChart() {
    const key=$('size-metric').value;bars('size-chart',runs.map(r=>r.size[key]),v=>`${number(v)} tokens`);
  }
  function size() {
    $('size-table').innerHTML=table(['版本','源代码','配置 / 计入的其他文本','合计','源码减少¹','校正合计减少²','原生合计减少³'],runs.map(r=>({current:r.id==='feedback',cells:[source(r),number(r.size.source_tokens),number(r.size.configuration_tokens),number(r.size.total_tokens),`${decimal(r.source_reduction_pct,2)}%`,`${decimal(r.total_reduction_pct,2)}%`,`${decimal(r.native_total_reduction_pct,2)}%`]})));
    $('size-metric').addEventListener('change',sizeChart);sizeChart();
    $('expand-scope').addEventListener('click',()=>{
      const groups=[...document.querySelectorAll('.tree-group')];const open=groups.some(d=>!d.open);
      groups.forEach(d=>d.open=open);$('expand-scope').textContent=open?'收起全部':'展开全部';
    });
  }
  function trajectory(key='feedback') {
    const r=runs.find(r=>r.id===key);
    $('trajectory-tabs').innerHTML=runs.map(r=>`<button class="tab" role="tab" id="tab-${r.id}" aria-controls="trajectory-panel" aria-selected="${key===r.id}" tabindex="${key===r.id?0:-1}" data-id="${r.id}">${esc(r.name)}</button>`).join('');
    $('trajectory-tabs').querySelectorAll('button').forEach((button,i)=>{
      button.addEventListener('click',()=>trajectory(button.dataset.id));
      button.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
        e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?runs.length-1:(i+(e.key==='ArrowRight'?1:-1)+runs.length)%runs.length;
        trajectory(runs[next].id);$(`tab-${runs[next].id}`).focus();
      });
    });
    $('trajectory-panel').setAttribute('aria-labelledby',`tab-${key}`);
    $('trajectory-panel').innerHTML=`<div class="trajectory-header"><div><h3>${esc(r.name)}</h3><p>${esc(r.target)}</p></div><span class="pill">${r.task_enabled?'任务成本评测开启':'任务成本评测关闭'}</span></div><div class="trajectory-stats"><div><b>${r.author_calls}</b><span>次作者调用</span></div><div><b>${decimal(r.wall_seconds/60)} min</b><span>提交到最终记录</span></div><div><b>0</b><span>次纯体积优化</span></div></div><ol class="timeline">${r.trajectory.map(t=>`<li data-step="${t.attempt}"><div class="timeline-head"><b>第 ${t.attempt} 次作者调用${t.attempt===r.trajectory.length?' · 最终代码':''}</b><span>${number(t.tokens)} 源码 + 配置 tokens · ${t.passed}/${t.groups} 组通过${t.extra_schema_cases?' + 2 项 schema 比较':''}</span></div><p>${esc(t.note)}</p>${t.pytest?`<div class="detail">pytest：${t.pytest.passed} 通过 / ${t.pytest.failed} 失败 / ${t.pytest.skipped} 跳过</div>`:''}${t.deferred_groups?.length?`<div class="detail">筛查暂缓：${esc(t.deferred_groups.join('、'))}</div>`:''}</li>`).join('')}</ol><div class="trajectory-cost-note">${esc(r.cost_note)}</div>`;
  }
  function structure() {
    $('structure-table').innerHTML=table(['静态指标',...runs.map(r=>esc(r.name))],[
      ['Python 源文件数',r=>r.static.python_files],['Python 源码行数¹',r=>number(r.static.python_lines)],
      ['入口 __init__.py 行数',r=>r.static.files.find(f=>f.name==='needle/__init__.py').lines],
      ['grounding 是否独立模块',r=>r.static.files.some(f=>f.name==='needle/_grounding.py')?tag('独立','purple'):tag('在入口模块')],
      ['函数 / 方法数量',r=>r.static.function_count],['函数跨度中位数（行）',r=>r.static.median_function_lines],
      ['超过 140 字符的代码行',r=>r.static.long_lines_over140],['分号拼接语句数',r=>r.static.semicolon_statements],
      ['直接 eval / exec / compile 调用',r=>r.static.dynamic_calls.length]
    ].map(([name,fn])=>({cells:[name,...runs.map(fn)]})));
    populateSelect('files-run','feedback');$('files-run').addEventListener('change',renderFiles);renderFiles();
  }
  function renderFiles() {
    const r=runs.find(r=>r.id===$('files-run').value);
    $('file-table').innerHTML=table(['源文件','tokens','行数¹','函数 / 方法','最大函数跨度'],r.static.files.map(f=>({cells:[`<a href="https://github.com/Al-LeanMuscle-Club/nanolize/blob/${r.commit}/${encodeURI(f.name)}" target="_blank" rel="noopener"><code>${esc(f.name)}</code> ↗</a>`,number(f.tokens),f.lines,f.functions,`${f.max_function_lines} 行`]})));
  }
  function tasks() {
    const rows=[];
    for(const id of ['tasks49','auto50']) {
      const r=runs.find(r=>r.id===id);const task=r.task_assessment.tasks[0];
      for(const [phase,label] of [['development','开发任务'],['heldout','隐藏任务']]) {
        const s=task[phase];const measured=s.original.runs>0&&s.candidate.runs>0;
        rows.push({cells:[`${esc(r.name)}<span class="row-sub">${label}${id==='auto50'?' · 补修前修订':''}</span>`,measured?number(s.original.tokens.median):'—',measured?number(s.candidate.tokens.median):'未运行',measured?`${s.change_percent>0?'+':''}${decimal(s.change_percent,2)}%`:'—',measured?`${decimal(s.original.duration_seconds.median)} → ${decimal(s.candidate.duration_seconds.median)} 秒`:'—',s.status==='passed'?tag('本阶段达标','good'):s.status==='regressed'?tag('成本回归','bad'):s.status==='inconclusive'?tag('不确定','partial'):tag('未运行')]});
      }
    }
    $('task-table').innerHTML=table(['实验 / 阶段','原版 tokens','候选 tokens','变化','原版 → 候选耗时','成本门槛结果'],rows);
  }
  function fairness() {
    $('fairness-table').innerHTML=table(['影响比较的变量',...runs.map(r=>esc(r.name))],[
      ['原始提交 / 核心范围',r=>'相同 · 278eea19 / 7 个叶节点'],
      ['执行方式',r=>r.id==='feedback'?'Controller + feedback memory':r.id==='auto50'?'自动体积流程 + 交付前补修':'固定重写 / 修复流程'],
      ['目标策略',r=>r.id==='feedback'?'可读、简洁；无强制比例':r.id==='auto50'?'自动 50% 建议目标':'49% 上限'],
      ['初始知识契约条数¹',r=>number(r.contracts_initial)],
      ['是否复用旧候选代码',r=>'否 · 独立实现'],
      ['是否复用原仓库语义知识',r=>'是 · 同一原始提交'],
      ['运行时验收组数',r=>r.id==='feedback'?'11 → 12（中途补充）':'11（Auto50 另补 2 个 schema 案例）'.replace('（Auto50 另补 2 个 schema 案例）',r.id==='auto50'?' + 2 个 schema 案例':'')],
      ['任务成本评测',r=>r.task_enabled?'开启':'关闭'],
      ['作者模型记录',r=>`<div class="quality-detail">${esc(r.author_model_record)}</div>`],
      ['任务评测模型',r=>r.task_enabled?'GPT-6-Astra / xhigh':'不适用']
    ].map(([label,fn])=>({cells:[label,...runs.map(fn)]})));
    $('fairness-table').insertAdjacentHTML('afterend','<p class="footnote">¹ 契约条数来自各次初始知识清单，仅用于说明输入不同，不是知识质量评分。Tasks 比最早 Core49 多 19 条先前澄清；本次 999 条来自同一原仓库的后续语义整理，且运行中继续补充。旧作者使用继承配置，记录不足以确认当时所有模型参数与本次完全一致。</p>');
  }
  function evidenceCards() {
    $('evidence-cards').innerHTML=runs.map(r=>`<article class="card evidence-card"><h3>${esc(r.name)} ${r.id==='feedback'?tag('本次','purple'):''}</h3><div class="branch">${esc(r.branch)}</div><dl><dt>代码提交</dt><dd><code>${esc(r.commit)}</code></dd><dt>流程来源</dt><dd>${esc(r.harness_branch)}</dd><dt>流程提交</dt><dd><a href="https://github.com/Al-LeanMuscle-Club/nanolize/commit/${r.harness_commit}" target="_blank" rel="noopener"><code>${esc(r.harness_commit)}</code></a></dd></dl><div class="evidence-links"><a href="${r.code_url}" target="_blank" rel="noopener">固定源码 ↗</a><a href="${r.branch_url}" target="_blank" rel="noopener">分支 ↗</a><a href="${r.report_url}" target="_blank" rel="noopener">历史报告 ↗</a></div></article>`).join('');
  }
  function navigation() {
    $('print-button').addEventListener('click',()=>window.print());
    const links=[...document.querySelectorAll('.sidebar nav a')];
    const sections=links.map(a=>document.querySelector(a.hash));
    let pending=false;
    function refresh() {
      const top=window.scrollY+160;
      const current=[...sections].reverse().find(s=>s.offsetTop<=top)||sections[0];
      links.forEach(a=>{a.classList.toggle('active',a.hash==='#'+current.id);if(a.hash==='#'+current.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});pending=false;
    }
    addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(refresh)}},{passive:true});refresh();
  }
  async function init() {
    const fetched=await Promise.all(['comparison.json','usage-ledger.json','audit-evidence.json'].map(async file=>{
      const r=await fetch(file);if(!r.ok)throw new Error('数据读取失败：'+file);return r.json();
    }));
    [data,ledger,audit]=fetched;runs=data.runs;
    overview();quality();cost();size();trajectory();structure();tasks();fairness();evidenceCards();navigation();
    document.documentElement.dataset.ready='true';
  }
  init().catch(error=>{
    $('overview').insertAdjacentHTML('afterbegin',`<div class="loading-error">${esc(error.message)}。请刷新页面，或从页面底部下载公开 JSON 数据。</div>`);
    console.error(error);
  });
})();
