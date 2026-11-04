'use strict';
const metrics = {
  combined: {title:'实现源码 + 运行资源', unit:'物理行数 · 排除测试', before:76888, after:36458, sourceBefore:72035, sourceAfter:20559, note:'最终统计已经计入 JSON、表格等运行资源。因此，不能把 52.58% 简单归为漏算配置的假数字。'},
  source: {title:'仅实现源码', unit:'物理行数 · 排除测试和运行资源', before:72035, after:20559, note:'这一口径未计入配置和数据。部分代码已迁移到 JSON 与表格，因此 71.46% 不代表完整运行体积或结构简化率。'},
  pythonRaw: {title:'Python · 原始排版', unit:'Python 物理行数 · 含注释与空行', before:65120, after:20032, note:'原始 Python 行数对换行、注释和 docstring 很敏感。这里的 69.24% 不能与全语言、含运行资源的统计混用。'},
  pythonBlack: {title:'Python · 统一格式', unit:'Black 26.10.0 · 行宽 88 · 保留注释与 docstring', before:68303, after:29773, note:'同一格式化规则下，降幅为 56.41%。这消除了部分排版影响，但仍包含解释性内容减少、配置迁移和行为遗漏。'},
  pythonAst: {title:'Python · 统一 AST 输出', unit:'移除注释、docstring · 同一 Python 3.13 ast.unparse', before:30815, after:18452, note:'40.12% 不是“真实架构压缩率”。它只覆盖 Python，仍受配置迁移、依赖委托、语义遗漏影响；不能用它证明功能等价或认知负担降低。'}
};
const selector = document.getElementById('metric-select');
function showMetric(key) {
  const m = metrics[key];
  document.getElementById('chart-title').textContent = m.title;
  document.getElementById('chart-unit').textContent = m.unit;
  document.getElementById('value-original').textContent = m.before.toLocaleString('en-US');
  document.getElementById('value-candidate').textContent = m.after.toLocaleString('en-US');
  document.getElementById('bar-candidate').style.width = `${m.after / m.before * 100}%`;
  document.getElementById('part-original').style.width = `${m.sourceBefore ? m.sourceBefore / m.before * 100 : 100}%`;
  document.getElementById('part-candidate').style.width = `${m.sourceAfter ? m.sourceAfter / m.after * 100 : 100}%`;
  const reduction = ((1 - m.after / m.before) * 100).toFixed(2);
  document.getElementById('chart-reduction').textContent = `−${reduction}%`;
  document.getElementById('chart-note').textContent = m.note;
  document.getElementById('chart-legend').innerHTML = key === 'combined' ? '<span class="legend-dot solid"></span> 实现源码 <span class="legend-dot pale"></span> 运行配置、数据等' : '<span class="legend-dot solid"></span> 当前口径下的行数';
  document.querySelector('.chart').setAttribute('aria-label', `${m.title}：原版 ${m.before}，候选 ${m.after}，减少 ${reduction}%。${m.note}`);
}
selector.addEventListener('change', () => showMetric(selector.value));
document.getElementById('print').addEventListener('click', () => window.print());
let previouslyOpen = [];
window.addEventListener('beforeprint', () => {
  previouslyOpen = [...document.querySelectorAll('details')].map(d => d.open);
  document.querySelectorAll('details').forEach(d => { d.open = true; });
});
window.addEventListener('afterprint', () => {
  document.querySelectorAll('details').forEach((d,i) => { d.open = previouslyOpen[i] ?? false; });
});
const navLinks = [...document.querySelectorAll('.sidebar nav a')];
const sections = navLinks.map(a => document.querySelector(a.getAttribute('href')));
let scheduled = false;
function updateNav() {
  let current = sections[0];
  for (const section of sections) if (section.getBoundingClientRect().top <= 160) current = section;
  navLinks.forEach(a => {
    const active = a.hash === `#${current.id}`;
    a.classList.toggle('active',active);
    if (active) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');
  });
  scheduled = false;
}
window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateNav); } }, {passive:true});
updateNav();
