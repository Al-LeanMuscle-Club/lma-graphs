const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  }
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    activateTab(tabs[next]); tabs[next].focus();
  });
});
const toolSection = document.querySelector('#tools');
const toolTable = toolSection.querySelector('table');
const search = document.createElement('div');
search.className = 'tool-search';
search.innerHTML = '<label for="tool-query">查找工具能力</label><input id="tool-query" type="search" placeholder="如：验证、Slurm、run_checks" autocomplete="off"><output id="tool-count" for="tool-query" aria-live="polite">19 / 19</output>';
toolTable.parentElement.before(search);
const note = document.createElement('p');
note.className = 'tool-search-note';
note.textContent = '搜索仅筛选下方工具目录；清空可恢复全部，打印版始终包含完整目录。';
search.after(note);
const rows = [...toolTable.querySelectorAll('tbody tr')];
const input = document.getElementById('tool-query');
input.addEventListener('input', () => {
  const query = input.value.trim().toLowerCase();
  let count = 0;
  rows.forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(query); if (!row.hidden) count++; });
  document.getElementById('tool-count').textContent = `${count} / ${rows.length}`;
});
document.getElementById('print-button').addEventListener('click', () => window.print());
const links = [...document.querySelectorAll('.sidebar nav a')];
const sections = links.map(link => document.querySelector(link.getAttribute('href')));
let scheduled = false;
function updateReading() {
  const extent = document.documentElement.scrollHeight - window.innerHeight;
  document.getElementById('reading-progress').style.width = `${extent > 0 ? Math.min(100, window.scrollY / extent * 100) : 0}%`;
  let current = 0;
  sections.forEach((section, i) => { if (section.getBoundingClientRect().top < 150) current = i; });
  links.forEach((link, i) => { link.classList.toggle('active', i === current); if (i === current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  scheduled = false;
}
window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateReading); } }, {passive:true});
window.addEventListener('resize', updateReading);
updateReading();
