const filterButtons = [...document.querySelectorAll('[data-filter]')];
const requirements = [...document.querySelectorAll('.requirement')];
let selected = 'all';
function filterRows() {
  const query = document.querySelector('#search').value.trim().toLocaleLowerCase();
  let count = 0;
  for (const row of requirements) {
    const visible = (selected === 'all' || row.dataset.status === selected) && row.textContent.toLocaleLowerCase().includes(query);
    row.hidden = !visible;
    if (visible) count++;
  }
  document.querySelector('#result-count').textContent = `显示 ${count} 项 / 共 12 项`;
  document.querySelector('#empty').hidden = count > 0;
}
for (const button of filterButtons) button.addEventListener('click', () => {
  selected = button.dataset.filter;
  for (const item of filterButtons) {item.classList.toggle('selected', item === button);item.setAttribute('aria-pressed', String(item === button));}
  filterRows();
});
document.querySelector('#search').addEventListener('input', filterRows);
const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab, focus = false) {
  for (const item of tabs) {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  }
  if (focus) tab.focus();
}
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const next = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : (index + (key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    activateTab(tabs[next], true);
  });
}
document.querySelector('#copy-command').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText(document.querySelector('#command').textContent); status.textContent = '已复制。请将示例路径替换为实际 job 路径。'; }
  catch { status.textContent = '浏览器未允许复制，请手动选择上方命令。'; }
});
const navLinks = [...document.querySelectorAll('.sidebar nav a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      for (const link of navLinks) {
        const active = link.hash === '#' + entry.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
      }
    }
  }, {rootMargin: '-15% 0px -65% 0px'});
  for (const section of document.querySelectorAll('main > section')) observer.observe(section);
}
