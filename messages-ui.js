(function(){
'use strict';
const API='https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/';
const $=id=>document.getElementById(id);
const shell=$('messages')?.querySelector('.mou-messages-shell');
if(!shell)return;
let contacts=[],activeId='',activeName='',messages=[];
const token=()=>localStorage.getItem('mou_player_token')||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function request(path,options={}){const t=token();if(!t)throw Error('Connecte-toi avec ton compte joueur pour utiliser les messages.');const headers={Authorization:'Bearer '+t,...(options.headers||{})};if(options.body)headers['Content-Type']='application/json';const r=await fetch(API+path,{...options,headers,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur '+r.status);return d;}
function status(msg){$('mouChatStatus').textContent=msg||'';}
function renderContacts(){const q=$('mouMessageSearch').value.trim().toLocaleLowerCase('fr');const list=contacts.filter(c=>c.pseudo.toLocaleLowerCase('fr').includes(q));$('mouMessageContacts').innerHTML=list.length?list.map(c=>'<button type="button" class="mou-message-contact '+(c.id===activeId?'active':'')+'" data-contact="'+esc(c.id)+'"><span class="mou-contact-avatar">'+esc(c.pseudo.slice(0,1).toUpperCase())+'</span><span style="min-width:0"><b>'+esc(c.pseudo)+'</b><small> Ami · Conversation privée</small></span></button>').join(''):'<p class="mou-message-empty" style="padding:18px">'+(contacts.length?'Aucun ami trouvé.':'Aucun ami accepté pour le moment. Va dans Profil → Mes amis pour rechercher des joueurs, envoyer des demandes et accepter celles que tu reçois.')+'</p>';}
function renderMessages(){const box=$('mouChatMessages');box.innerHTML=messages.length?messages.map(m=>'<div class="mou-chat-bubble '+(m.mine?'mine':'')+'">'+esc(m.content).replace(/\n/g,'<br>')+'<time>'+esc(new Date(m.created).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))+'</time></div>').join(''):'<p class="mou-message-empty">C’est le début de votre conversation. Envoie le premier message !</p>';box.scrollTop=box.scrollHeight;}
async function openChat(id,name){activeId=id;activeName=name;$('mouChatEmpty').hidden=true;$('mouChatActive').hidden=false;$('mouChatName').textContent=name;$('mouChatAvatar').textContent=name.slice(0,1).toUpperCase();shell.classList.add('chat-open');renderContacts();$('mouChatMessages').innerHTML='<p class="mou-message-empty">Chargement des messages…</p>';status('');try{const d=await request('messages?with='+encodeURIComponent(id));messages=d.messages||[];renderMessages();}catch(e){$('mouChatMessages').innerHTML='<p class="mou-message-empty">'+esc(e.message)+'</p>';}}
async function load(){if(!token()){$('mouMessageContacts').innerHTML='<p class="mou-message-empty" style="padding:18px">Connecte-toi avec ton compte joueur pour ouvrir ta messagerie.</p>';return;}try{const d=await request('friends');contacts=(d.relations||[]).filter(x=>x.status==='Acceptée').map(x=>({id:x.otherId,pseudo:x.pseudo||'Joueur'})).filter(x=>x.id);renderContacts();}catch(e){$('mouMessageContacts').innerHTML='<p class="mou-message-empty" style="padding:18px">'+esc(e.message)+'</p>';}}
$('mouMessageSearch').addEventListener('input',renderContacts);
$('mouMessageContacts').addEventListener('click',e=>{const b=e.target.closest('[data-contact]');if(!b)return;const c=contacts.find(x=>x.id===b.dataset.contact);if(c)openChat(c.id,c.pseudo);});
$('mouChatBack').addEventListener('click',()=>{shell.classList.remove('chat-open');});
$('mouChatForm').addEventListener('submit',async e=>{e.preventDefault();const input=$('mouChatInput'),content=input.value.trim();if(!content||!activeId)return;const send=e.submitter;$('mouChatForm').querySelector('button').disabled=true;status('Envoi…');try{await request('messages',{method:'POST',body:JSON.stringify({action:'send',targetId:activeId,content})});input.value='';const d=await request('messages?with='+encodeURIComponent(activeId));messages=d.messages||[];renderMessages();status('Envoyé');}catch(err){status(err.message);}finally{$('mouChatForm').querySelector('button').disabled=false;input.focus();}});
// navigation-fix.js intercepts tab clicks during capture; watch the actual page state instead.
let wasActive=false;
const page=document.getElementById('messages');
const observePage=()=>{
 const active=page.classList.contains('active');
 if(active&&!wasActive)load();
 wasActive=active;
};
new MutationObserver(observePage).observe(page,{attributes:true,attributeFilter:['class']});
observePage();
window.addEventListener('mou:player-auth',()=>{if(page.classList.contains('active'))load();});
})();
