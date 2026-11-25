(()=> {
'use strict';
let notice,pull,overlay,offline=!navigator.onLine,refreshing=false,probeBusy=false,startY=0,delta=0,touching=false,lastProbe=0;
const API_HEALTH='https://malawy-open-up.briramamonjisoa.workers.dev/__health';
function mount(){
 if(notice)return;
 notice=document.createElement('div');notice.id='mouConnectionNotice';notice.hidden=true;
 notice.innerHTML='<span class="mou-connection-dot"></span><span></span>';document.body.appendChild(notice);
 pull=document.createElement('div');pull.id='mouPullIndicator';
 pull.innerHTML='<span class="mou-pull-spinner"></span><span>Relâche pour actualiser</span>';document.body.appendChild(pull);
 overlay=document.createElement('section');overlay.id='mouConnectionOverlay';overlay.hidden=true;
 overlay.setAttribute('role','alertdialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','mouConnectionTitle');
 overlay.innerHTML='<div class="mou-connection-card"><div class="mou-connection-mark">M</div><p class="mou-connection-kicker">MALAWY OPEN UP</p><h2 id="mouConnectionTitle">Connexion indisponible</h2><p id="mouConnectionText">Vérifiez votre connexion Internet.</p><button type="button" id="mouConnectionRetry">Réessayer</button><small>Votre session reste enregistrée. Ne vous reconnectez pas et ne recréez pas de compte.</small></div>';
 document.body.appendChild(overlay);
 $('#mouConnectionRetry').addEventListener('click',()=>probe(true));
 updateNotice();
}
function updateNotice(message){
 if(!notice)return;
 notice.querySelector('span:last-child').textContent=message||(offline?'Vérifiez votre connexion Internet.':'');
 notice.hidden=!offline&&!message;
}
function showOverlay(serverDown=false){
 if(!overlay)return;
 offline=!navigator.onLine;
 $('#mouConnectionTitle').textContent=offline?'Connexion Internet indisponible':'Serveur MALAWY momentanément inaccessible';
 $('#mouConnectionText').textContent=offline?'Vérifiez votre connexion Internet.':'Internet semble disponible, mais MALAWY ne parvient pas à joindre son serveur. Réessayez dans quelques instants.';
 overlay.hidden=false;
 updateNotice(offline?'Vérifiez votre connexion Internet.':'Connexion au serveur MALAWY indisponible.');
}
function hideOverlay(){
 if(overlay)overlay.hidden=true;
 offline=false;
 updateNotice('');
 window.dispatchEvent(new Event('mou:network-restored'));
}
async function probe(force=false){
 if(probeBusy)return false;
 if(!navigator.onLine){offline=true;showOverlay();return false;}
 if(!force&&Date.now()-lastProbe<1200)return true;
 probeBusy=true;lastProbe=Date.now();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetch(API_HEALTH,{method:'GET',cache:'no-store',mode:'cors',signal:controller.signal});
  if(!response.ok)throw new Error('Health check HTTP '+response.status);
  const data=await response.json();
  if(data?.worker!=='malawy-open-up')throw new Error('Worker MALAWY non confirmé');
  hideOverlay();return true;
 }catch(error){
  console.warn('Vérification réseau MALAWY:',error.message||error);
  showOverlay(true);return false;
 }finally{clearTimeout(timeout);probeBusy=false;}
}
window.addEventListener('offline',()=>{offline=true;showOverlay();});
window.addEventListener('online',()=>{offline=false;probe(true);});
window.addEventListener('mou:refresh-failed',()=>probe(true));
window.addEventListener('mou:network-error',()=>probe(true));
window.addEventListener('pageshow',()=>{if(!document.hidden)probe(true);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)probe(true);});
function eligible(e){if(window.scrollY>2||offline||refreshing)return false;if(e.target.closest('input,textarea,select,[contenteditable="true"],.feed-modal:not([hidden]),.mou-confirm-overlay,#mouConnectionOverlay'))return false;return true;}
document.addEventListener('touchstart',e=>{if(!e.touches||e.touches.length!==1||!eligible(e))return;touching=true;startY=e.touches[0].clientY;delta=0;},{passive:true});
document.addEventListener('touchmove',e=>{if(!touching||!e.touches||e.touches.length!==1)return;delta=Math.max(0,e.touches[0].clientY-startY);if(delta>8){pull.classList.add('visible');pull.querySelector('span:last-child').textContent=delta>82?'Relâche pour actualiser':'Tire pour actualiser';}},{passive:true});
document.addEventListener('touchend',()=>{if(!touching)return;touching=false;if(delta>82&&!offline&&!refreshing)refresh();else pull.classList.remove('visible');delta=0;},{passive:true});
document.addEventListener('touchcancel',()=>{touching=false;delta=0;pull.classList.remove('visible');},{passive:true});
async function refresh(){
 if(refreshing)return;
 if(!navigator.onLine){offline=true;showOverlay();pull.classList.remove('visible');return;}
 refreshing=true;pull.classList.add('visible','loading');pull.querySelector('span:last-child').textContent='Actualisation…';
 try{
  await new Promise(resolve=>{let settled=false;const done=()=>{if(settled)return;settled=true;resolve();};window.dispatchEvent(new CustomEvent('mou:refresh-request',{detail:{done}}));setTimeout(done,18000);});
  await probe(true);
 }finally{refreshing=false;pull.classList.remove('loading');pull.querySelector('span:last-child').textContent='Actualisé';setTimeout(()=>pull.classList.remove('visible'),850);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();probe(true);},{once:true});
else{mount();probe(true);}
})();