(()=>{
'use strict';
let notice,pull,offline=!navigator.onLine,refreshing=false,startY=0,delta=0,touching=false;
function mount(){if(notice)return;notice=document.createElement('div');notice.id='mouConnectionNotice';notice.hidden=true;notice.innerHTML='<span class="mou-connection-dot"></span><span></span>';document.body.appendChild(notice);pull=document.createElement('div');pull.id='mouPullIndicator';pull.innerHTML='<span class="mou-pull-spinner"></span><span>Relâche pour actualiser</span>';document.body.appendChild(pull);updateNotice();}
function updateNotice(message){if(!notice)return;notice.querySelector('span:last-child').textContent=message||(offline?'Vérifiez votre connexion Internet.':'Connexion Internet rétablie.');notice.hidden=!offline&&!message;}
window.addEventListener('offline',()=>{offline=true;updateNotice('Vérifiez votre connexion Internet.');});
window.addEventListener('online',()=>{offline=false;updateNotice('Connexion Internet rétablie.');setTimeout(()=>{if(!offline)updateNotice();},2600);});
function eligible(e){if(window.scrollY>2||offline||refreshing)return false;if(e.target.closest('input,textarea,select,[contenteditable="true"],.feed-modal:not([hidden]),.mou-confirm-overlay'))return false;return true;}
document.addEventListener('touchstart',e=>{if(!e.touches||e.touches.length!==1||!eligible(e))return;touching=true;startY=e.touches[0].clientY;delta=0;},{passive:true});
document.addEventListener('touchmove',e=>{if(!touching||!e.touches||e.touches.length!==1)return;delta=Math.max(0,e.touches[0].clientY-startY);if(delta>8){pull.classList.add('visible');pull.querySelector('span:last-child').textContent=delta>82?'Relâche pour actualiser':'Tire pour actualiser';}},{passive:true});
document.addEventListener('touchend',()=>{if(!touching)return;touching=false;if(delta>82&&!offline&&!refreshing)refresh();else pull.classList.remove('visible');delta=0;},{passive:true});
document.addEventListener('touchcancel',()=>{touching=false;delta=0;pull.classList.remove('visible');},{passive:true});
async function refresh(){if(refreshing)return;if(!navigator.onLine){offline=true;updateNotice('Vérifiez votre connexion Internet.');pull.classList.remove('visible');return;}refreshing=true;pull.classList.add('visible','loading');pull.querySelector('span:last-child').textContent='Actualisation…';try{window.dispatchEvent(new Event('mou:refresh-request'));await new Promise(r=>setTimeout(r,700));}finally{refreshing=false;pull.classList.remove('loading');pull.querySelector('span:last-child').textContent='Actualisé';setTimeout(()=>pull.classList.remove('visible'),850);}}
window.addEventListener('mou:refresh-failed',()=>{offline=!navigator.onLine;updateNotice('Vérifiez votre connexion Internet.');});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();