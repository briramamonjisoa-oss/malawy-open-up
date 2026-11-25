/* MALAWY Flow-style profile, media sheet and message actions. No demo data. */
(function(){
'use strict';
const API='https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=()=>localStorage.getItem('mou_player_token')||'';
async function api(path,options={}){const r=await fetch(API+path,{...options,headers:{Authorization:'Bearer '+token(),...(options.headers||{}),...(options.body?{'Content-Type':'application/json'}:{})},cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur '+r.status);return d;}
function setup(){
 const page=$('messages'),shell=page?.querySelector('.mou-messages-shell'),active=$('mouChatActive'),head=active?.querySelector('.mou-chat-header'),list=$('mouChatMessages');
 if(!shell||!head||!list||shell.dataset.flowExtras)return;shell.dataset.flowExtras='1';
 const style=document.createElement('style');style.textContent=`
 #mouFlowProfile{position:fixed;inset:0;z-index:130010;overflow:auto;background:radial-gradient(ellipse at 50% 8%,#d8c18a1a,transparent 42%),#080909;color:#f3eee4;transform:translateY(105%);transition:transform .35s ease;padding:calc(12px + env(safe-area-inset-top)) 16px calc(22px + env(safe-area-inset-bottom));}
 #mouFlowProfile.show{transform:none}#mouFlowProfile .top{display:flex;justify-content:flex-end}#mouFlowProfile button{cursor:pointer;color:#e7d5a6}#mouFlowProfile .close{width:40px;height:40px;border:1px solid #d8c18a44;border-radius:50%;background:#d8c18a12;font-size:22px}
 #mouFlowProfile .hero{text-align:center;padding:22px 0}#mouFlowProfile .avatar{width:112px;height:112px;margin:auto;border:2px solid #d8c18a99;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#241f14;color:#ead9a9;font-size:38px;box-shadow:0 0 35px #d8c18a30}#mouFlowProfile .avatar img{width:100%;height:100%;object-fit:cover}#mouFlowProfile h2{margin:18px 0 4px;font-size:24px}#mouFlowProfile .online{color:#cbb982;font-size:12px}#mouFlowProfile .bio{color:#a9a194;font-size:13px;margin:12px auto;max-width:330px;line-height:1.5}
 #mouFlowProfile .actions{display:flex;justify-content:center;gap:10px;margin:12px 0 20px}#mouFlowProfile .actions button{padding:12px 17px;border:1px solid #d8c18a55;border-radius:14px;background:#d8c18a12}
 #mouFlowProfile .card{margin:12px 0;padding:14px 16px;border:1px solid #d8c18a26;border-radius:18px;background:#ffffff07}#mouFlowProfile .card h3{font-size:11px;letter-spacing:.12em;color:#cbb982;margin-bottom:10px}#mouFlowProfile .info{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #ffffff10;font-size:12px}#mouFlowProfile .info:first-of-type{border:0}#mouFlowProfile .info span:first-child{color:#938c80}
 #mouFlowSheet{position:fixed;inset:0;z-index:130009;display:none;align-items:flex-end;background:#0009}#mouFlowSheet.show{display:flex}#mouFlowSheet .panel{width:min(100%,460px);margin:auto auto 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom));border:1px solid #d8c18a33;border-bottom:0;border-radius:24px 24px 0 0;background:linear-gradient(180deg,#1a1813,#090a0a)}#mouFlowSheet .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}#mouFlowSheet button{padding:15px 5px;border:1px solid #d8c18a33;border-radius:15px;background:#d8c18a0e;color:#ead9a9}
 .mou-flow-context{position:fixed;z-index:130020;display:flex;gap:6px;padding:9px;border:1px solid #d8c18a66;border-radius:18px;background:#12110ff5;box-shadow:0 16px 55px #000b;backdrop-filter:blur(18px)}.mou-flow-context button{padding:8px 10px;border:1px solid #d8c18a33;border-radius:11px;background:#d8c18a12;color:#ead9a9}
 .mou-flow-lightbox{position:fixed;inset:0;z-index:130030;display:grid;place-items:center;background:#000e}.mou-flow-lightbox img{max-width:96vw;max-height:88vh;object-fit:contain}
 @media(max-width:760px){body.mou-chat-fullscreen #messages .mou-chat-active{height:100dvh!important}}
 `;document.head.append(style);
 const profile=document.createElement('section');profile.id='mouFlowProfile';profile.innerHTML='<div class="top"><button class="close" type="button" aria-label="Fermer">×</button></div><div class="hero"><div class="avatar">M</div><h2>Joueur</h2><div class="online">Statut indisponible</div><p class="bio"></p></div><div class="actions"><button type="button" data-profile-action="message">Message</button><button type="button" data-profile-action="audio">Appel audio</button><button type="button" data-profile-action="video">Vidéo</button></div><div class="card"><h3>INFORMATIONS DU JOUEUR</h3><div class="info"><span>Pseudo</span><span data-info="pseudo">—</span></div><div class="info"><span>UID Free Fire</span><span data-info="uid">—</span></div><div class="info"><span>Points</span><span data-info="points">—</span></div><div class="info"><span>Victoires</span><span data-info="wins">—</span></div></div><div class="card"><h3>PHOTOS PARTAGÉES</h3><p class="bio">Les médias de cette conversation sont accessibles dans l’historique des messages.</p></div>';
 document.body.append(profile);
 const sheet=document.createElement('div');sheet.id='mouFlowSheet';sheet.innerHTML='<div class="panel"><h3 style="margin:0 0 14px;color:#ead9a9">Joindre un média</h3><div class="tiles"><button type="button" data-pick="gallery">▧<br>Galerie</button><button type="button" data-pick="camera">▣<br>Caméra</button><button type="button" data-pick="voice">♬<br>Vocal</button></div></div>';document.body.append(sheet);
 const media=$('mouChatMediaInput'),attach=$('mouChatAttach');
 attach?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();sheet.classList.add('show');},true);
 sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.classList.remove('show');});
 sheet.querySelector('[data-pick="gallery"]').onclick=()=>{sheet.classList.remove('show');media?.click();};
 sheet.querySelector('[data-pick="camera"]').onclick=()=>{sheet.classList.remove('show');let camera=$('mouFlowCamera');if(!camera){camera=document.createElement('input');camera.type='file';camera.id='mouFlowCamera';camera.accept='image/*';camera.capture='environment';camera.hidden=true;document.body.append(camera);camera.addEventListener('change',()=>{if(camera.files?.[0]){const dt=new DataTransfer();dt.items.add(camera.files[0]);media.files=dt.files;media.dispatchEvent(new Event('change',{bubbles:true}));}});}camera.click();};
 sheet.querySelector('[data-pick="voice"]').onclick=()=>{sheet.classList.remove('show');$('mouChatVoice')?.click();};
 const avatar=head.querySelector('#mouChatAvatar'),name=head.querySelector('#mouChatName');
 async function openProfile(){const id=window.MOU_CURRENT_CHAT?.id;if(!id)return;profile.classList.add('show');const pseudo=name?.textContent||'Joueur';profile.querySelector('h2').textContent=pseudo;profile.querySelector('.avatar').textContent=pseudo.slice(0,1).toUpperCase();profile.querySelector('[data-info="pseudo"]').textContent=pseudo;
 try{const data=await api('players?fast=1'),player=(Array.isArray(data)?data:[]).find(x=>String(x.id)===String(id));if(!player)return;profile.querySelector('.avatar').innerHTML=player.photo?'<img src="'+esc(player.photo)+'" alt="">':esc(pseudo.slice(0,1).toUpperCase());profile.querySelector('.online').textContent=player.online?'● En ligne':'○ Hors ligne';profile.querySelector('.bio').textContent=player.bio||'Joueur de la communauté MALAWY OPEN UP';profile.querySelector('[data-info="uid"]').textContent=player.playerId||'Non renseigné';profile.querySelector('[data-info="points"]').textContent=String(player.points??'—');profile.querySelector('[data-info="wins"]').textContent=String(player.wins??'—');}catch(e){console.warn('Profil MALAWY:',e.message);}
 }
 avatar?.addEventListener('click',openProfile);name?.addEventListener('click',openProfile);profile.querySelector('.close').onclick=()=>profile.classList.remove('show');profile.addEventListener('click',e=>{const b=e.target.closest('[data-profile-action]');if(!b)return;if(b.dataset.profileAction==='message')profile.classList.remove('show');else{const call=$(b.dataset.profileAction==='audio'?'mouCallAudio':'mouCallVideo');if(call)call.click();else alert('Les appels sont indisponibles dans cette conversation.');}});
 let currentBubble=null,timer=null,long=false,lastTap=0,context=null;
 function closeMenu(){context?.remove();context=null;}
 function showMenu(b,x,y){closeMenu();currentBubble=b;const m=document.createElement('div');m.className='mou-flow-context';m.innerHTML='<button data-a="❤️">❤️</button><button data-a="😂">😂</button><button data-a="👍">👍</button><button data-a="reply">↩ Répondre</button><button data-a="copy">Copier</button>';document.body.append(m);const r=m.getBoundingClientRect();m.style.left=Math.max(8,Math.min(innerWidth-r.width-8,x-r.width/2))+'px';m.style.top=Math.max(8,Math.min(innerHeight-r.height-8,y-r.height-8))+'px';m.onclick=async e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;if(a==='copy'){try{await navigator.clipboard.writeText(currentBubble.innerText);}catch{}}else if(a==='reply')currentBubble.querySelector('[data-reply]')?.click();else{const r=currentBubble.querySelector('[data-react]');if(r){r.click();setTimeout(()=>currentBubble.querySelector('[data-emoji="'+a+'"]')?.click(),0);}}closeMenu();};context=m;}
 list.addEventListener('contextmenu',e=>{if(e.target.closest('audio,video,button'))return;const b=e.target.closest('.mou-chat-bubble');if(b){e.preventDefault();showMenu(b,e.clientX,e.clientY);}});
 list.addEventListener('touchstart',e=>{if(e.target.closest('audio,video,button'))return;const b=e.target.closest('.mou-chat-bubble');if(!b)return;const t=e.touches[0];long=false;clearTimeout(timer);timer=setTimeout(()=>{long=true;showMenu(b,t.clientX,t.clientY);},520);},{passive:true});
 ['touchend','touchmove','touchcancel'].forEach(n=>list.addEventListener(n,()=>clearTimeout(timer),{passive:true}));
 list.addEventListener('click',e=>{if(e.target.closest('audio,video,button'))return;if(long){long=false;e.preventDefault();return;}const img=e.target.closest('img.mou-chat-media');if(img){const v=document.createElement('div');v.className='mou-flow-lightbox';v.innerHTML='<button style="position:absolute;top:20px;right:20px;background:#17140f;border:1px solid #d8c18a;border-radius:50%;width:40px;height:40px;color:#ead9a9">×</button><img alt="Photo partagée">';v.querySelector('img').src=img.src;v.onclick=()=>v.remove();document.body.append(v);return;}const b=e.target.closest('.mou-chat-bubble');if(b){const n=Date.now();if(n-lastTap<320){const r=b.querySelector('[data-react]');if(r){r.click();setTimeout(()=>b.querySelector('[data-emoji="❤️"]')?.click(),0);}}lastTap=n;}});
 document.addEventListener('click',e=>{if(context&&!e.target.closest('.mou-flow-context'))closeMenu();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
document.addEventListener('mou:player-auth',setup);
})();

/* Flow layout adapter: keep MALAWY's real message/API controls, rebuild only their presentation. */
(function(){
'use strict';
function mountFlowLayout(){
 const active=document.getElementById('mouChatActive');
 if(!active||active.dataset.flowLayout==='1')return;
 const header=active.querySelector('.mou-chat-header');
 const list=document.getElementById('mouChatMessages');
 const form=document.getElementById('mouChatForm');
 const tools=document.querySelector('#mouChatActive .mou-chat-tools:not(.mou-chat-theme)');
 const themes=document.querySelector('#mouChatActive .mou-chat-theme');
 const reply=document.querySelector('#mouChatActive .mou-reply-preview');
 const input=document.getElementById('mouChatInput');
 const send=form?.querySelector('button[type="submit"]');
 if(!header||!list||!form||!tools||!input||!send)return;
 active.dataset.flowLayout='1';
 const shell=document.querySelector('#messages .mou-messages-shell');
 shell?.classList.add('mou-flow-chat');
 const page=document.getElementById('messages');page?.classList.add('mou-flow-chat');
 // Flow composer: attach and microphone controls live inside the rounded input field.
 const field=document.createElement('div');field.className='mou-flow-field';
 const attach=document.getElementById('mouChatAttach'),voice=document.getElementById('mouChatVoice');
 const mediaStatus=document.getElementById('mouChatMediaStatus');
 field.append(input);
 if(attach)field.append(attach);
 if(voice)field.append(voice);
 if(mediaStatus)field.append(mediaStatus);
 form.insertBefore(field,send);
 form.classList.add('mou-flow-composer');
 if(reply)form.parentElement.insertBefore(reply,form);
 if(themes){themes.hidden=true;themes.setAttribute('aria-hidden','true');}
 // Header controls stay bound to the existing WebRTC buttons mounted by calls-ui.js.
 header.classList.add('mou-flow-header');
 const avatar=document.getElementById('mouChatAvatar');
 avatar?.classList.add('mou-flow-avatar');
 const back=header.querySelector('#mouChatBack');
 back?.setAttribute('aria-label','Retour');
 const callButtons=header.querySelector('.mou-call-header-actions');
 if(callButtons){callButtons.classList.add('mou-flow-call-actions');}
 // A small day marker, without replacing or fabricating conversation messages.
 if(!list.querySelector('.mou-flow-day')){
  const marker=document.createElement('div');marker.className='mou-flow-day';marker.textContent='Conversation';list.prepend(marker);
 }
 // Reposition reply preview in the same sequence as Flow.
 if(reply)reply.classList.add('mou-flow-reply');
 // Keep the message list as the only flexible/scrolling region.
 active.classList.add('mou-flow-active');
 form.setAttribute('autocomplete','off');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFlowLayout);else mountFlowLayout();
document.addEventListener('mou:messages-updated',mountFlowLayout);
document.addEventListener('mou:player-auth',mountFlowLayout);
})();
