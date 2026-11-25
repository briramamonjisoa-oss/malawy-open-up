(() => {
 'use strict';
 const API='https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/guild-groups';
 const token=()=>localStorage.getItem('mou_player_token')||'';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let mounted=false,busy=false,lastData=null;
 const $=(s,r=document)=>r.querySelector(s);
 async function request(method='GET',body=null,refresh=false){
  const url=API+(refresh?'?action=refresh':'');
  const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Erreur de gestion de guilde.');
  return data;
 }
 function mount(){
  const grid=$('#mouProfileHub .mou-profile-grid');
  if(!grid||mounted)return;
  mounted=true;
  // La tuile « Ma guilde » est créée dans le profil ; ce module lui ajoute son comportement.
  const style=document.createElement('style');style.id='mouGuildManagementStyles';
  style.textContent=`
   #mouGuildModal{position:fixed;inset:0;z-index:12500;display:flex;align-items:stretch;justify-content:center;padding:calc(10px + env(safe-area-inset-top)) 10px calc(10px + env(safe-area-inset-bottom));background:rgba(0,0,0,.88);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
   #mouGuildModal[hidden]{display:none!important}
   #mouGuildModal .mou-guild-card{width:min(100%,620px);max-height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(216,193,138,.34);border-radius:23px;background:linear-gradient(155deg,#191713,#070809);color:#f4efe5;box-shadow:0 24px 80px #000}
   #mouGuildModal header{display:flex;align-items:center;gap:12px;padding:15px;border-bottom:1px solid rgba(255,255,255,.09)}
   #mouGuildModal header>div{flex:1;min-width:0}
   #mouGuildModal header small{color:#d8c18a;font-size:9px;letter-spacing:.2em;font-weight:800}
   #mouGuildModal header h2{margin:3px 0 0;font-size:20px}
   #mouGuildModal header button{width:40px;height:40px;border:1px solid rgba(216,193,138,.3);border-radius:12px;background:#171613;color:#e5ce95;font-size:24px}
   #mouGuildContent{min-height:0;overflow:auto;overscroll-behavior:contain;padding:15px}
   #mouGuildContent .guild-hero{padding:17px;border:1px solid rgba(216,193,138,.25);border-radius:17px;background:radial-gradient(circle at 100% 0,rgba(216,193,138,.14),transparent 60%),#0c0c0d}
   #mouGuildContent .guild-kicker{color:#d8c18a;font-size:9px;font-weight:800;letter-spacing:.18em}
   #mouGuildContent .guild-hero h3{margin:7px 0;font-size:23px;overflow-wrap:anywhere}
   #mouGuildContent .guild-muted{color:#a9a397;font-size:12px;line-height:1.5}
   #mouGuildContent .guild-role{display:inline-block;margin-top:7px;padding:5px 9px;border:1px solid rgba(216,193,138,.3);border-radius:20px;color:#e4ce97;font-size:10px;font-weight:800}
   #mouGuildContent .guild-action{width:100%;margin-top:12px;padding:12px;border:1px solid rgba(216,193,138,.3);border-radius:12px;background:linear-gradient(110deg,#e2ca91,#c5a86a);color:#100e09;font-weight:800}
   #mouGuildContent .guild-action:disabled{opacity:.55}
   #mouGuildContent .guild-section{margin-top:18px}
   #mouGuildContent .guild-section h3{margin:0 0 10px;font-size:14px;letter-spacing:.08em;color:#ddc994}
   #mouGuildContent .guild-member{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.07)}
   #mouGuildContent .guild-avatar{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border:1px solid rgba(216,193,138,.25);border-radius:50%;background:#171613;color:#e3cc94;font-weight:900}
   #mouGuildContent .guild-member-main{flex:1;min-width:0}
   #mouGuildContent .guild-member-main b{display:block;font-size:12px;overflow-wrap:anywhere}
   #mouGuildContent .guild-member-main small{display:block;color:#999184;font-size:10px;margin-top:3px}
   #mouGuildContent .guild-member-role{color:#d8c18a;font-size:9px;font-weight:800}
   #mouGuildContent .guild-member button{padding:8px 9px;border:1px solid rgba(216,193,138,.25);border-radius:9px;background:#15130f;color:#e2cb95;font-size:10px;font-weight:700}
   #mouGuildContent .guild-member button.remove{border-color:rgba(225,110,110,.3);color:#f1a6a6}
   #mouGuildContent .guild-feedback{padding:11px;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#aaa397;font-size:12px;text-align:center}
   #mouGuildContent .guild-error{color:#ffb1a8;border-color:rgba(255,120,100,.3)}
   #mouGuildContent .guild-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:12px}
   #mouGuildContent .guild-toolbar button{padding:8px 10px;border:1px solid rgba(216,193,138,.24);border-radius:10px;background:transparent;color:#e1ca94;font-size:10px}
   #mouGuildContent .guild-photo-row{display:flex;align-items:center;gap:13px;margin-bottom:12px}
   #mouGuildContent .guild-photo{width:76px;height:76px;flex:0 0 76px;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(216,193,138,.4);border-radius:20px;background:#171613;color:#e5ce96;font-size:28px}
   #mouGuildContent .guild-photo img{width:100%;height:100%;object-fit:cover}
   #mouGuildContent .guild-photo-tools{display:grid;gap:6px;min-width:0}
   #mouGuildContent .guild-photo-tools b{font-size:12px}
   #mouGuildContent .guild-photo-tools small{color:#a9a397;font-size:10px}
   #mouGuildContent .guild-photo-tools label{display:inline-flex;width:max-content;max-width:100%;padding:8px 10px;border:1px solid rgba(216,193,138,.3);border-radius:10px;color:#e5ce96;font-size:10px;font-weight:800;cursor:pointer}
   #mouGuildContent .guild-photo-tools input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
   #mouGuildContent .guild-welcome{margin-bottom:14px;padding:13px;border:1px solid rgba(216,193,138,.4);border-radius:15px;background:rgba(216,193,138,.08)}
   #mouGuildContent .guild-welcome b{display:block;color:#e5ce96;font-size:13px;margin-bottom:5px}
   #mouGuildContent .guild-welcome p{margin:0;color:#c1b9aa;font-size:11px;line-height:1.5}
  `;
  document.head.append(style);
  const modal=document.createElement('div');modal.id='mouGuildModal';modal.hidden=true;
  modal.innerHTML='<section class="mou-guild-card" role="dialog" aria-modal="true" aria-labelledby="mouGuildTitle"><header><button type="button" data-guild-close aria-label="Retour">‹</button><div><small>MALAWY OPEN UP · ESPACE OFFICIEL</small><h2 id="mouGuildTitle">Gestion de ma guilde</h2></div><button type="button" data-guild-close aria-label="Fermer">×</button></header><div id="mouGuildContent"></div></section>';
  document.body.append(modal);
  grid.addEventListener('click',e=>{if(e.target.closest('[data-guild-management-open]'))open();});
  modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-guild-close]'))close();const action=e.target.closest('[data-guild-action]');if(action)manage(action.dataset.guildAction,action.dataset.playerId);});
  modal.addEventListener('change',e=>{if(e.target.id==='mouGuildPhotoFile'&&e.target.files?.[0])saveGuildPhoto(e.target.files[0],e.target);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
 }
 function open(){const modal=$('#mouGuildModal');if(!modal)return;modal.hidden=false;document.body.style.overflow='hidden';load();}
 let welcomePending=false;
 window.addEventListener('mou:guild-welcome',()=>{welcomePending=true;setTimeout(()=>{mount();if($('#mouGuildModal'))open();},180);});

 function close(){const modal=$('#mouGuildModal');if(!modal)return;modal.hidden=true;document.body.style.overflow='';}
 function roleName(role){return role==='leader'?'Chef de guilde':role==='officer'?'Officier':'Membre';}
 function render(data){
  lastData=data;const root=$('#mouGuildContent');if(!root)return;
  if(!data.group){
   const guild=data.guild||{};
   root.innerHTML='<div class="guild-hero"><span class="guild-kicker">GUILDE FREE FIRE DÉTECTÉE</span><h3>'+esc(guild.name||'Ma guilde')+'</h3><p class="guild-muted">UID de guilde : '+esc(guild.id||'—')+' · Niveau '+esc(guild.level||'—')+'</p><span class="guild-role">'+(data.role==='leader'?'Chef de guilde':'Membre de la guilde')+'</span></div>'+
    (data.canCreate?'<p class="guild-muted">Tu es reconnu comme chef officiel par Free Fire. Active l’espace MALAWY pour gérer les membres et désigner tes officiers.</p><button class="guild-action" data-guild-action="create">Créer l’espace officiel de ma guilde</button>':'<p class="guild-feedback">L’espace MALAWY de cette guilde n’a pas encore été activé. Seul le chef Free Fire peut le créer.</p><p class="guild-muted">Chef Free Fire : '+esc(guild.leaderPseudo||'Non renseigné')+' · UID '+esc(guild.leaderUid||'—')+'</p>');
   return;
  }
  const g=data.group,members=Array.isArray(data.members)?data.members:[],officers=(g.officers||[]).length;
  const photoBlock='<div class="guild-photo-row"><div class="guild-photo">'+(g.photo?'<img src="'+esc(g.photo)+'" alt="Photo de '+esc(g.name)+'">':'✦')+'</div><div class="guild-photo-tools"><b>Photo officielle du groupe</b><small>'+(data.role==='leader'?'Personnalise l’image de ta communauté':'Photo choisie par le chef de guilde')+'</small>'+(data.role==='leader'?'<label>Changer la photo<input id="mouGuildPhotoFile" type="file" accept="image/*"></label>':'')+'</div></div>';
  const welcomeBlock=data.welcomeCreated?'<div class="guild-welcome"><b>Bienvenue, chef ! 👑</b><p>Ton groupe '+esc(g.name)+' est déjà créé dans MALAWY OPEN UP. Le nom et les informations de ta guilde sont préremplis. Tu peux maintenant choisir sa photo et accueillir tes membres.</p></div>':'';
  root.innerHTML=welcomeBlock+photoBlock+'<div class="guild-hero"><span class="guild-kicker">GUILDE OFFICIELLE MALAWY</span><h3>'+esc(g.name||data.guild?.name||'Ma guilde')+'</h3><p class="guild-muted">UID '+esc(g.guildId)+' · Niveau '+esc(g.level||data.guild?.level||'—')+' · Région '+esc(g.region||'—')+'</p><span class="guild-role">'+roleName(data.role)+'</span><p class="guild-muted">Chef : '+esc(g.leaderPseudo||data.guild?.leaderPseudo||'—')+' · '+members.length+' membre(s) MALAWY · '+officers+'/4 officiers</p></div>'+
   '<div class="guild-toolbar"><span class="guild-muted">Membres de la guilde</span><button type="button" data-guild-action="refresh">Actualiser</button></div>'+
   '<div class="guild-section"><h3>ÉQUIPE DE GUILDE</h3>'+ (members.length?members.map(m=>'<div class="guild-member"><span class="guild-avatar">'+esc((m.pseudo||'?').slice(0,1).toUpperCase())+'</span><div class="guild-member-main"><b>'+esc(m.pseudo)+'</b><small>UID '+esc(m.uid)+'</small><span class="guild-member-role">'+roleName(m.role)+'</span></div>'+
   (data.role==='leader'&&m.role!=='leader'?(m.role==='officer'?'<button class="remove" data-guild-action="removeOfficer" data-player-id="'+esc(m.playerRecordId)+'">Retirer</button>':officers<4?'<button data-guild-action="appointOfficer" data-player-id="'+esc(m.playerRecordId)+'">Nommer officier</button>':''):'')+'</div>').join(''):'<p class="guild-feedback">Aucun membre MALAWY de cette guilde n’a encore été trouvé. Les profils Free Fire doivent être synchronisés.</p>')+'</div>'+
   (data.role==='leader'?'<p class="guild-muted">Tu es le chef vérifié par Free Fire. Tu peux désigner quatre officiers au maximum.</p>':'<p class="guild-muted">Seul le chef officiel Free Fire peut modifier les rôles de cette guilde.</p>');
 }
 async function load(refresh=false){
  if(busy)return;busy=true;const root=$('#mouGuildContent');if(root)root.innerHTML='<p class="guild-feedback">Chargement de ta guilde et vérification des rôles…</p>';
  try{const data=await request('GET',null,refresh);if(welcomePending){data.welcomeCreated=true;welcomePending=false;}render(data);}catch(error){if(root)root.innerHTML='<p class="guild-feedback guild-error">'+esc(error.message)+'</p><button class="guild-action" data-guild-action="refresh">Réessayer</button>';}finally{busy=false;}
 }
 async function saveGuildPhoto(file,input){
  if(busy)return;
  if(!/^image\//i.test(file.type)||file.size>8*1024*1024){alert('Choisis une image de 8 Mo maximum.');input.value='';return;}
  if(typeof window.MOU_UPLOAD_PHOTO!=='function'){alert('Le service photo est indisponible.');input.value='';return;}
  busy=true;
  try{
   const url=await window.MOU_UPLOAD_PHOTO(file);
   const result=await request('POST',{action:'updatePhoto',photo:url});
   if(lastData)render({...lastData,group:result.group||{...lastData.group,photo:url},welcomeCreated:false});
  }catch(error){alert(error.message||'Impossible de modifier la photo du groupe.');}
  finally{busy=false;input.value='';}
 }
 async function manage(action,playerRecordId){
  if(busy)return;
  if(action==='refresh'){load(true);return;}
  if(action==='create'&&!confirm('Créer l’espace officiel MALAWY pour cette guilde Free Fire ?'))return;
  if(action==='removeOfficer'&&!confirm('Retirer le rôle d’officier à ce joueur ?'))return;
  busy=true;const root=$('#mouGuildContent');const buttons=root?.querySelectorAll('button');buttons?.forEach(b=>b.disabled=true);
  try{
   await request('POST',{action,playerRecordId});
   busy=false;
   await load(false);
  }catch(error){if(root){const feedback=document.createElement('p');feedback.className='guild-feedback guild-error';feedback.textContent=error.message;root.prepend(feedback);}}
  finally{busy=false;buttons?.forEach(b=>b.disabled=false);}
 }
 const observer=new MutationObserver(mount);
 observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',mount);
 window.addEventListener('mou:player-auth',()=>setTimeout(mount,120));
 setTimeout(mount,0);
})();