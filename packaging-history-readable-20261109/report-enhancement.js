(() => {
 const $=s=>document.querySelector(s), d=JSON.parse($('#owner-data').textContent), n=x=>Number(x).toLocaleString('en-US');
 document.documentElement.lang='zh-CN';document.title='packaging 全功能重写 · nanolize 实验报告';
 $('#project-name').textContent='packaging，全功能精简重写';
 $('#project-goal').textContent='保留全部功能，以简洁、可读的实现为目标。功能、安装和代表性性能验收通过后即停止，不设压缩率硬门槛。';
 $('.brand-section').textContent='实验报告';$('.local-badge').textContent='公开访问 · 只读结果';$('.eyebrow').textContent='PACKAGING 26.4.dev0 / FULL SCOPE';
 $('.heading-actions').insertAdjacentHTML('afterbegin',`<div class="owner-links"><a href="${d.code_url}" target="_blank" rel="noopener">查看最终代码 ↗</a><a href="run-evidence.json">实验数据 JSON</a></div>`);
 const metrics=document.createElement('section');metrics.className='owner-summary';metrics.innerHTML=`<article><span>实际源码＋配置 tokens</span><strong>${n(d.before)} → ${n(d.after)}</strong><p>统一 cl100k_base 分词口径</p></article><article><span>实际压缩率</span><strong>${d.reduction.toFixed(2)}%</strong><p>未删功能 · 没有纯体积优化轮次</p></article><article><span>重写版运行原版测试</span><strong>${n(d.test_passed)} / ${n(d.test_total)}</strong><p>Python 3.11 常规用例 · 跳过 ${d.test_skipped} 项</p></article><article><span>功能范围与交付</span><strong>18 / 18 模块</strong><p>安装 3 / 3 · 代表性性能通过</p></article>`;
 $('.editor-grid').before(metrics);
 const context=document.createElement('p');context.className='owner-context';context.textContent=`下方沿用同一份功能图。滚轮缩放、拖动平移，点击节点查看源码归属与验证证据。原生执行 ${d.run_minutes.toFixed(1)} 分钟，共 ${d.author_calls} 次编写／修复调用；具体时间口径、修复记录和 tokens 指标见图下说明。`;
 metrics.after(context);
 const detail=document.createElement('details');detail.className='owner-details';detail.innerHTML='<summary>展开实验过程、测量口径与验证边界</summary><div id="owner-detail-body"></div>';
 $('.editor-grid').after(detail);$('#owner-detail-body').innerHTML=d.details_html;
 const legacy=document.createElement('details');legacy.className='owner-details';legacy.innerHTML='<summary>展开原生逐项证据与测量数据</summary><div></div>';
 detail.after(legacy);for(const sel of ['#report-outcomes','.report-summary','#report-overall-verification','.report-effort','#report-methodology']){const x=$(sel);if(x)legacy.lastElementChild.append(x)}
 $('#report-details')?.remove();
 $('.trust-note p').textContent='绿色表示直接检查通过；蓝色只表示相关证据通过。分组与细节步骤不会继承模块通过结论。已运行检查通过，不等于证明所有可能行为完全等价。';
 const translations={
 "Versions and constraints":"版本与约束",
 "Dependencies and environments":"依赖与运行环境",
 "Metadata and lock files":"元数据与锁定文件",
 "Distribution compatibility":"分发兼容性",
 "Distribution and developer workflows":"分发与开发工作流",
 "Version parsing, ordering and replacement":"版本解析、排序与替换",
 "Version constraints and filtering":"版本约束与筛选",
 "Version range algebra and conversion":"版本范围运算与转换",
 "Requirement strings and syntax diagnostics":"依赖字符串与语法诊断",
 "Environment conditions and composition":"环境条件与组合",
 "Dependency group resolution":"依赖组解析",
 "Core metadata validation and RFC822 output":"核心元数据验证与 RFC822 输出",
 "Direct URL records and credential handling":"Direct URL 记录与凭据处理",
 "Pylock validation and installation selection":"Pylock 验证与安装选择",
 "SPDX expressions and license registry":"SPDX 表达式与许可证表",
 "Interpreter, ABI and platform compatibility tags":"解释器、ABI 与平台兼容标签",
 "ELF, manylinux and musllinux detection":"ELF、manylinux 与 musllinux 检测",
 "Names, normalized versions and distribution filenames":"名称、规范化版本与分发文件名",
 "Package exports, installation and pickle compatibility":"包接口、安装与 pickle 兼容",
 "Grouped validation errors":"分组验证错误",
 "Maintenance and release tooling":"维护与发布工具",
 "Performance benchmark entrypoints":"性能 benchmark 入口",
 "API documentation build":"API 文档构建",
 'original':'packaging','Functional capability tree':'功能与验证图','Functional relationship graph':'功能关系图',
 'Explore the original functional structure with measured code size and recorded verification.':'浏览原有功能结构，查看实测代码量与验证证据。',
 'Click a node to expand or collapse its branch and inspect recorded evidence. Scope is read-only.':'点击节点展开或折叠分支，并查看已记录的证据。本页范围为只读。',
 'Fit frame':'适配画布','Collapse branch':'折叠分支','Expand modules':'展开模块',
 'Direct checks for this module':'该模块的直接检查','Related context':'相关验证背景','Local coverage and blockers':'局部覆盖范围与阻碍',
 'Inspect this function’s purpose and dependencies.':'查看此功能的作用与依赖关系。',
 'Coverage: limited; these records do not establish all module behavior.':'覆盖范围有限：这些记录未证明该模块所有可能行为。',
 'Coverage: declared checks only; broader behavior is not established.':'覆盖范围仅限声明的检查，未验证更广泛的行为。',
 'Related records provide context; they do not establish a direct pass or failure for this module.':'相关记录只提供背景，不代表此模块的直接检查通过或失败。',
 'No directly targeted candidate execution is recorded.':'此节点没有直接针对它的候选运行记录。',
 'No checks are mapped directly; missing coverage is not a pass.':'没有直接映射的检查；缺少覆盖不等于通过。',
 'Behavior checks':'行为验收','Recorded checks passed':'已运行检查通过','Code simplification':'保守计量口径','Assessment disabled':'本次关闭','Task cost':'真实任务评估',
 'Independent of code size and behavior':'与代码量、功能验收分别记录','Installation: passed':'安装检查通过',
 'Part of the project workflow':'项目配套工作流',
 'Direct module targets':'直接针对模块','Measurements, repair history and task assessment':'测量、修复记录与任务评估',

 'Nanolize report':'实验报告','Your capability tree':'功能与验证图','Functional tree':'功能树','Relationship graph':'关系图',
 'Original structure. Versioned results.':'同一功能结构，绑定版本的结果。','Advanced display':'更多显示选项','Show relationships':'显示关系',
 'Selected capability':'当前模块','Required dependencies':'必要依赖','All relationships':'全部关系','Overview':'总览','← Back':'← 返回',
 'Fit':'适配画布','Zoom':'缩放','Choose a node':'点击一个模块','INSPECT A CAPABILITY':'查看功能与证据','Download JSON':'下载原生 JSON','Download CSV':'下载原生 CSV',
 'Task metrics CSV':'任务指标 CSV','Verification':'验证','Code':'代码','Direct checks passed':'直接检查通过','Related checks passed':'相关检查通过',
 'No verification evidence':'暂无验证证据','No conclusive verification':'暂无明确验证结论','Module evidence available':'所属模块有证据',
 'No step checks':'步骤未单独检查','All evidence':'全部证据','Failed direct checks':'直接检查失败','Some direct checks passed':'部分直接检查通过',
 'Related evidence only':'仅有相关证据','Out of scope':'未保留','Expand all details':'展开全部细节','Back to overview':'返回总览',
 'Click to expand · Scroll to zoom · Drag to move':'点击展开 · 滚轮缩放 · 拖动平移',
 'Click to expand branches · Drag to pan · + / − to zoom · 0 to fit':'点击展开 · 拖动平移 · ＋／－缩放 · 0 适配',
 'Start with broad groups, then explore only the details you need.':'先看功能分组，再逐层探索细节。',
 'Green means direct checks passed; blue means related checks passed, with no direct pass implied. Red applies only to direct local failures. Counts are check records, not test cases or coverage percentages. Function steps retain neutral module context. Code scopes can overlap.':'绿色：直接检查通过；蓝色：仅相关检查通过；红色：该模块的直接检查失败。图中数量是检查组，非测试用例数或覆盖率。细节步骤只显示所属模块证据，代码归属可能重叠。'
 };
 function translate(){const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const rows=[];let t;while(t=walker.nextNode()){if(t.parentElement.closest('script,style,#owner-data,code'))continue;const k=t.nodeValue.trim();if(translations[k])rows.push([t,t.nodeValue.replace(k,translations[k])])}for(const [node,text]of rows)node.nodeValue=text;const search=$('#tree-search');if(search)search.placeholder='搜索功能模块…';}
 translate();let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;translate()})}).observe($('.editor-grid'),{subtree:true,childList:true,characterData:true});
})();
