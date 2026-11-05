(()=>{'use strict';
const slides=window.NANOLIZE_DECK,svgs=window.NANOLIZE_SVGS,$=id=>document.getElementById(id);
let index=0,reading=window.matchMedia('(max-width:760px)').matches,notesOpen=false,startTouch=null,toastTimer,observer;
const chapter=i=>i<4?0:i<8?1:i<12?2:3;
const chapterNames=['01 — 价值与理念','02 — 方法与验证','03 — 案例与下一步','04 — 附录与来源'];
const hashIndex=()=>{const m=location.hash.match(/^#slide-(\d+)$/);return m?Math.max(0,Math.min(slides.length-1,Number(m[1])-1)):0;};
try{const saved=localStorage.getItem('nanolize-briefing-mode');if(saved)reading=saved==='reading';}catch{}
const announce=message=>{$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);};
const overview=$('overview');
slides.forEach((s,i)=>{
 const p=document.createElement('button');p.type='button';p.classList.toggle('appendix',i>=12);p.setAttribute('aria-label',`第 ${i+1} 页：${s.title}`);p.title=`${i+1}. ${s.title}`;p.addEventListener('click',()=>go(i));$('progress').append(p);
 const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`跳到第 ${i+1} 页：${s.title}`);const img=document.createElement('img');img.src=`assets/preview-${String(i+1).padStart(2,'0')}.png`;img.alt='';img.loading='lazy';b.append(img);const span=document.createElement('span'),n=document.createElement('b'),title=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');title.textContent=s.title;span.append(n,title);b.append(span);b.addEventListener('click',()=>{overview.close();go(i);});$('overview-grid').append(b);
});
function render({scroll=false,hash=true}={}){
 const s=slides[index];$('current').textContent=String(index+1).padStart(2,'0');$('slide-name').textContent=s.title;$('section-title').textContent=chapterNames[chapter(index)];$('notes-title').textContent=`${String(index+1).padStart(2,'0')} · 本页讲稿`;$('notes-text').textContent=s.notes;
 $('prev').disabled=index===0;$('next').disabled=index===slides.length-1;
 $('source-link').hidden=!s.url;if(s.url)$('source-link').href=s.url;
 $('progress').querySelectorAll('button').forEach((b,i)=>{b.setAttribute('aria-current',String(i===index));b.classList.toggle('visited',i<index);});
 $('overview-grid').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
 document.querySelectorAll('.chapters button').forEach((b,i)=>{b.classList.toggle('active',i===chapter(index));b.setAttribute('aria-current',i===chapter(index)?'true':'false');});
 document.title=`${String(index+1).padStart(2,'0')} · ${s.title} — Nanolize Anything`;
 if(!reading){$('slide-frame').innerHTML=svgs[index];$('live-title').textContent=`第 ${index+1} 页，共 ${slides.length} 页。${s.title}`;}
 else if(scroll)$(`read-${index+1}`).scrollIntoView({behavior:'instant',block:'start'});
 if(hash&&location.hash!==`#slide-${index+1}`)history.replaceState(null,'',`#slide-${index+1}`);
}
function go(i){index=Math.max(0,Math.min(slides.length-1,i));render({scroll:true});}
function setMode(value){
 reading=value;document.body.classList.toggle('reading-mode',reading);$('presentation').hidden=reading;$('reading').hidden=!reading;$('notes').hidden=reading||!notesOpen;
 $('mode').setAttribute('aria-pressed',String(reading));$('mode').setAttribute('aria-label',reading?'切换为演示模式':'切换为阅读模式');$('mode').title=reading?'切换演示模式（R）':'切换阅读模式（R）';$('mode').querySelector('.button-label').textContent=reading?'演示模式':'阅读模式';
 try{localStorage.setItem('nanolize-briefing-mode',reading?'reading':'slides');}catch{}
 if(observer)observer.disconnect();render({scroll:reading});
 if(reading){observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible.length){index=Number(visible[0].target.dataset.index);render({hash:true});}},{rootMargin:'-85px 0px -65% 0px',threshold:0});document.querySelectorAll('.reading-slide').forEach(e=>observer.observe(e));}
 else window.scrollTo({top:0,behavior:'instant'});
}
function toggleNotes(){notesOpen=!notesOpen;$('notes-toggle').setAttribute('aria-pressed',String(notesOpen));$('notes').hidden=!notesOpen||reading;document.body.classList.toggle('notes-open',notesOpen);if(notesOpen&&!reading)$('notes').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'nearest'});}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else announce('此浏览器不支持网页全屏，可使用浏览器的全屏功能。');}catch{announce('无法进入全屏，可使用浏览器的全屏功能。');}}
$('prev').addEventListener('click',()=>go(index-1));$('next').addEventListener('click',()=>go(index+1));$('mode').addEventListener('click',()=>setMode(!reading));$('notes-toggle').addEventListener('click',toggleNotes);$('fullscreen').addEventListener('click',fullscreen);
$('overview-toggle').addEventListener('click',()=>overview.showModal());$('overview-close').addEventListener('click',()=>overview.close());overview.addEventListener('click',e=>{if(e.target===overview){const r=overview.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)overview.close();}});
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.go))));
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement));$('fullscreen').querySelector('.button-label').textContent=document.fullscreenElement?'退出全屏':'全屏';});
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||overview.open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;
 if(e.key==='ArrowRight'||e.key==='PageDown'||(e.key===' '&&!reading&&!e.target.closest('button,a,summary'))){e.preventDefault();go(index+1);}
 else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(index-1);}
 else if(e.key==='Home'&&!reading){e.preventDefault();go(0);}else if(e.key==='End'&&!reading){e.preventDefault();go(slides.length-1);}
 else if(e.key.toLowerCase()==='f'){e.preventDefault();fullscreen();}else if(e.key.toLowerCase()==='r'){e.preventDefault();setMode(!reading);}
 else if(e.key.toLowerCase()==='n'&&!reading){e.preventDefault();toggleNotes();}else if(e.key.toLowerCase()==='o'){e.preventDefault();overview.showModal();}
});
$('stage').addEventListener('touchstart',e=>{if(e.touches.length===1)startTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
$('stage').addEventListener('touchend',e=>{if(!startTouch)return;const dx=e.changedTouches[0].clientX-startTouch.x,dy=e.changedTouches[0].clientY-startTouch.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.6)go(index+(dx<0?1:-1));startTouch=null;},{passive:true});
window.addEventListener('hashchange',()=>go(hashIndex()));document.addEventListener('click',e=>{if(!e.target.closest('.downloads'))document.querySelector('.downloads').open=false;});
index=hashIndex();setMode(reading);
})();
