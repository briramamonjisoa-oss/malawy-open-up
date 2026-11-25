(function(){
'use strict';
const API='https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/';
const $=id=>document.getElementById(id);
const shell=$('messages')?.querySelector('.mou-messages-shell');
if(!shell||shell.dataset.mouReady==='1')return;
shell.dataset.mouReady='1';
let contacts=[],activeId='',activeName='',activeGroupId='',messages=[],poll=null,lastLoad=0,replyTo=null;
const cacheKey=id=>'mou_chat_cache_v1:'+id;
const inboxCacheKey='mou_messenger_inbox_v2';
function readInboxCache(){try{const x=JSON.parse(localStorage.getItem(inboxCacheKey)||'{}');return x&&Array.isArray(x.contacts)&&Array.isArray(x.messages)?x:null;}catch{return null;}}
function saveInboxCache(){try{localStorage.setItem(inboxCacheKey,JSON.stringify({contacts, messages:contactsMessages, savedAt:Date.now()}));}catch(e){}}
function saveChatCache(id,items){try{localStorage.setItem(cacheKey(id),JSON.stringify(items.slice(-150)));}catch(e){}}
function readChatCache(id){try{const v=JSON.parse(localStorage.getItem(cacheKey(id))||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
const token=()=>localStorage.getItem('mou_player_token')||'';
const page=()=>document.getElementById('messages');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=s=>{if(!s)return '';const d=new Date(s);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});};
async function request(path,options={}){
 const t=token();if(!t)throw Error('Connecte-toi avec ton compte joueur pour utiliser les messages.');
 const headers={Authorization:'Bearer '+t,...(options.headers||{})};
 if(options.body)headers['Content-Type']='application/json';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const r=await fetch(API+path,{...options,headers,cache:'no-store',signal:options.signal||controller.signal});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||'Erreur '+r.status);
  return d;
 }catch(error){if(error.name==='AbortError')throw Error('Le serveur met trop de temps à répondre. Réessaie dans un instant.');throw error;}
 finally{clearTimeout(timer);}
}

function mountGuildCard(){
 if($('mouGuildMessengerCard'))return $('mouGuildMessengerCard');
 const card=document.createElement('section');card.id='mouGuildMessengerCard';card.hidden=true;
 card.innerHTML='<div class="mou-guild-card-mark">✦</div><div class="mou-guild-card-copy"><span class="mou-guild-card-kicker">MALAWY · GUILDE OFFICIELLE</span><b class="mou-guild-card-title"></b><p class="mou-guild-card-desc"></p></div><button type="button" class="mou-guild-card-action" hidden></button>';
 const style=document.createElement('style');style.id='mouGuildMessengerStyles';style.textContent=`
 #mouGuildMessengerCard{box-sizing:border-box;display:flex;align-items:center;gap:13px;margin:0 0 15px;padding:15px;border:1px solid rgba(216,193,138,.28);border-radius:18px;background:radial-gradient(ellipse at 0 0,rgba(216,193,138,.14),transparent 55%),linear-gradient(145deg,#1b1915,#090a0c);color:#f3eee4;box-shadow:0 12px 30px rgba(0,0,0,.2)}
 #mouGuildMessengerCard[hidden]{display:none}
 #mouGuildMessengerCard .mou-guild-card-mark{display:grid;flex:0 0 42px;width:42px;height:42px;place-items:center;border:1px solid rgba(216,193,138,.38);border-radius:14px;background:rgba(216,193,138,.1);color:#e5ce96;font-size:22px}
 #mouGuildMessengerCard .mou-guild-card-copy{flex:1;min-width:0}
 #mouGuildMessengerCard .mou-guild-card-kicker{display:block;color:#d8c18a;font-size:9px;font-weight:800;letter-spacing:.14em}
 #mouGuildMessengerCard .mou-guild-card-title{display:block;margin:5px 0;color:#f5efe4;font-size:15px;overflow-wrap:anywhere}
 #mouGuildMessengerCard .mou-guild-card-desc{margin:0;color:#aaa294;font-size:11px;line-height:1.45}
 #mouGuildMessengerCard .mou-guild-card-action{flex:0 0 auto;max-width:138px;padding:10px 12px;border:1px solid rgba(216,193,138,.48);border-radius:11px;background:linear-gradient(120deg,#bda66f,#e5d3a6);color:#15120b;font-size:10px;font-weight:900}
 #mouGuildMessengerCard .mou-guild-card-action:disabled{opacity:.55}
 @media(max-width:480px){#mouGuildMessengerCard{align-items:flex-start;flex-wrap:wrap}#mouGuildMessengerCard .mou-guild-card-action{margin-left:55px;max-width:none}}
 `;if(!document.getElementById(style.id))document.head.appendChild(style);
 const home=document.getElementById('home'),heading=home?.querySelector('.mou-home-heading');if(heading)heading.insertAdjacentElement('afterend',card);else shell.parentElement.insertBefore(card,shell);return card;
}
let guildGroupState=null,guildCardTask=null;
function renderGuildCard(data){
 const card=mountGuildCard();guildGroupState=data||null;
 if(!data||(!data.group&&!data.canCreate)){card.hidden=true;return;}
 card.hidden=false;
 const title=card.querySelector('.mou-guild-card-title'),desc=card.querySelector('.mou-guild-card-desc'),button=card.querySelector('.mou-guild-card-action');
 if(data.group){
  const mark=card.querySelector('.mou-guild-card-mark');
  mark.innerHTML=data.group.photo?'<img src="'+esc(data.group.photo)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:13px">':'✦';
  title.textContent=data.group.name||'Groupe de guilde';
  desc.textContent=data.welcomeCreated?'Bienvenue, chef ! Ton groupe a été créé automatiquement. Le nom est déjà renseigné : personnalise simplement sa photo dans Profil → Ma guilde.':data.role==='leader'?'Ton groupe officiel est prêt. Tu es le Chef et tu peux gérer les officiers.':data.role==='officer'?'Groupe officiel de ta guilde · Tu es officier.':'Groupe officiel de ta guilde. Discute avec les membres.';
  button.hidden=false;button.disabled=false;button.textContent='Ouvrir le groupe';button.onclick=()=>openGuildChat(data.group.guildId,data.group.name);
  if(data.welcomeCreated)window.dispatchEvent(new CustomEvent('mou:guild-welcome',{detail:{name:data.group.name}}));
 }else{
  const name=data.guild?.name||'ta guilde';
  title.textContent='Guilde Free Fire : '+name;
  desc.textContent='Ton groupe sera préparé automatiquement dès que les informations officielles de Free Fire seront disponibles.';
  button.hidden=false;button.textContent='Actualiser';button.disabled=false;
  button.onclick=refreshGuildGroup;
 }
}
async function openGuildChat(guildId,name){
 activeId='';activeGroupId=String(guildId||'');activeName=name||'Groupe de guilde';lastRenderedMessagesKey='';window.MOU_CURRENT_CHAT={id:'',groupId:activeGroupId,name:activeName};
 $('mouChatEmpty').hidden=true;$('mouChatActive').hidden=false;
 $('mouChatName').textContent=activeName;$('mouChatAvatar').textContent='✦';
 const subtitle=$('mouChatActive').querySelector('.mou-chat-header small');if(subtitle)subtitle.textContent='Discussion de guilde · Membres officiels';
 shell.classList.add('chat-open');document.body.classList.add('mou-chat-fullscreen');renderContacts();status('');
 $('mouChatMessages').innerHTML='<p class="mou-message-empty">Chargement du groupe…</p>';
 try{const d=await request('messages?group='+encodeURIComponent(activeGroupId));messages=d.messages||[];renderMessages();}
 catch(e){$('mouChatMessages').innerHTML='<p class="mou-message-empty">'+esc(e.message)+'</p>';}
}
async function refreshGuildGroup(){
 if(!token())return;
 if(guildCardTask)return guildCardTask;
 guildCardTask=request('guild-groups').then(data=>{renderGuildCard(data);return data;}).catch(error=>{
  console.warn('Groupe de guilde:',error.message);
  renderGuildCard(null);return null;
 }).finally(()=>{guildCardTask=null;});
 return guildCardTask;
}
async function createGuildGroup(){
 const button=$('mouGuildMessengerCard')?.querySelector('.mou-guild-card-action');if(!button||button.disabled)return;
 button.disabled=true;button.textContent='Création…';
 try{
  const result=await request('guild-groups',{method:'POST',body:JSON.stringify({action:'create'})});
  renderGuildCard({group:result.group,role:'leader',canCreate:false});
  status(result.alreadyExists?'Ton groupe de guilde existe déjà.':'Groupe officiel créé avec succès !');
 }catch(error){
  status(error.message||'Impossible de créer le groupe.');
  button.disabled=false;button.textContent='Réessayer';
 }
}

function status(msg){const el=$('mouChatStatus');if(el)el.textContent=msg||'';}
const groupStyle=document.createElement('style');groupStyle.textContent='.mou-group-sender{display:block;margin:0 0 5px;color:#d8c18a;font-size:10px;letter-spacing:.03em}.mou-chat-header .mou-chat-avatar{color:#d8c18a}';document.head.appendChild(groupStyle);
function latestFor(id){return contactsMessages.filter(m=>m.senderId===id||m.recipientId===id).sort((a,b)=>String(b.created).localeCompare(String(a.created)))[0];}
let contactsMessages=[];
function renderContacts(){
 const input=$('mouMessageSearch');const q=(input?.value||'').trim().toLocaleLowerCase('fr');
 const list=contacts.filter(c=>c.pseudo.toLocaleLowerCase('fr').includes(q));
 $('mouMessageContacts').innerHTML=list.length?list.map(c=>{
  const last=latestFor(c.id),unread=contactsMessages.filter(m=>m.senderId===c.id&&m.recipientId!==c.id&&m.mine===false&&!m.readAt).length;
  const preview=last?(last.mine?'Vous : ':'')+(mediaEnvelope(last.content)?(mediaEnvelope(last.content).type==='image'?'📷 Photo':mediaEnvelope(last.content).type==='video'?'🎬 Vidéo':'🎙 Vocal'):last.content):'Aucun message pour le moment';
  return '<button type="button" class="mou-message-contact '+(c.id===activeId?'active':'')+'" data-contact="'+esc(c.id)+'"><span class="mou-contact-avatar">'+(c.photo?'<img src="'+esc(c.photo)+'" alt="" loading="lazy">':esc(c.pseudo.slice(0,1).toUpperCase()))+'</span><span class="mou-contact-copy"><b>'+esc(c.pseudo)+'</b><small>'+esc(preview)+'</small><small class="mou-contact-presence">'+(c.online?'En ligne':'Hors ligne')+'</small></span><span class="mou-contact-meta">'+(last?'<time>'+esc(time(last.created))+'</time>':'')+(unread?'<i>'+unread+'</i>':'')+'</span></button>';
 }).join(''):'<p class="mou-message-empty" style="padding:18px">'+(contacts.length?'Aucun ami trouvé.':'Aucun ami accepté pour le moment. Va dans Profil → Mon réseau pour ajouter des joueurs et accepter les demandes.')+'</p>';
}
let lastRenderedMessagesKey='';
function renderMessages(){
 const box=$('mouChatMessages');
 if(activeId&&messages.length)saveChatCache(activeId,messages);
 // Keep native audio elements alive across unchanged polls in Android WebView.
 const renderKey=JSON.stringify([activeId,activeGroupId,messages.map(m=>[m.messageId||m.id,m.content,m.created,m.readAt||''])]);
 if(renderKey===lastRenderedMessagesKey)return;
 const audioState=[...box.querySelectorAll('audio.mou-chat-audio')].map(audio=>({
  messageId:audio.closest('[data-message-id]')?.dataset.messageId||'',
  currentTime:Number.isFinite(audio.currentTime)?audio.currentTime:0,
  paused:audio.paused,muted:audio.muted,volume:audio.volume
 }));
 const wasNearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<90;
 box.innerHTML=messages.length?messages.map(m=>{
  const name=m.senderPseudo||'Joueur',avatar=m.senderPhoto?'<img src="'+esc(m.senderPhoto)+'" alt="" loading="lazy">':esc(name.slice(0,1).toUpperCase());
  const stamp=new Date(m.created).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const raw=String(m.content||''),quote=raw.match(/^↪ ([^\n]+)\n\n/),body=quote?raw.slice(quote[0].length):raw;
  return '<article class="mou-chat-message-row '+(m.mine?'mine':'')+'"><button type="button" class="mou-chat-sender-avatar" data-public-player="'+esc(name)+'" data-player-id="'+esc(m.senderId||"")+'" aria-label="Voir le profil de '+esc(name)+'">'+avatar+'</button><div class="mou-chat-message-main"><button type="button" class="mou-chat-sender-name" data-public-player="'+esc(name)+'" data-player-id="'+esc(m.senderId||"")+'">'+esc(name)+'</button><div class="mou-chat-bubble '+(m.mine?'mine':'')+'" data-message-id="'+esc(m.messageId||m.id)+'">'+(quote?'<div class="mou-reply-quote">'+esc(quote[1])+'</div>':'')+renderMedia(body)+'<time>'+esc(stamp)+(m.mine?(activeGroupId?' · Envoyé':(m.readAt?' · Lu':' · Envoyé')):'')+'</time><div class="mou-message-actions"><button type="button" data-reply="'+esc(m.messageId||m.id)+'">↩ Répondre</button>'+(!activeGroupId?'<button type="button" data-react="'+esc(m.messageId||m.id)+'">☺ Réagir</button>':'')+'</div></div></div></article>';
 }).join(''):'<p class="mou-message-empty">C’est le début de votre conversation. Envoie le premier message !</p>';
 for(const state of audioState){
  const audio=[...box.querySelectorAll('audio.mou-chat-audio')].find(el=>el.closest('[data-message-id]')?.dataset.messageId===state.messageId);
  if(!audio)continue;
  audio.muted=state.muted;audio.volume=state.volume;
  const restore=()=>{try{audio.currentTime=state.currentTime;}catch{}if(!state.paused)audio.play().catch(()=>{});};
  if(audio.readyState>=1)restore();else audio.addEventListener('loadedmetadata',restore,{once:true});
 }
 lastRenderedMessagesKey=renderKey;
 if(wasNearBottom||!audioState.length)box.scrollTop=box.scrollHeight;
}
async function openSenderProfile(id){
 if(!id)return;
 try{
  const data=await request('players?fast=1'),player=(Array.isArray(data)?data:[]).find(x=>x.id===id);
  if(!player){status('Profil joueur indisponible.');return;}
  let modal=document.getElementById('mouSenderProfileModal');
  if(!modal){modal=document.createElement('div');modal.id='mouSenderProfileModal';modal.className='mou-sender-profile-modal';modal.innerHTML='<section><button type="button" class="close" aria-label="Fermer">×</button><div class="avatar"></div><h3 class="name"></h3><p class="uid"></p><div class="stats"></div></section>';document.body.append(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.close'))modal.hidden=true;});}
  modal.querySelector('.avatar').innerHTML=player.photo?'<img src="'+esc(player.photo)+'" alt="">':esc(String(player.pseudo||'?').slice(0,1).toUpperCase());
  modal.querySelector('.name').textContent=player.pseudo||'Joueur';
  modal.querySelector('.uid').textContent='UID Free Fire : '+(player.playerId||'Non renseigné');
  modal.querySelector('.stats').innerHTML='<span><b>'+Number(player.points||0)+'</b> Points</span><span><b>'+Number(player.wins||0)+'</b> Victoires</span><span><b>'+Number(player.losses||0)+'</b> Défaites</span>';
  modal.hidden=false;
 }catch(e){status(e.message);}
}
async function refreshInbox(){
 if(!token()){$('mouMessageContacts').innerHTML='<p class="mou-message-empty" style="padding:18px">Connecte-toi avec ton compte joueur pour ouvrir ta messagerie.</p>';return;}
 const [friendsData,messageData]=await Promise.all([request('friends'),request('messages')]);
 contacts=(friendsData.relations||[]).filter(x=>x.status==='Acceptée').map(x=>({id:x.otherId,pseudo:x.pseudo||'Joueur',photo:x.photo||'',online:!!x.online})).filter(x=>x.id);window.MOU_CONTACTS=contacts;
 contactsMessages=messageData.messages||[];
 renderContacts();
 window.dispatchEvent(new Event('mou:messages-updated'));
}
async function openChat(id,name){
 activeId=id;activeGroupId='';activeName=name;replyTo=null;lastRenderedMessagesKey='';window.MOU_CURRENT_CHAT={id,groupId:'',name};
 const subtitle=$('mouChatActive').querySelector('.mou-chat-header small');if(subtitle)subtitle.textContent='Conversation privée';
 $('mouChatEmpty').hidden=true;$('mouChatActive').hidden=false;
 $('mouChatName').textContent=name;const contact=contacts.find(c=>c.id===id);$('mouChatAvatar').innerHTML=contact?.photo?'<img src="'+esc(contact.photo)+'" alt="" loading="lazy">':esc(name.slice(0,1).toUpperCase());
 shell.classList.add('chat-open');document.body.classList.add('mou-chat-fullscreen');renderContacts();
 messages=readChatCache(id);renderMessages();status(messages.length?'':'Chargement des messages…');
 try{
  const d=await request('messages?with='+encodeURIComponent(id));if(activeId!==id)return;messages=d.messages||[];
  renderMessages();contactsMessages=contactsMessages.filter(m=>m.senderId!==id&&m.recipientId!==id).concat(messages);renderContacts();
 }catch(e){if(!messages.length)$('mouChatMessages').innerHTML='<p class="mou-message-empty">'+esc(e.message)+'</p>';}
}
async function load(){
 if(!token()){await refreshInbox().catch(()=>{});return;}
 const cached=readInboxCache();
 if(cached){contacts=cached.contacts;contactsMessages=cached.messages;window.MOU_CONTACTS=contacts;renderContacts();}
 try{
  const guildData=await refreshGuildGroup();
  // Un non-chef rejoint directement le groupe officiel lorsqu'il ouvre la messagerie.
  // Si sa guilde n'a pas encore de groupe, aucun message ni espace ne lui est affiché.
  if(guildData?.group&&guildData.role!=='leader'){
   await openGuildChat(guildData.group.guildId,guildData.group.name);
  }
 }catch(error){console.warn('Ouverture automatique du groupe de guilde:',error.message);}
 try{await refreshInbox();lastLoad=Date.now();}
 catch(e){if(!cached)$('mouMessageContacts').innerHTML='<p class="mou-message-empty" style="padding:18px">'+esc(e.message)+'</p>';else status('Synchronisation différée : '+e.message);}
}
$('mouMessageSearch').addEventListener('input',renderContacts);
$('mouMessageContacts').addEventListener('click',e=>{
 const b=e.target.closest('[data-contact]');if(!b)return;
 const c=contacts.find(x=>x.id===b.dataset.contact);if(c)openChat(c.id,c.pseudo);
});
$('mouChatBack').addEventListener('click',()=>{shell.classList.remove('chat-open');document.body.classList.remove('mou-chat-fullscreen');activeId='';activeGroupId='';replyTo=null;lastRenderedMessagesKey='';window.MOU_CURRENT_CHAT=null;const subtitle=$('mouChatActive').querySelector('.mou-chat-header small');if(subtitle)subtitle.textContent='Conversation privée';});

// Media and voice-note controls (uploads use the existing unsigned Cloudinary preset).
const mediaStyle=document.createElement('style');mediaStyle.textContent=`
.mou-chat-tools{display:flex;align-items:center;gap:7px;padding:8px 12px 0}
.mou-chat-tools button{display:grid;place-items:center;width:38px;height:36px;border:1px solid rgba(216,193,138,.25);border-radius:12px;background:rgba(216,193,138,.07);color:#e3d1a2;font-size:17px}
.mou-chat-tools button:disabled{opacity:.45}
.mou-chat-media{display:block;max-width:min(100%,260px);max-height:260px;margin-top:7px;border-radius:12px}
.mou-chat-media video,.mou-chat-media audio{max-width:100%}
.mou-chat-media audio{width:230px;height:38px}
.mou-chat-bubble .mou-media-caption{display:block;margin-top:7px}
.mou-chat-theme{display:flex;gap:6px;align-items:center}
.mou-chat-theme button{width:24px;height:24px;border-radius:50%;border:1px solid #d8c18a}
.mou-chat-theme button[aria-pressed=true]{outline:2px solid #fff;outline-offset:2px}
.mou-messages-shell[data-chat-theme=gold] .mou-chat-bubble.mine{background:linear-gradient(145deg,rgba(161,130,69,.27),rgba(216,193,138,.105))}
.mou-messages-shell[data-chat-theme=blue] .mou-chat-bubble.mine{border-color:rgba(91,165,235,.4);background:linear-gradient(145deg,rgba(42,104,163,.35),rgba(42,104,163,.12))}
.mou-messages-shell[data-chat-theme=violet] .mou-chat-bubble.mine{border-color:rgba(174,124,225,.4);background:linear-gradient(145deg,rgba(111,65,153,.35),rgba(111,65,153,.12))}
`;document.head.appendChild(mediaStyle);
const chatForm=$('mouChatForm');
const toolsBar=document.createElement('div');toolsBar.className='mou-chat-tools';
toolsBar.innerHTML='<button type="button" id="mouChatAttach" aria-label="Joindre une photo ou vidéo" title="Photo / vidéo">＋</button><span id="mouChatMediaStatus" class="mou-chat-status" aria-live="polite"></span><input id="mouChatMediaInput" type="file" accept="image/*,video/*" hidden>';
chatForm.parentElement.insertBefore(toolsBar,chatForm);
const mediaInput=$('mouChatMediaInput'),mediaStatus=$('mouChatMediaStatus');
const voiceButton=document.createElement('button');voiceButton.type='button';voiceButton.id='mouChatVoice';voiceButton.textContent='🎙';voiceButton.title='Enregistrer un message vocal';voiceButton.setAttribute('aria-label','Enregistrer un message vocal');toolsBar.insertBefore(voiceButton,mediaStatus);
let voiceRecorder=null,voiceStream=null,voiceChunks=[],voiceTarget=null,voiceLimit=null;
function stopVoiceRecording(){if(voiceRecorder&&voiceRecorder.state!=='inactive')voiceRecorder.stop();clearTimeout(voiceLimit);voiceLimit=null;}
voiceButton.addEventListener('click',async()=>{
 if(voiceRecorder&&voiceRecorder.state==='recording'){stopVoiceRecording();return;}
 if(!activeId&&!activeGroupId){mediaStatus.textContent='Ouvre une conversation avant d’enregistrer un vocal.';return;}
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){mediaStatus.textContent='L’enregistrement vocal n’est pas pris en charge sur cet appareil.';return;}
 voiceButton.disabled=true;
 try{
  voiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  voiceTarget={id:activeId,groupId:activeGroupId};
  const types=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'];
  const mimeType=types.find(type=>MediaRecorder.isTypeSupported?.(type))||'';
  voiceRecorder=new MediaRecorder(voiceStream,mimeType?{mimeType}:undefined);voiceChunks=[];
  voiceRecorder.ondataavailable=event=>{if(event.data?.size)voiceChunks.push(event.data);};
  voiceRecorder.onerror=()=>{mediaStatus.textContent='Erreur pendant l’enregistrement vocal.';};
  voiceRecorder.onstop=()=>{
   const blob=new Blob(voiceChunks,{type:voiceRecorder?.mimeType||'audio/webm'});
   voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;
   voiceButton.textContent='🎙';voiceButton.disabled=false;voiceButton.title='Enregistrer un message vocal';
   if(!blob.size){mediaStatus.textContent='Aucun son enregistré. Réessaie.';return;}
   const ext=blob.type.includes('ogg')?'ogg':blob.type.includes('mp4')?'m4a':'webm';
   uploadChatMedia(new File([blob],'message-vocal.'+ext,{type:blob.type||'audio/webm'}),'audio',voiceTarget);
   voiceRecorder=null;voiceChunks=[];voiceTarget=null;
  };
  voiceRecorder.start(250);voiceButton.textContent='■';voiceButton.title='Arrêter et envoyer';mediaStatus.textContent='Enregistrement vocal… Appuie sur ■ pour envoyer.';
  voiceLimit=setTimeout(stopVoiceRecording,60000);
 }catch(error){
  voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;voiceRecorder=null;voiceButton.disabled=false;
  mediaStatus.textContent=error.name==='NotAllowedError'?'Autorise le micro dans les paramètres Android ou du navigateur.':error.name==='NotFoundError'?'Aucun microphone détecté.':'Impossible de démarrer le vocal : '+error.message;
 }
});
function mediaEnvelope(content){try{if(content.startsWith('[[MOU_MEDIA]]'))return JSON.parse(content.slice(13));}catch{}return null;}
function renderMedia(content){
 const item=mediaEnvelope(content);if(!item)return esc(content).replace(/\n/g,'<br>');
 const media=item.type==='image'?'<img class="mou-chat-media" src="'+esc(item.url)+'" alt="Photo envoyée" loading="lazy">':item.type==='video'?'<video class="mou-chat-media" src="'+esc(item.url)+'" controls playsinline preload="metadata"></video>':'<audio class="mou-chat-media mou-chat-audio" src="'+esc(item.url)+'" controls playsinline preload="none" controlslist="nodownload noplaybackrate"></audio>';
 return media+(item.caption?'<span class="mou-media-caption">'+esc(item.caption)+'</span>':'');
}
async function uploadChatMedia(file,kind,destination){
 if(!file)return;
 const max=kind==='video'||kind==='audio'?15*1024*1024:8*1024*1024;
 if(file.size>max){mediaStatus.textContent='Fichier trop volumineux (limite '+(max/1024/1024)+' Mo).';return;}
 const targetId=destination?.id??activeId,targetGroup=destination?.groupId??activeGroupId;
 if(!targetId&&!targetGroup){mediaStatus.textContent='Ouvre une conversation avant d’envoyer un fichier.';return;}
 mediaStatus.textContent='Envoi du média…';
 try{
  const resource=kind==='image'?'image':'video';
  const form=new FormData();form.append('file',file);form.append('upload_preset','malawy_photos');form.append('folder','malawy-messenger');
  const response=await fetch('https://api.cloudinary.com/v1_1/owc0mtlg/'+resource+'/upload',{method:'POST',body:form});
  const data=await response.json();if(!response.ok||!data.secure_url)throw new Error(data.error?.message||'Échec du téléversement.');
  const payload='[[MOU_MEDIA]]'+JSON.stringify({type:kind,url:data.secure_url,name:file.name||'',caption:''});
  if(targetGroup)await request('messages',{method:'POST',body:JSON.stringify({action:'sendGroup',groupId:targetGroup,content:payload})});
  else await request('messages',{method:'POST',body:JSON.stringify({action:'send',targetId,content:payload})});
  const d=await request(targetGroup?'messages?group='+encodeURIComponent(targetGroup):'messages?with='+encodeURIComponent(targetId));
  if((targetGroup&&activeGroupId===targetGroup)||(!targetGroup&&activeId===targetId)){messages=d.messages||[];renderMessages();}
  mediaStatus.textContent=kind==='audio'?'Message vocal envoyé.':'Média envoyé.';
 }catch(error){mediaStatus.textContent=error.message;}
}
$('mouChatAttach').addEventListener('click',()=>mediaInput.click());
mediaInput.addEventListener('change',()=>{const file=mediaInput.files?.[0];if(file)uploadChatMedia(file,file.type.startsWith('image/')?'image':'video');mediaInput.value='';});
const savedTheme=localStorage.getItem('mou_chat_theme')||'gold';shell.dataset.chatTheme=savedTheme;
const themeBar=document.createElement('div');themeBar.className='mou-chat-tools mou-chat-theme';themeBar.setAttribute('aria-label','Thème de discussion');
themeBar.innerHTML='<span>Thème</span><button type="button" data-theme="gold" aria-label="Or"></button><button type="button" data-theme="blue" aria-label="Bleu"></button><button type="button" data-theme="violet" aria-label="Violet"></button>';
themeBar.querySelectorAll('[data-theme]').forEach(btn=>{btn.style.background=({gold:'#d8c18a',blue:'#5ba5eb',violet:'#ae7ce1'})[btn.dataset.theme];btn.setAttribute('aria-pressed',String(btn.dataset.theme===savedTheme));btn.addEventListener('click',()=>{shell.dataset.chatTheme=btn.dataset.theme;localStorage.setItem('mou_chat_theme',btn.dataset.theme);themeBar.querySelectorAll('[data-theme]').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));});});
chatForm.parentElement.insertBefore(themeBar,chatForm);

