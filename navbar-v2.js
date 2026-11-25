(() => {
'use strict';
const ITEMS=[
 {id:'home',label:'Accueil',color:'#d8bd7a',icon:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>'},
 {id:'register',label:'Tournois',color:'#e6c77c',icon:'<path d="m8 3 8 18M16 3 8 21M5 8l7 4 7-4M5 16l7-4 7 4"/>'},
 {id:'players',label:'Joueurs',color:'#bca8ff',icon:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M17 8a3 3 0 0 1 0 6M18 15c2 .7 3.2 2.2 3.5 5"/>'},
 {id:'community',label:'Social',color:'#7de0c3',icon:'<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z"/>'},
 {id:'profile',label:'Profil',color:'#f3a9c8',icon:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-3.5 3.5-5.5 7-5.5s6.5 2 7 5.5"/>'}
];
function install(){
 if(document.getElementById('mouNavV2'))return;
 const style=document.createElement('style');style.id='mouMeniscusNavStyle';style.textContent=`
 .mou-nav-v2{--nav-accent:#d8bd7a;position:fixed!important;z-index:10020!important;left:50%!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;transform:translateX(-50%)!important;width:min(560px,calc(100% - 28px))!important;height:72px!important;min-height:72px!important;padding:0 9px!important;display:block!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;isolation:isolate}
 .mou-nav-v2 .mou-meniscus-shape{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 12px 24px rgba(0,0,0,.62));pointer-events:none}
 .mou-nav-v2 .mou-meniscus-shape path{fill:rgba(12,11,13,.96);stroke:rgba(216,189,122,.42);stroke-width:1}
 .mou-nav-v2 .mou-meniscus-glow{position:absolute;left:0;top:43px;width:180px;height:75px;margin-left:-90px;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,color-mix(in srgb,var(--nav-accent) 38%,transparent),transparent);filter:blur(15px);opacity:.78;will-change:transform;transition:background .4s}
 .mou-nav-v2 .mou-meniscus-tabs{position:absolute;inset:0;display:flex;padding:0 10px}
 .mou-nav-v2 .mou-nav-item{flex:1;position:relative;z-index:1;min-width:0;min-height:72px;padding:0 1px 7px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-end!important;gap:5px!important;border:0!important;border-radius:0!important;background:transparent!important;color:rgba(245,237,219,.62)!important;font:600 10px Inter,Arial,sans-serif!important;letter-spacing:.01em!important;white-space:nowrap!important;box-shadow:none!important}
 .mou-nav-v2 .mou-nav-icon{width:23px;height:23px;display:grid;place-items:center;color:#c9b98f!important;font-size:0!important;line-height:1;transition:opacity .2s,transform .25s}
 .mou-nav-v2 .mou-nav-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
 .mou-nav-v2 .mou-nav-item.active{color:var(--nav-accent)!important;background:transparent!important;border:0!important}
 .mou-nav-v2 .mou-nav-item.active .mou-nav-icon{opacity:0;transform:translateY(5px)}
 .mou-nav-v2 .mou-nav-item>span:last-child{position:relative;z-index:2;transition:color .25s,transform .25s}
 .mou-nav-v2 .mou-nav-item.active>span:last-child{color:var(--nav-accent);transform:translateY(-1px)}
 .mou-nav-v2 .mou-meniscus-bead{position:absolute;z-index:3;top:-24px;left:0;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;touch-action:none;cursor:grab;color:#17120b;background:radial-gradient(circle at 35% 28%,color-mix(in srgb,var(--nav-accent) 58%,#fff),var(--nav-accent) 62%);box-shadow:0 0 23px color-mix(in srgb,var(--nav-accent) 70%,transparent),inset 0 -3px 6px #0003;will-change:transform}
 .mou-nav-v2 .mou-meniscus-bead:active{cursor:grabbing}
 .mou-nav-v2 .mou-meniscus-bead svg{width:21px;height:21px;fill:none;stroke:#17120b;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
 .mou-nav-v2 .mou-nav-glow{position:absolute;inset:-4px;border-radius:40px;pointer-events:none;z-index:-1;background:linear-gradient(110deg,transparent 8%,rgba(216,189,122,.13) 48%,transparent 88%);opacity:.6;animation:mouMeniscusHalo 5s ease-in-out infinite}
 @keyframes mouMeniscusHalo{0%,100%{opacity:.25;filter:blur(4px)}50%{opacity:.85;filter:blur(10px)}}
 @media(max-width:380px){.mou-nav-v2{width:calc(100% - 16px)!important}.mou-nav-v2 .mou-meniscus-tabs{padding:0 5px}.mou-nav-v2 .mou-nav-item{font-size:9px!important}}
 @media(prefers-reduced-motion:reduce){.mou-nav-v2 .mou-nav-glow{animation:none}}
 body{padding-bottom:calc(100px + env(safe-area-inset-bottom))!important}
 .mou-nav-v2~.bottom,.mou-nav-v2~.tabs{display:none!important}
 `;document.head.appendChild(style);
 const nav=document.createElement('nav');nav.id='mouNavV2';nav.className='mou-nav-v2';nav.setAttribute('aria-label','Navigation MALAWY OPEN UP');
 nav.innerHTML='<svg class="mou-meniscus-shape" aria-hidden="true"><defs><linearGradient id="mouMeniscusFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1919"/><stop offset="1" stop-color="#080809"/></linearGradient></defs><path fill="url(#mouMeniscusFill)"></path></svg><div class="mou-nav-glow"></div><div class="mou-meniscus-glow"></div><div class="mou-meniscus-tabs" role="tablist"></div><div class="mou-meniscus-bead" aria-hidden="true"><svg viewBox="0 0 24 24"><path></path></svg></div>';
 const tabs=nav.querySelector('.mou-meniscus-tabs');ITEMS.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='mou-nav-item';b.dataset.tab=item.id;b.setAttribute('role','tab');b.innerHTML='<span class="mou-nav-icon"><svg viewBox="0 0 24 24">'+item.icon+'</svg></span><span>'+item.label+'</span>';tabs.appendChild(b);});
 document.body.appendChild(nav);
 const bar=nav,bead=nav.querySelector('.mou-meniscus-bead'),glow=nav.querySelector('.mou-meniscus-glow'),path=nav.querySelector('path'),beadPath=bead.querySelector('path'),els=[...tabs.children];
 let current=0,x=0,target=0,dragging=false,raf=0;
 const center=i=>{const a=els[i].getBoundingClientRect(),b=bar.getBoundingClientRect();return a.left-b.left+a.width/2;};
 function draw(){const w=bar.clientWidth,h=72,cx=Math.max(37,Math.min(w-37,x)),r=25,y=3,a=Math.sqrt(r*r-9),s=11;const d='M24 0 H'+(cx-a-s)+' C'+(cx-a-s*.45)+' 0 '+(cx-a-1)+' 1 '+(cx-a)+' 3 A'+r+' '+r+' 0 0 0 '+(cx+a)+' 3 C'+(cx+a+1)+' 1 '+(cx+a+s*.45)+' 0 '+(cx+a+s)+' 0 H'+(w-24)+' Q'+w+' 0 '+w+' 24 V48 Q'+w+' 72 '+(w-24)+' 72 H24 Q0 72 0 48 V24 Q0 0 24 0 Z';path.setAttribute('d',d);bead.style.transform='translateX('+(cx-21)+'px)';glow.style.transform='translateX('+cx+'px)';}
 function activate(i){current=Math.max(0,Math.min(ITEMS.length-1,i));const item=ITEMS[current];els.forEach((el,k)=>{el.classList.toggle('active',k===current);el.setAttribute('aria-selected',String(k===current));});bar.style.setProperty('--nav-accent',item.color);beadPath.setAttribute('d',item.icon);target=center(current);if(!dragging)animate();}
 function animate(){if(raf)return;const step=()=>{const d=target-x;if(dragging||Math.abs(d)<.25){x=target;draw();raf=0;return;}x+=d*.22;draw();raf=requestAnimationFrame(step);};raf=requestAnimationFrame(step);}
 function sync(pageId){const active=document.querySelector('main .page.active');let id=(typeof pageId==='string'&&pageId)?pageId:(active?.id||'home');if(id==='home')id='community';if(id==='messages')id='community';if(id==='matches'||id==='ranking'||id==='register')id='register';if(id==='admin')id='profile';const i=Math.max(0,ITEMS.findIndex(x=>x.id===id));if(i!==current||Math.abs(target-center(i))>.5)activate(i);}
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){const i=ITEMS.findIndex(x=>x.id===b.dataset.tab);if(i>=0)activate(i);requestAnimationFrame(()=>requestAnimationFrame(sync));}});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){requestAnimationFrame(()=>requestAnimationFrame(sync));}},true);
 bead.addEventListener('pointerdown',e=>{dragging=true;bead.setPointerCapture(e.pointerId);});
 bead.addEventListener('pointermove',e=>{if(!dragging)return;const rect=bar.getBoundingClientRect();x=target=Math.max(center(0),Math.min(center(ITEMS.length-1),e.clientX-rect.left));let n=0,best=Infinity;ITEMS.forEach((_,i)=>{const d=Math.abs(center(i)-x);if(d<best){best=d;n=i;}});activate(n);dragging=true;draw();});
 const end=()=>{if(!dragging)return;dragging=false;target=center(current);animate();};bead.addEventListener('pointerup',end);bead.addEventListener('pointercancel',end);
 const pageRoot=document.querySelector('main');
 if(pageRoot)new MutationObserver(()=>requestAnimationFrame(()=>sync())).observe(pageRoot,{subtree:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('mou:page-change',e=>requestAnimationFrame(()=>sync(e.detail?.page)));
 window.addEventListener('hashchange',()=>requestAnimationFrame(sync));
 window.addEventListener('popstate',()=>requestAnimationFrame(sync));
 new ResizeObserver(()=>{target=x=center(current);draw();}).observe(bar);
 activate(0);x=target=center(0);draw();sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();