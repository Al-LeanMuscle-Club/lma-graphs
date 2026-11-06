(()=>{
'use strict';
const D=window.ACCELERATE_DATA, $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const byId=new Map(D.nodes.map(n=>[n.id,n])), children=new Map(D.nodes.map(n=>[n.id,[]]));
D.nodes.forEach(n=>{if(n.parent)children.get(n.parent).push(n)});
children.get(D.root).sort((a,b)=>a.order-b.order);
const reduce=matchMedia('(prefers-reduced-motion: reduce)'), mobile=()=>innerWidth<=900;
const state={focus:D.root,selected:D.root,camera:{x:0,y:0,z:1},base:1,hover:null,transitioning:false};
let current=new Map(),nodeEls=new Map(),edges=[],frame=0,gestureTimer=0,tipTimer=0,suppressUntil=0,lastGestureDirection=0,gesturePoint=null,gestureTarget=null;
const svg=$('graph'),canvas=$('canvas'),scene=$('scene');
const nodeLabel={project:'全局架构',domain:'功能域',module:'功能模块',step:'功能步骤'};
const descendants=id=>{const out=[],stack=[byId.get(id)];while(stack.length){const n=stack.pop();out.push(n);stack.push(...children.get(n.id))}return out};
const ancestors=id=>{const out=[];let n=byId.get(id);while(n){out.unshift(n);n=byId.get(n.parent)}return out};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const canEnter=id=>id&&byId.has(id)&&children.get(id).length>0&&id!==state.focus&&byId.get(id).kind!=='project';
function el(tag,attrs={},text){const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='class')n.className=v;else n.setAttribute(k,v)}if(text!==undefined)n.textContent=text;return n}
function se(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n}
function say(text){$('announcement').textContent=text}
function toast(text){clearTimeout(tipTimer);$('depth-tip').textContent=text;$('depth-tip').hidden=false;tipTimer=setTimeout(()=>$('depth-tip').hidden=true,2200)}
function short(n){return n.short||n.label}
function level(){return byId.get(state.focus).kind==='project'?0:byId.get(state.focus).kind==='domain'?1:2}
function sourceURL(ref){return 'https://github.com/'+D.repository+'/blob/'+D.commit+'/'+ref.path.split('/').map(encodeURIComponent).join('/')+(Number.isInteger(ref.line)?'#L'+ref.line+(ref.end_line>ref.line?'-L'+ref.end_line:''):'')}
function showDetails(id,open=false){
 const n=byId.get(id);if(!n)return;state.selected=id;updateSelection();
 const body=$('detail-content');body.replaceChildren();body.style.setProperty('--branch',n.color);
 body.append(el('div',{class:'inspector-tag'},''));body.lastChild.append(el('i'),document.createTextNode(nodeLabel[n.kind]+' / '+(n.kind==='project'?'OVERVIEW':n.kind.toUpperCase())));
 const mark=el('div',{class:'detail-mark','aria-hidden':'true'});mark.innerHTML='<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="5" rx="1.5"/><path d="M12 7v5M5 12h14M5 12v5m14-5v5"/><rect x="2" y="17" width="6" height="5" rx="1.5"/><rect x="16" y="17" width="6" height="5" rx="1.5"/></svg>';body.append(mark,el('h2',{},n.label));
 const [description,api='']=n.description.split(' API: ');body.append(el('p',{class:'detail-description'},description||'沿着下方分支，进一步探索这个模块的功能。'));
 const group=descendants(id),files=[...new Set(group.flatMap(x=>x.files))],metrics=el('div',{class:'detail-metrics'});
 const stats=n.kind==='project'||n.kind==='domain'?[[group.filter(x=>x.kind==='module').length,'功能模块'],[group.filter(x=>x.kind==='step').length,'功能步骤'],[files.length,'映射文件']]:n.kind==='module'?[[children.get(id).length,'功能步骤'],[files.length,'映射文件'],[n.references.length,'源码位置']]:[[n.references.length,'源码位置'],[files.length,'关联文件']];
 for(const [count,name]of stats){const item=el('div');item.append(el('b',{},String(count)),el('span',{},name));metrics.append(item)}body.append(metrics);
 if(canEnter(id)){const button=el('button',{class:'primary'},'展开这个'+(n.kind==='domain'?'功能域':'模块'));button.append(el('span',{},'↗'));button.onclick=()=>enter(id);body.append(button)}
 if(api){const section=el('section',{class:'detail-section'});section.append(el('div',{class:'section-label'},'关键 API'));const tags=el('div',{class:'api-tags'});api.split(',').forEach(x=>tags.append(el('code',{},x.trim())));section.append(tags);body.append(section)}
 const sub=children.get(id);
 if(sub.length){const section=el('section',{class:'detail-section'});section.append(el('div',{class:'section-label'},n.kind==='project'?'选择一个方向，开始探索':n.kind==='module'?'功能步骤':'这个功能域中的模块'));
 sub.forEach(child=>{const button=el('button',{class:'detail-child'});button.style.setProperty('--branch',child.color);const label=el('span');label.append(el('i'),document.createTextNode(n.kind==='project'?short(child):child.label));button.append(label,el('span',{class:'arrow'},'↗'));button.onclick=()=>{if(children.get(child.id).length)enter(child.id);else showDetails(child.id,true)};section.append(button)});body.append(section)}
 if(n.references.length){const section=el('section',{class:'detail-section'});section.append(el('div',{class:'section-label'},'源码映射 · '+D.commit.slice(0,7)));n.references.forEach(ref=>{const link=el('a',{class:'source-item',href:sourceURL(ref),target:'_blank',rel:'noopener noreferrer'});link.append(el('strong',{},ref.name||ref.path.split('/').pop()),el('small',{},ref.path+(ref.line?' : '+ref.line+(ref.end_line>ref.line?'–'+ref.end_line:''):'')));section.append(link)});body.append(section)}
 else if(n.kind==='module'&&n.files.length){const section=el('section',{class:'detail-section'});section.append(el('div',{class:'section-label'},'映射文件'));n.files.forEach(path=>section.append(el('a',{class:'source-item',href:sourceURL({path}),target:'_blank',rel:'noopener noreferrer'},path)));body.append(section)}
 if(n.depends_on.length){const section=el('section',{class:'detail-section'});section.append(el('div',{class:'section-label'},'关联依赖'));n.depends_on.forEach(id=>{const dep=byId.get(id);if(!dep)return;const b=el('button',{class:'detail-child'},dep.label+' ↗');b.onclick=()=>locate(id);section.append(b)});body.append(section)}
 if(n.kind==='project')body.append(el('p',{class:'detail-note'},'这份功能树来自已有 Accelerate 架构图，固定在同一源码版本。图中的颜色区分功能域，不表示测试通过或失败。'));
 if(open&&mobile())$('inspector').classList.add('open');
}
function wrap(text,max){let lines=[],line='',count=0;for(const c of text){const w=c.charCodeAt(0)>255?1:.55;if(count+w>max&&line){lines.push(line);line='';count=0}line+=c;count+=w}if(line)lines.push(line);return lines}
function geometry(){
 const focus=byId.get(state.focus),list=children.get(focus.id),overview=focus.kind==='project';
 const w=overview?116:210,h=overview?94:108,gap=overview?20:25,pitch=w+gap;
 const nodes=[{id:focus.id,x:-100,y:overview?94:112,w:200,h:90,root:true}];
 if(!overview){const parent=byId.get(focus.parent);nodes.push({id:parent.id,x:-73,y:-12,w:146,h:32,ancestor:true})}
 list.forEach((n,i)=>nodes.push({id:n.id,x:(i-(list.length-1)/2)*pitch-w/2,y:overview?330:354,w,h,step:n.kind==='step',index:i}));
 const map=new Map(nodes.map(n=>[n.id,n]));const links=list.map(n=>({source:focus.id,target:n.id,color:n.color}));if(!overview)links.unshift({source:focus.parent,target:focus.id,color:focus.color});
 const minX=Math.min(...nodes.map(n=>n.x))-24,maxX=Math.max(...nodes.map(n=>n.x+n.w))+24,minY=Math.min(...nodes.map(n=>n.y)),maxY=Math.max(...nodes.map(n=>n.y+n.h));
 return {nodes,map,links,bounds:{x:minX,y:minY,w:maxX-minX,h:maxY-minY}};
}
let geo=null,fittedSize=null;
function fitCamera(readable=true){
 const {width:W,height:H}=canvas.getBoundingClientRect(),b=geo.bounds;fittedSize={w:W,h:H};
 const raw=Math.min((W-34)/b.w,(H-115)/b.h,1.15),z=clamp(readable?Math.max(raw,innerWidth<580?.72:.56):raw,.15,1.15);
 return {z,x:W/2-(b.x+b.w/2)*z,y:58+(H-115)/2-(b.y+b.h/2)*z};
}
function camera(c){state.camera=c;scene.setAttribute('transform',`translate(${c.x} ${c.y}) scale(${c.z})`);$('zoom-label').textContent=Math.round(c.z/state.base*100)+'%'}
function linkPath(a,b){const sx=a.x+a.w/2,sy=a.y+a.h,ex=b.x+b.w/2,ey=b.y,my=sy+(ey-sy)*.5;return `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}`}
function drawEdges(map){for(const e of edges){const a=map.get(e.source),b=map.get(e.target);if(a&&b)e.el.setAttribute('d',linkPath(a,b))}}
function makeNode(p){
 const n=byId.get(p.id),g=se('g',{'class':'graph-node'+(p.root?' root':'')+(p.ancestor?' ancestor':'')+(p.step?' step':''),'data-id':p.id,'role':'button','tabindex':'0','aria-label':n.label+(children.get(n.id).length?'，双击展开':'，查看功能详情')});g.style.setProperty('--branch',n.color);
 g.append(se('rect',{class:'node-body',width:p.w,height:p.h,rx:p.ancestor?8:12}));
 if(p.ancestor){g.append(se('text',{class:'node-title',x:p.w/2,y:21,'font-size':11,'text-anchor':'middle'},'↑ '+short(n)));return g}
 if(p.root){g.append(se('text',{class:'node-kind',x:p.w/2,y:22,'text-anchor':'middle'},n.kind==='project'?'HUGGING FACE':'FOCUS / '+nodeLabel[n.kind]));const lines=wrap(n.kind==='project'?'Accelerate':short(n),11).slice(0,2);lines.forEach((line,i)=>g.append(se('text',{class:'node-title',x:p.w/2,y:lines.length>1?43+i*20:49,'font-size':n.kind==='project'?24:17,'text-anchor':'middle'},line)));g.append(se('text',{class:'node-meta',x:p.w/2,y:76,'font-size':10,'text-anchor':'middle'},n.kind==='project'?'10 domains · 37 modules':children.get(n.id).length+' 个'+(n.kind==='domain'?'模块':'功能步骤')));return g}
 const overview=n.kind==='domain';g.append(se('circle',{class:'node-dot',cx:overview?p.w/2:19,cy:overview?19:21,r:3}));
 if(p.step)g.append(se('text',{class:'step-number',x:p.w-17,y:25,'text-anchor':'end'},String(p.index+1).padStart(2,'0')));
 const lines=wrap(overview?short(n):n.label,overview?6:11).slice(0,2),font=overview?17:16;
 lines.forEach((line,i)=>g.append(se('text',{class:'node-title',x:overview?p.w/2:17,y:overview?46+i*21:50+i*22,'font-size':font,'text-anchor':overview?'middle':'start'},line)));
 const meta=overview?children.get(n.id).length+' 个模块':p.step?(n.references.length+' 处源码映射'):(children.get(n.id).length+' 个功能步骤');
 g.append(se('text',{class:'node-meta',x:overview?14:17,y:p.h-15,'font-size':overview?10:11},meta));
 if(children.get(n.id).length){g.append(se('text',{class:'node-arrow',x:p.w-20,y:p.h-15,'text-anchor':'middle'},'↗'));g.append(se('rect',{class:'node-enter-zone',x:p.w-37,y:p.h-35,width:37,height:35,rx:7,'data-enter':p.id,'aria-hidden':'true'}))}
 return g;
}
function updateSelection(){
 for(const [id,g]of nodeEls){g.classList.toggle('selected',id===state.selected);g.setAttribute('aria-pressed',String(id===state.selected))}
 const active=new Set(ancestors(state.selected).map(n=>n.id));for(const e of edges)e.el.classList.toggle('active',active.has(e.target)&&active.has(e.source));
}
function updateNav(){
 const trail=$('breadcrumbs');trail.replaceChildren();ancestors(state.focus).forEach((n,i)=>{if(i)trail.append(el('span',{},'/'));const b=el('button',{},n.kind==='project'?'全局架构':short(n));b.onclick=()=>enter(n.id);trail.append(b)});
 $('up-button').disabled=state.focus===D.root;$('guided-entry').hidden=state.focus!==D.root;
 document.querySelectorAll('[data-level]').forEach(n=>n.classList.toggle('active',Number(n.dataset.level)===level()));
 const focus=byId.get(state.focus),strip=$('context-strip');strip.replaceChildren();strip.hidden=focus.kind==='project';
 if(focus.parent)children.get(focus.parent).forEach(n=>{const b=el('button',{class:n.id===focus.id?'current':''},short(n));b.onclick=()=>enter(n.id);strip.append(b)});
 $('view-kicker').textContent=['THE BIG PICTURE','FOLLOW A BRANCH','THE DETAILS WITHIN'][level()];
 $('view-summary').textContent=focus.kind==='project'?'10 个分支，一个清晰的全局':focus.kind==='domain'?'沿着分支，找到具体模块':'从功能步骤，连接到源码';
 $('canvas-note').textContent=focus.kind==='project'?'每一条分支，都可以继续探索':focus.kind==='domain'?'继续放大模块，查看功能步骤':'点击功能步骤，查看它的源码映射';
 $('visible-count').textContent=children.get(state.focus).length+' 个'+(level()===0?'功能域':level()===1?'模块':'步骤');
}
function stopAnimation(){if(frame)cancelAnimationFrame(frame);frame=0;state.transitioning=false;document.querySelectorAll('.graph-node.exiting').forEach(g=>g.remove())}
function render(animate=true){
 stopAnimation();updateNav();const old=current,oldCamera={...state.camera};geo=geometry();const targetCamera=fitCamera();state.base=targetCamera.z;
 const nextEls=new Map(),spawn=old.get(state.focus)||old.get(byId.get(state.focus).parent)||geo.map.get(state.focus),starts=new Map();
 for(const p of geo.nodes){const oldG=nodeEls.get(p.id);if(oldG)oldG.remove();const g=makeNode(p);$('nodes').append(g);nextEls.set(p.id,g);const before=old.get(p.id)||{...p,x:spawn.x+spawn.w/2-p.w/2,y:spawn.y+spawn.h/2-p.h/2};starts.set(p.id,before);g.style.opacity=old.has(p.id)?'1':'0';}
 const leaving=[...nodeEls].filter(([id])=>!nextEls.has(id)).map(([,g])=>g);leaving.forEach(g=>g.classList.add('exiting'));nodeEls=nextEls;
 $('edges').replaceChildren();edges=geo.links.map(link=>{const path=se('path',{class:'edge',stroke:link.color});$('edges').append(path);return {...link,el:path}});updateSelection();
 const duration=animate&&!reduce.matches&&old.size?480:0,start=performance.now();state.transitioning=duration>0;
 function tick(now){const t=duration?clamp((now-start)/duration,0,1):1,ease=1-(1-t)**3,mix=(a,b)=>a+(b-a)*ease;const map=new Map();
  for(const p of geo.nodes){const a=starts.get(p.id),q={...p,x:mix(a.x,p.x),y:mix(a.y,p.y)};map.set(p.id,q);const g=nodeEls.get(p.id);g.setAttribute('transform',`translate(${q.x} ${q.y})`);g.style.opacity=old.has(p.id)?'1':String(ease)}
  leaving.forEach(g=>g.style.opacity=String(1-ease));current=map;drawEdges(map);camera({x:mix(oldCamera.x,targetCamera.x),y:mix(oldCamera.y,targetCamera.y),z:Math.exp(mix(Math.log(oldCamera.z),Math.log(targetCamera.z)))});
  if(t<1)frame=requestAnimationFrame(tick);else{leaving.forEach(g=>g.remove());frame=0;state.transitioning=false}
 }tick(start);
}
function enter(id,historyMode='push'){
 const node=byId.get(id);if(!node)return;if(node.kind==='step'){locate(id);return}if(id===state.focus){showDetails(id);return}
 state.focus=id;state.hover=null;gestureTarget=null;lastGestureDirection=0;clearTimeout(gestureTimer);$('inspector').classList.remove('open');closeSearch();
 render();showDetails(id);if(historyMode==='push'){const url=id===D.root?location.pathname:location.pathname+'#'+encodeURIComponent(id);history.pushState({},'',url)}
 say('已进入'+node.label+'，显示'+children.get(id).length+'个'+(node.kind==='module'?'功能步骤':'子模块'));
}
function up(){const n=byId.get(state.focus);if(n.parent){const previous=n.id;enter(n.parent);showDetails(previous)}}
function locate(id){const n=byId.get(id);if(!n)return;if(n.kind==='step'){enter(n.parent);showDetails(id,true)}else enter(id);closeSearch()}
function zoomAt(z,point){stopAnimation();const a=state.camera,next=clamp(z,.12,3.5),ratio=next/a.z;camera({z:next,x:point.x-(point.x-a.x)*ratio,y:point.y-(point.y-a.y)*ratio})}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function targetAt(point){let best=null,dist=Infinity;for(const p of current.values()){if(p.ancestor||!canEnter(p.id))continue;const x=state.camera.x+(p.x+p.w/2)*state.camera.z,y=state.camera.y+(p.y+p.h/2)*state.camera.z,d=Math.hypot(x-point.x,y-point.y);if(d<dist){dist=d;best=p.id}}return dist<190?best:null}
function maybeDepth(){if(state.transitioning)return;const ratio=state.camera.z/state.base;if(lastGestureDirection<0&&ratio<.63&&state.focus!==D.root){up();toast('已返回上一层');return}const target=canEnter(gestureTarget)?gestureTarget:canEnter(state.selected)?state.selected:gesturePoint?targetAt(gesturePoint):null;if(lastGestureDirection>0&&ratio>1.55&&canEnter(target)){enter(target);toast('已展开 '+short(byId.get(target)))}}
function scheduleDepth(direction,point,target){lastGestureDirection=direction;gesturePoint=point;if(target)gestureTarget=target;clearTimeout(gestureTimer);gestureTimer=setTimeout(maybeDepth,190)}
svg.addEventListener('click',event=>{if(performance.now()<suppressUntil)return;const g=event.target.closest('[data-id]');if(!g)return;const id=g.dataset.id;if(event.target.closest('[data-enter]')){enter(id);return}if(g.classList.contains('ancestor')){enter(id);return}showDetails(id,true)});
svg.addEventListener('dblclick',event=>{const id=event.target.closest('[data-id]')?.dataset.id;if(id&&canEnter(id)){event.preventDefault();enter(id)}});
svg.addEventListener('pointerover',e=>{const id=e.target.closest('[data-id]')?.dataset.id;state.hover=id||null});
svg.addEventListener('pointerleave',()=>state.hover=null);
svg.addEventListener('keydown',e=>{const id=e.target.closest('[data-id]')?.dataset.id;if(!id)return;if(e.key==='Enter'){e.preventDefault();if(canEnter(id))enter(id);else showDetails(id,true)}if(e.key===' '){e.preventDefault();showDetails(id,true)}});
canvas.addEventListener('wheel',e=>{if(state.transitioning)return;e.preventDefault();const point=canvasPoint(e),unit=e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1,dy=e.deltaY*unit,dx=e.deltaX*unit;
 if(e.shiftKey||(!e.ctrlKey&&!e.metaKey&&Math.abs(dx)>Math.abs(dy)*1.3)){stopAnimation();camera({...state.camera,x:state.camera.x-(e.shiftKey?dy:dx),y:state.camera.y-(e.shiftKey?0:dy)});return}
 const target=e.target.closest('[data-id]')?.dataset.id||state.hover;zoomAt(state.camera.z*Math.exp(-clamp(dy,-180,180)*(e.ctrlKey?.009:.0028)),point);scheduleDepth(-Math.sign(dy),point,canEnter(target)?target:null)
},{passive:false});
const pointers=new Map();let lastPointer=null,pinch=null,moved=false;
svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;stopAnimation();pointers.set(e.pointerId,canvasPoint(e));if(!e.target.closest('[data-id]'))svg.setPointerCapture(e.pointerId);moved=false;
 if(pointers.size===1)lastPointer={...canvasPoint(e),start:canvasPoint(e)};
 if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),point:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};gestureTarget=targetAt(pinch.point)}
});
svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=canvasPoint(e);pointers.set(e.pointerId,p);
 if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const ratio=distance/Math.max(1,pinch.distance);zoomAt(state.camera.z*ratio,center);camera({...state.camera,x:state.camera.x+center.x-pinch.point.x,y:state.camera.y+center.y-pinch.point.y});lastGestureDirection=Math.sign(ratio-1)||lastGestureDirection;gesturePoint=center;pinch={distance,point:center};moved=true;return}
 if(pointers.size===1&&lastPointer){if(Math.hypot(p.x-lastPointer.start.x,p.y-lastPointer.start.y)>5)moved=true;if(moved){if(!svg.hasPointerCapture(e.pointerId))svg.setPointerCapture(e.pointerId);svg.classList.add('dragging');camera({...state.camera,x:state.camera.x+p.x-lastPointer.x,y:state.camera.y+p.y-lastPointer.y})}lastPointer={...p,start:lastPointer.start}}
});
function pointerEnd(e){if(!pointers.has(e.pointerId))return;const wasPinch=!!pinch;pointers.delete(e.pointerId);if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);if(moved)suppressUntil=performance.now()+180;svg.classList.remove('dragging');if(wasPinch&&pointers.size<2){pinch=null;gestureTimer=setTimeout(maybeDepth,130)}if(pointers.size===1){const p=[...pointers.values()][0];lastPointer={...p,start:p}}else lastPointer=null}
svg.addEventListener('pointerup',pointerEnd);svg.addEventListener('pointercancel',pointerEnd);
function closeSearch(){$('search-results').hidden=true;$('search').setAttribute('aria-expanded','false')}
$('search').addEventListener('input',()=>{
 const query=$('search').value.trim().toLowerCase(),box=$('search-results');box.replaceChildren();if(!query){closeSearch();return}
 const score=n=>{const label=n.label.toLowerCase();return label===query?1000:label.startsWith(query)?800:label.includes(query)?600:n.files.some(f=>f.toLowerCase().includes(query))?200:n.description.toLowerCase().includes(query)?100:0};
 const matches=D.nodes.map(n=>({n,score:score(n)})).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,18).map(x=>x.n);
 if(!matches.length)box.append(el('div',{class:'search-empty'},'没有找到相关模块。试试 FSDP、数据、梯度或 accelerator.py。'));
 matches.forEach(n=>{const b=el('button',{class:'search-result'});b.append(el('strong',{},n.label),el('small',{},nodeLabel[n.kind]+' · '+ancestors(n.id).slice(0,-1).map(x=>short(x)).join(' / ')));b.onclick=()=>{locate(n.id);$('search').value=''};box.append(b)});box.hidden=false;$('search').setAttribute('aria-expanded','true');
});
$('search').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();$('search-results').querySelector('button')?.focus()}if(e.key==='Enter')$('search-results').querySelector('button')?.click();if(e.key==='Escape'){closeSearch();$('search').blur();e.stopPropagation()}});
$('search-results').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();e.target.nextElementSibling?.focus()}if(e.key==='ArrowUp'){e.preventDefault();(e.target.previousElementSibling||$('search')).focus()}if(e.key==='Escape'){closeSearch();$('search').focus();e.stopPropagation()}});
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))closeSearch()});
$('up-button').onclick=up;$('reset').onclick=()=>enter(D.root);$('brand-home').onclick=e=>{e.preventDefault();enter(D.root)};
const training=D.domains.find(id=>id.includes('domain-training-'));$('guided-entry').onclick=()=>enter(training);
$('zoom-in').onclick=()=>{const p={x:canvas.clientWidth/2,y:canvas.clientHeight/2};zoomAt(state.camera.z*1.25,p);scheduleDepth(1,p,state.hover||state.selected)};
$('zoom-out').onclick=()=>{const p={x:canvas.clientWidth/2,y:canvas.clientHeight/2};zoomAt(state.camera.z/1.25,p);scheduleDepth(-1,p,null)};
$('fit').onclick=()=>{stopAnimation();clearTimeout(gestureTimer);const c=fitCamera(false);state.base=c.z;camera(c);toast('已适应当前子树')};
$('fullscreen').onclick=async()=>{const p=document.querySelector('.explorer');try{if(document.fullscreenElement)await document.exitFullscreen();else if(p.requestFullscreen)await p.requestFullscreen();else p.classList.toggle('is-fullscreen')}catch{p.classList.toggle('is-fullscreen')}};
$('mobile-detail').onclick=()=>$('inspector').classList.add('open');$('close-inspector').onclick=()=>$('inspector').classList.remove('open');
$('help-button').onclick=()=>$('help').showModal();$('close-help').onclick=()=>$('help').close();$('start-exploring').onclick=()=>$('help').close();$('help').addEventListener('click',e=>{if(e.target===$('help')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.key==='/'&&!$('help').open){e.preventDefault();$('search').focus()}if(e.key==='0')$('fit').click();if(e.key==='?')$('help').showModal();if(e.key==='Escape'&&!$('help').open){if($('inspector').classList.contains('open'))$('inspector').classList.remove('open');else if(document.querySelector('.explorer').classList.contains('is-fullscreen'))document.querySelector('.explorer').classList.remove('is-fullscreen');else if(!$('search-results').hidden)closeSearch();else up()}});
function fromHash(){try{const id=decodeURIComponent(location.hash.slice(1));if(byId.has(id)){const n=byId.get(id);state.focus=n.kind==='step'?n.parent:id;state.selected=id}else{state.focus=D.root;state.selected=D.root}}catch{state.focus=D.root;state.selected=D.root}}
window.addEventListener('popstate',()=>{fromHash();render();showDetails(state.selected)});
let resizeTimer;const resizeObserver=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const r=canvas.getBoundingClientRect();if(geo&&(!fittedSize||Math.abs(r.width-fittedSize.w)>.5||Math.abs(r.height-fittedSize.h)>.5))render(false)},120)});resizeObserver.observe(canvas);
fromHash();render(false);showDetails(state.selected);document.fonts.ready.then(()=>render(false));
window.AccelerateAtlas={state:()=>({...state,camera:{...state.camera},visible:geo.nodes.map(n=>n.id)}),nodes:D.nodes.map(n=>({id:n.id,kind:n.kind,label:n.label,parent:n.parent})),focus:enter,fit:()=>$('fit').click()};
})();