const replyPreview=document.createElement('div');replyPreview.className='mou-reply-preview';replyPreview.hidden=true;chatForm.parentElement.insertBefore(replyPreview,toolsBar);
$('mouChatMessages').addEventListener('click',async e=>{
 const profile=e.target.closest('[data-player-id]');if(profile){e.preventDefault();e.stopPropagation();openSenderProfile(profile.dataset.playerId);return;}
 const reply=e.target.closest('[data-reply]');if(reply){const m=messages.find(x=>(x.messageId||x.id)===reply.dataset.reply);if(!m)return;const content=String(m.content||'').replace(/^↪ [^\\n]+\\n\\n/,'');replyTo={name:m.senderPseudo||'Joueur',content:content.slice(0,140)};replyPreview.textContent='Réponse à '+replyTo.name+' : '+replyTo.content;replyPreview.hidden=false;$('mouChatInput').focus();return;}
 const audio=e.target.closest('audio.mou-chat-audio');if(audio){e.stopPropagation();return;}
  const react=e.target.closest('[data-react]');if(react){let picker=react.parentElement.querySelector('.mou-reaction-picker');if(picker){picker.remove();return;}picker=document.createElement('span');picker.className='mou-reaction-picker';picker.innerHTML=['❤️','😂','👍','😮','😢','🔥'].map(emoji=>'<button type=\"button\" data-emoji=\"'+emoji+'\" data-message=\"'+esc(react.dataset.react)+'\">'+emoji+'</button>').join('');react.parentElement.append(picker);return;}
 const choice=e.target.closest('[data-emoji]');if(choice){try{const result=await request('message-actions',{method:'POST',body:JSON.stringify({messageId:choice.dataset.message,emoji:choice.dataset.emoji})});choice.parentElement.innerHTML=result.removed?'':'<b>'+choice.dataset.emoji+'</b>'; }catch(error){status(error.message);}return;}
});
$('mouChatForm').addEventListener('submit',async e=>{
 e.preventDefault();const input=$('mouChatInput'),content=input.value.trim();if(!content||(!activeId&&!activeGroupId))return;
 const button=$('mouChatForm').querySelector('button'),targetId=activeId,targetGroup=activeGroupId;const outgoing=replyTo?'↪ '+replyTo.name+' : '+replyTo.content+'\n\n'+content:content;replyTo=null;replyPreview.hidden=true;
 const optimistic={id:'local_'+Date.now()+'_'+Math.random().toString(36).slice(2),senderId:'me',senderPseudo:'Moi',recipientId:targetId||('group:'+targetGroup),content:outgoing,created:new Date().toISOString(),mine:true,pending:true};
 messages.push(optimistic);input.value='';renderMessages();status('');button.disabled=false;
 
 try{
  const result=targetGroup
   ?await request('messages',{method:'POST',body:JSON.stringify({action:'sendGroup',groupId:targetGroup,content:outgoing})})
   :await request('messages',{method:'POST',body:JSON.stringify({action:'send',targetId:targetId,content:outgoing})});
  const saved=result.message||null;
  if(saved){const index=messages.findIndex(x=>x.id===optimistic.id);if(index>=0)messages[index]=saved;}
  renderMessages();status('');
  
 }catch(err){
  messages=messages.filter(x=>x.id!==optimistic.id);renderMessages();status(err.message);input.value=content;
 }finally{input.focus();}
});
async function pollInbox(){
 if(!page().classList.contains('active')||document.hidden||!token())return;
 try{
  await refreshInbox();
  if(shell.classList.contains('chat-open')&&(activeId||activeGroupId)){
   const d=await request(activeGroupId?'messages?group='+encodeURIComponent(activeGroupId):'messages?with='+encodeURIComponent(activeId));messages=d.messages||[];renderMessages();
  }
 }catch(e){status(e.message);}
}
function startPolling(){
 if(poll)clearInterval(poll);
 poll=setInterval(pollInbox,15000);
}
let wasActive=false;
const observePage=()=>{
 const active=page().classList.contains('active');
 if(active&&!wasActive)load();
 if(!active&&wasActive){activeId='';activeGroupId='';window.MOU_CURRENT_CHAT=null;shell.classList.remove('chat-open');}
 wasActive=active;
};
new MutationObserver(observePage).observe(page(),{attributes:true,attributeFilter:['class']});
observePage();startPolling();
window.addEventListener('mou:player-auth',()=>{if(page().classList.contains('active'))load();else refreshGuildGroup();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&page().classList.contains('active'))pollInbox();});
// Le contrôle de guilde est lancé après le chargement léger de la boîte de réception.
})();