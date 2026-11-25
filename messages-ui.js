(function(){
'use strict';
const API='https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/';
const $=id=>document.getElementById(id);
const shell=$('messages')?.querySelector('.mou-messages-shell');
if(!shell||shell.dataset.mouReady==='1')return;
shell.dataset.mouReady='1';
let contacts=[],activeId='',activeName='',activeGroupId='',messages=[],poll=null,lastLoad=0;\nconst cacheKey=id=>'mou_chat_cache_v1:'+id;\nfunction saveChatCache(id,items){try{localStorage.setItem(cacheKey(id),JSON.stringify(items.slice(-150)));}catch(e){}}\nfunction readChatCache(id){try{const v=JSON.parse(localStorage.getItem(cacheKey(id))||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
const token=()=>localStorage.getItem('mou_player_token')||'';
const page=()=>document.getElementById('messages');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=s=>{if(!s)return '';const d=new Date(s);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});};
async function request(path,options={}){
 const t=token();if(!t)throw Error('Connecte-toi avec ton compte joueur pour utiliser les messages.');
 const headers={Authorization:'Bearer '+t,...(options.headers||{})};
 if(options.body)headers['Content-Type']='application/json';
 const r=await fetch(API+path,{...options,headers,cache:'no-store'});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.error||'Erreur '+r.status);
 return d;
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
  title.textContent=data.group.name||'Groupe de guilde';
  desc.textContent=data.role==='leader'?'Ton groupe officiel est prêt. Tu es le Chef et tu peux gérer les officiers.':data.role==='officer'?'Groupe officiel de ta guilde · Tu es officier.':'Groupe officiel de ta guilde. Discute avec les membres.';
  button.hidden=false;button.disabled=false;button.textContent='Ouvrir le groupe';button.onclick=()=>openGuildChat(data.group.guildId,data.group.name);
 }else{
  const name=data.guild?.name||'ta guilde';
  title.textContent='Crée le groupe de '+name;
  desc.textContent='L’API Free Fire confirme que tu es le Chef. Le nom officiel de ta guilde sera utilisé automatiquement.';
  button.hidden=false;button.textContent='Créer le groupe';button.disabled=false;
  button.onclick=createGuildGroup;
 }
}
async function openGuildChat(guildId,name){
 activeId='';activeGroupId=String(guildId||'');activeName=name||'Groupe de guilde';
 $('mouChatEmpty').hidden=true;$('mouChatActive').hidden=false;
 $('mouChatName').textContent=activeName;$('mouChatAvatar').textContent='✦';
 const subtitle=$('mouChatActive').querySelector('.mou-chat-header small');if(subtitle)subtitle.textContent='Discussion de guilde · Membres officiels';
 shell.classList.add('chat-open');renderContacts();status('');
 $('mouChatMessages').innerHTML='<p class="mou-message-empty">Chargement du groupe…</p>';
 try{const d=await request('messages?group='+encodeURIComponent(activeGroupId));messages=d.messages||[];renderMessages();}
 catch(e){$('mouChatMessages').innerHTML='<p class="mou-message-empty">'+esc(e.message)+'</p>';}
}
async function refreshGuildGroup(){
 if(!token())return;
 if(guildCardTask)return guildCardTask;
 guildCardTask=request('guild-groups').then(renderGuildCard).catch(error=>{
  console.warn('Groupe de guilde:',error.message);
  renderGuildCard(null);
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
  const preview=last?(last.mine?'Vous : ':'')+last.content:'Aucun message pour le moment';
  return '<button type="button" class="mou-message-contact '+(c.id===activeId?'active':'')+'" data-contact="'+esc(c.id)+'"><span class="mou-contact-avatar">'+esc(c.pseudo.slice(0,1).toUpperCase())+'</span><span class="mou-contact-copy"><b>'+esc(c.pseudo)+'</b><small>'+esc(preview)+'</small></span><span class="mou-contact-meta">'+(last?'<time>'+esc(time(last.created))+'</time>':'')+(unread?'<i>'+unread+'</i>':'')+'</span></button>';
 }).join(''):'<p class="mou-message-empty" style="padding:18px">'+(contacts.length?'Aucun ami trouvé.':'Aucun ami accepté pour le moment. Va dans Profil → Mon réseau pour ajouter des joueurs et accepter les demandes.')+'</p>';
}
function renderMessages(){
 const box=$('mouChatMessages');
 box.innerHTML=messages.length?messages.map(m=>'<div class="mou-chat-bubble '+(m.mine?'mine':'')+'">'+(activeGroupId?'<b class="mou-group-sender">'+esc(m.senderPseudo||'Joueur')+'</b>':'')+esc(m.content).replace(/\n/g,'<br>')+'<time>'+esc(new Date(m.created).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))+(m.mine?(activeGroupId?' · Envoyé':(m.readAt?' · Lu':' · Envoyé')):'')+'</time></div>').join(''):'<p class="mou-message-empty">C’est le début de votre conversation. Envoie le premier message !</p>';
 box.scrollTop=box.scrollHeight;
}
async function refreshInbox(){
 if(!token()){$('mouMessageContacts').innerHTML='<p class="mou-message-empty" style="padding:18px">Connecte-toi avec ton compte joueur pour ouvrir ta messagerie.</p>';return;}
 const [friendsData,messageData]=await Promise.all([request('friends'),request('messages')]);
 contacts=(friendsData.relations||[]).filter(x=>x.status==='Acceptée').map(x=>({id:x.otherId,pseudo:x.pseudo||'Joueur',photo:x.photo||'',online:!!x.online})).filter(x=>x.id);
 contactsMessages=messageData.messages||[];
 renderContacts();
 window.dispatchEvent(new Event('mou:messages-updated'));
}
async function openChat(id,name){
 activeId=id;activeGroupId='';activeName=name;
 const subtitle=$('mouChatActive').querySelector('.mou-chat-header small');if(subtitle)subtitle.textContent='Conversation privée';
 $('mouChatEmpty').hidden=true;$('mouChatActive').hidden=false;
 $('mouChatName').textContent=name;$('mouChatAvatar').textContent=name.slice(0,1).toUpperCase();
 shell.classList.add('chat-open');renderContacts();
 messages=readChatCache(id);renderMessages();status('');
 try{
  const d=await request('messages?with='+encodeURIComponent(id));if(activeId!==id)return;messages=d.messages||[];
  renderMessages();await refreshInbox();
 }catch(e){if(!messages.length)$('mouChatMessages').innerHTML='<p class="mou-message-empty">'+esc(e.message)+'</p>';}
}
async function load(){
 if(!token()){await refreshInbox().catch(()=>{});return;}
 try{await Promise.all([refreshInbox(),refreshGuildGroup()]);lastLoad=Date.now();}
 catch(e){$('mouMessageContacts').innerHTML='<p class="mou-message-empty" style="padding:18px">'+esc(e.message)+'</p>';}
}
$('mouMessageSearch').addEventListener('input',renderContacts);
$('mouMessageContacts').addEventListener('click',e=>{
 const b=e.target.closest('[data-contact]');if(!b)return;
 const c=contacts.find(x=>x.id===b.dataset.contact);if(c)openChat(c.id,c.pseudo);
});
$('mouChatBack').addEventListener('click',()=>{shell.classList.remove('chat-open');activeId='';activeGroupId='';const subtitle=$('mouChatActive').querySelector('.mou-chat-header small');if(subtitle)subtitle.textContent='Conversation privée';});
$('mouChatForm').addEventListener('submit',async e=>{
 e.preventDefault();const input=$('mouChatInput'),content=input.value.trim();if(!content||(!activeId&&!activeGroupId))return;
 const button=$('mouChatForm').querySelector('button'),targetId=activeId,targetGroup=activeGroupId;
 const optimistic={id:'local_'+Date.now()+'_'+Math.random().toString(36).slice(2),senderId:'me',senderPseudo:'Moi',recipientId:targetId||('group:'+targetGroup),content,created:new Date().toISOString(),mine:true,pending:true};
 messages.push(optimistic);input.value='';renderMessages();status('');button.disabled=false;
 if(!targetGroup)refreshInbox().catch(()=>{});
 try{
  const result=targetGroup
   ?await request('messages',{method:'POST',body:JSON.stringify({action:'sendGroup',groupId:targetGroup,content})})
   :await request('messages',{method:'POST',body:JSON.stringify({action:'send',targetId:targetId,content})});
  const saved=result.message||null;
  if(saved){const index=messages.findIndex(x=>x.id===optimistic.id);if(index>=0)messages[index]=saved;}
  renderMessages();status('');
  if(!targetGroup)refreshInbox().catch(()=>{});
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
 poll=setInterval(pollInbox,5000);
}
let wasActive=false;
const observePage=()=>{
 const active=page().classList.contains('active');
 if(active&&!wasActive)load();
 if(!active&&wasActive){activeId='';activeGroupId='';shell.classList.remove('chat-open');}
 wasActive=active;
};
new MutationObserver(observePage).observe(page(),{attributes:true,attributeFilter:['class']});
observePage();startPolling();
window.addEventListener('mou:player-auth',()=>{if(page().classList.contains('active'))load();else refreshGuildGroup();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&page().classList.contains('active'))pollInbox();});
refreshGuildGroup();
})();