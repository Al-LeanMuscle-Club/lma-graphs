const frame = document.querySelector('iframe');
function positionGraph() {
  const heading = frame.contentDocument?.querySelector('#tree-heading');
  if (heading) frame.contentWindow.scrollTo(0, heading.getBoundingClientRect().top + frame.contentWindow.scrollY - 16);
}
frame.addEventListener('load', positionGraph);
if (frame.contentDocument?.readyState === 'complete') positionGraph();
