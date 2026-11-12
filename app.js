
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
// Configure Cloudinary here to enable photo uploads from the phone gallery.
const CLOUDINARY_CLOUD_NAME='owc0mtlg';
const CLOUDINARY_UPLOAD_PRESET='malawy_photos';
const state={players:[],matches:[],teams:[],tournamentGroups:[],token:sessionStorage.getItem('mou_admin_token')||'',playerToken:localStorage.getItem('mou_player_token')||'',admin:false,player:null};
document.body.classList.add('access-locked');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let pageHistory=[];
let currentPage='home';
const validPages=['home','register','profile','players','matches','ranking','admin'];
function getSavedPage(){const saved=localStorage.getItem('mou_last_page')||'home';if(!validPages.includes(saved))return 'home';if(saved==='admin'&&!state.token)return 'home';return saved;}
function tab(n,remember=true){
 if(!document.getElementById(n))return;
 if(n==='profile'&&!state.playerToken){$('#playerProfile').hidden=true;$('#playerLoginForm').hidden=false;}
 if(remember&&n!==currentPage){pageHistory.push(currentPage);history.pushState({mouPage:n},'','#'+n);}
 currentPage=n;
 try{localStorage.setItem('mou_last_page',n);}catch(e){}
 $('.page').forEach(x=>x.classList.toggle('active',x.id===n));
 $$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===n));
 if(n==='admin'&&state.admin)renderAdmin();
 window.scrollTo(0,0);
}
function addPageBackButtons(){
 $$('.page').forEach(p=>{
  if(p.id==='home'||p.querySelector('.page-back'))return;
  const b=document.createElement('button');b.type='button';b.className='secondary page-back';b.dataset.back='true';b.textContent='← Retour';p.insertBefore(b,p.firstChild);
 });
}
addPageBackButtons();
new MutationObserver(addPageBackButtons).observe($('main'),{childList:true});
document.addEventListener('click',e=>{
 const publicPlayer=e.target.closest('[data-public-player]');if(publicPlayer){showPublicPlayer(publicPlayer.dataset.publicPlayer);return;}
 const back=e.target.closest('[data-back]');
 if(back){const previous=pageHistory.pop()||'home';tab(previous,false);return;}
 const t=e.target.closest('[data-tab]');if(t){tab(t.dataset.tab);return;}
 const go=e.target.closest('[data-go]');if(go)tab(go.dataset.go);
});
const initialPage=getSavedPage();
history.replaceState({mouPage:initialPage},'','#'+initialPage);
tab(initialPage,false);
window.addEventListener('popstate',()=>{
 const previous=pageHistory.pop()||'home';
 tab(previous,false);
 if(previous==='home')history.replaceState({mouPage:'home'},'','#home');
});
async function api(path,opts={}){const headers={...(opts.headers||{})};if(state.token)headers.Authorization=`Bearer ${state.token}`;else if(state.playerToken)headers.Authorization=`Bearer ${state.playerToken}`;if(opts.body&&!headers['Content-Type'])headers['Content-Type']='application/json';const r=await fetch(path,{...opts,headers,cache:opts.cache||'no-store'});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||`Erreur ${r.status}`);return d}
async function loadAll(){try{const [p,m,t]=await Promise.all([api('/.netlify/functions/players'),api('/.netlify/functions/matches'),api('/.netlify/functions/teams')]);state.players=Array.isArray(p)?p:[];state.matches=Array.isArray(m)?m:[];state.teams=Array.isArray(t)?t:[]}catch(e){console.error(e);state.players=[];state.matches=[];state.teams=[]}try{const groups=await api('/.netlify/functions/tournament-rosters');state.tournamentGroups=groups.tournaments||[]}catch(e){console.error('Tournois/participants:',e);state.tournamentGroups=[]}render();if(state.admin)renderAdmin()}
function isAcceptedPlayer(p){const s=String(p.status||'').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return !s||['accepte','acceptee','accepted','valide','validee','approved'].includes(s)}
function ranking(){const map=new Map();state.matches.filter(x=>x.status==='Terminé'||!x.status).forEach(x=>{const a=String(x.a||'').trim(),b=String(x.b||'').trim();if(!a||!b)return;[a,b].forEach(n=>{if(!map.has(n)){const player=state.players.find(p=>String(p.pseudo||'').toLowerCase()===n.toLowerCase());map.set(n,{name:n,photo:player?.photo||'',points:0,wins:0,played:0,score:0})}});const A=map.get(a),B=map.get(b),sa=Number(x.sa)||0,sb=Number(x.sb)||0;A.played++;B.played++;A.score+=sa;B.score+=sb;if(sa>sb){A.wins++;A.points+=3}else if(sb>sa){B.wins++;B.points+=3}else{A.points++;B.points++}});return [...map.values()].sort((a,b)=>b.points-a.points||b.wins-a.wins||b.score-a.score||a.name.localeCompare(b.name))}
function avatar(p){const letter=esc((p.name||p.pseudo||'?').slice(0,1).toUpperCase());return p.photo?`<img src="${esc(p.photo)}" alt="Photo ${esc(p.name||p.pseudo)}" onerror="this.remove();this.parentElement.textContent='${letter}'">`:letter}
function showPublicPlayer(pseudo){
 const p=state.players.find(x=>String(x.pseudo||'').toLowerCase()===String(pseudo||'').toLowerCase());
 if(!p)return;
 const rank=ranking().find(x=>x.name.toLowerCase()===String(pseudo).toLowerCase());
 const played=rank?.played||0;
 let modal=$('#publicPlayerModal');
 if(!modal){
  modal=document.createElement('div');modal.id='publicPlayerModal';modal.className='public-player-overlay';modal.hidden=true;
  modal.innerHTML='<div class="public-player-card" role="dialog" aria-modal="true" aria-labelledby="publicPlayerName"><button type="button" class="public-player-close" aria-label="Fermer">×</button><div id="publicPlayerPhoto" class="player-avatar"></div><h3 id="publicPlayerName"></h3><p id="publicPlayerMode"></p><span id="publicPlayerStatus" class="status"></span><div class="stats"><article><strong id="publicPlayerPoints">0</strong><span>Points</span></article><article><strong id="publicPlayerWins">0</strong><span>Victoires</span></article><article><strong id="publicPlayerLosses">0</strong><span>Défaites</span></article></div><p id="publicPlayerPlayed" class="muted"></p></div>';
  document.body.append(modal);
  modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.public-player-close'))modal.hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal&&!modal.hidden)modal.hidden=true;});
 }
 $('#publicPlayerName').textContent=p.pseudo;
 $('#publicPlayerMode').textContent=p.mode||'Joueur MALAWY OPEN UP';
 $('#publicPlayerStatus').textContent='Statut : '+(p.status||'Accepté');
 $('#publicPlayerPoints').textContent=Number(p.points)||rank?.points||0;
 $('#publicPlayerWins').textContent=Number(p.wins)||rank?.wins||0;
 $('#publicPlayerLosses').textContent=Number(p.losses)||0;
 $('#publicPlayerPlayed').textContent=played+' match(s) enregistré(s)';
 $('#publicPlayerPhoto').innerHTML=p.photo?'<img src="'+esc(p.photo)+'" alt="Photo de '+esc(p.pseudo)+'">':esc(p.pseudo.slice(0,1).toUpperCase());
 modal.hidden=false;
}
function render(){const accepted=state.players.filter(p=>isAcceptedPlayer(p)&&p.participant);const rank=ranking();$('#statPlayers').textContent=accepted.length;$('#statMatches').textContent=state.matches.filter(x=>x.status==='Terminé'||!x.status).length;$('#statWins').textContent=state.matches.filter(x=>Number(x.sa)!==Number(x.sb)).length;
$('#playersList').innerHTML=state.tournamentGroups.length?state.tournamentGroups.map(t=>`<article class="tournament-roster-card">
 <div class="tournament-roster-head">${t.poster?`<img class="tournament-roster-poster" src="${esc(t.poster)}" alt="Logo ${esc(t.name)}">`:'<div class="tournament-roster-placeholder">🏆</div>'}
 <div class="tournament-roster-title"><span class="eyebrow">TOURNOI</span><h3>${esc(t.name)}</h3><small>${esc(t.game)} · ${esc(t.format)}${t.date?' · '+esc(new Date(t.date).toLocaleDateString('fr-FR')):''}</small></div></div>
 <div class="tournament-roster-body"><b>JOUEURS INSCRITS</b>
 ${t.signups.map(s=>`<div class="tournament-signup-row">${s.logo?`<img class="tournament-team-logo" src="${esc(s.logo)}" alt="Logo équipe">`:''}<div class="tournament-signup-info">${s.teamName?`<strong>${esc(s.teamName)}</strong>`:''}<div class="tournament-player-names">${s.players.map(n=>`<span>${esc(n)}</span>`).join('')}</div></div><span class="tournament-signup-status ${s.status==='Acceptée'?'approved':'pending'}">${esc(s.status)}</span></div>`).join('')}
 </div></article>`).join(''):'<p class="muted">Aucune inscription à un tournoi pour le moment.</p>';
$('#publicMatchList').innerHTML=state.matches.filter(x=>x.status==='Terminé'||!x.status).map(x=>`<div class="item"><div><b>${esc(x.a)} vs ${esc(x.b)}</b><small>${esc(x.date||'')}</small></div><strong>${Number(x.sa)||0} — ${Number(x.sb)||0}</strong></div>`).join('')||'<p class="muted">Aucun résultat enregistré pour le moment.</p>';
$('#topPlayers').innerHTML=rank.length?rank.slice(0,3).map((p,i)=>`<button type="button" class="top-player rank-${i+1} public-player-row" data-public-player="${esc(p.name)}"><b>${i===0?'👑 TOP 1':'TOP '+(i+1)}</b><div class="player-avatar">${avatar(p)}</div><strong>${esc(p.name)}</strong><big>${p.points} <small>PTS</small></big><span>${p.wins} victoire(s) · ${p.played} match(s)</span></button>`).join(''):'<p class="muted">Le podium apparaîtra après les premiers matchs.</p>';
$('#rankingList').innerHTML=rank.map((p,i)=>`<button type="button" class="item public-player-row" data-public-player="${esc(p.name)}"><div><b>#${i+1} ${esc(p.name)}</b><small>${p.wins} victoire(s) · ${p.played} match(s) · score ${p.score}</small></div><strong>${p.points} pts</strong></button>`).join('')||'<p class="muted">Aucun joueur classé pour le moment.</p>';
const teams=[...state.teams].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.name.localeCompare(b.name));
$('#topTeams').innerHTML=teams.length?teams.slice(0,3).map((t,i)=>`<article class="top-player rank-${i+1}"><b>${i===0?'👑 TOP 1':'TOP '+(i+1)}</b><strong>${esc(t.name)}</strong><big>${t.points} <small>PTS</small></big><span>${esc(t.format||'Équipe')} · ${esc(t.tournament||'')}</span></article>`).join(''):'<p class="muted">Le podium des équipes apparaîtra après les premières validations.</p>';
$('#teamsRankingList').innerHTML=teams.map((t,i)=>`<div class="item"><div><b>#${i+1} ${esc(t.name)}</b><small>${esc(t.format||'Équipe')} · ${esc(t.tournament||'')} · ${esc(t.players||'')}</small></div><strong>${t.points} pts</strong></div>`).join('')||'<p class="muted">Aucune équipe pour le moment.</p>';}
$('#regForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),msg=$('#regMsg');msg.textContent='Envoi…';try{await api('/.netlify/functions/register',{method:'POST',body:JSON.stringify({pseudo:String(f.get('pseudo')).trim(),playerId:String(f.get('ffid')).trim(),mode:String(f.get('mode'))})});msg.textContent='Inscription envoyée ! En attente de validation.';e.target.reset();await loadAll()}catch(x){msg.textContent='Erreur : '+x.message}});

$('#gateAdminForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const msg=$('#gateAdminMsg'),button=e.submitter;button.disabled=true;msg.textContent='Vérification du code…';
 try{
  const r=await fetch('/.netlify/functions/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:e.target.code.value})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Code administrateur incorrect');
  state.token=d.token;state.admin=true;sessionStorage.setItem('mou_admin_token',state.token);
  document.body.classList.remove('access-locked');$('#accessGate').hidden=true;
  $('#adminForm').hidden=true;$('#adminContent').hidden=false;await loadAll();tab('admin',false);
 }catch(err){msg.textContent=err.message;}finally{button.disabled=false;}
});
$('#refresh').onclick=loadAll;
$('#adminForm').addEventListener('submit',async e=>{e.preventDefault();const msg=$('#adminMsg');msg.textContent='Connexion…';try{const d=await api('/.netlify/functions/admin',{method:'POST',body:JSON.stringify({code:e.target.pin.value})});state.token=d.token;state.admin=true;sessionStorage.setItem('mou_admin_token',state.token);window.dispatchEvent(new Event('mou:admin-auth'));e.target.hidden=true;$('#adminContent').hidden=false;msg.textContent='Connecté';await loadAll();}catch(x){msg.textContent=x.message}});

async function loadPlayerProfile(){
 if(!state.playerToken)return;
 try{
  const r=await fetch('/.netlify/functions/player-account',{headers:{Authorization:'Bearer '+state.playerToken}});
  const p=await r.json();if(!r.ok)throw Error(p.error||'Connexion expirée');
  state.player=p;$('#playerLoginForm').hidden=true;$('#playerProfile').hidden=false;document.body.classList.remove('access-locked');$('#accessGate').hidden=true;
  $('#profilePseudo').textContent=p.pseudo;$('#profileUid').textContent='UID : '+p.playerId;$('#profileStatus').textContent='Statut : '+p.status;
  $('#profilePoints').textContent=p.points;$('#profileWins').textContent=p.wins;$('#profileLosses').textContent=p.losses;
  $('#profileAvatar').innerHTML=p.photo?'<img src="'+esc(p.photo)+'" alt="Photo joueur">':esc(p.pseudo.slice(0,1).toUpperCase());
  $('#profileMatches').innerHTML=p.matches.map(m=>'<div class="item"><div><b>'+esc(m.a)+' vs '+esc(m.b)+'</b><small>'+ (m.date?new Date(m.date).toLocaleDateString('fr-FR'):'')+'</small></div><strong>'+m.sa+' — '+m.sb+'</strong></div>').join('')||'<p class="muted">Aucun match terminé pour le moment.</p>';
 }catch(e){state.playerToken='';state.player=null;localStorage.removeItem('mou_player_token');$('#playerProfile').hidden=true;$('#playerLoginForm').hidden=false;document.body.classList.add('access-locked');$('#accessGate').hidden=false;$('#gateMsg').textContent=e.message;}
}
$('#showSignup').onclick=()=>{$('#playerSignupForm').hidden=false;$('#playerLoginForm').hidden=true;};
$('#showLogin').onclick=()=>{$('#playerSignupForm').hidden=true;$('#playerLoginForm').hidden=false;};
$('#playerSignupForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=new FormData(e.target),msg=$('#signupMsg'),button=e.submitter;button.disabled=true;msg.textContent='Préparation de ta demande…';
 try{const file=f.get('photo');if(!file||!file.size)throw Error('Ajoute une photo de profil.');msg.textContent='Envoi de ta photo…';const photo=await uploadPhoto(file);
 const r=await fetch('/.netlify/functions/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pseudo:String(f.get('pseudo')).trim(),playerId:String(f.get('playerId')).trim(),mode:String(f.get('mode')),pin:String(f.get('pin')),photo})});const out=await r.json();if(!r.ok)throw Error(out.error||'Inscription impossible');
 msg.textContent='Demande envoyée ! Attends la validation de l’administration. Tu pourras ensuite te connecter avec ton pseudo, UID et PIN.';e.target.reset();
 }catch(err){msg.textContent=err.message;}finally{button.disabled=false;}
});
$('#playerLoginForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=new FormData(e.target),msg=$('#gateMsg'),button=e.submitter;button.disabled=true;msg.textContent='Vérification…';
 try{const r=await fetch('/.netlify/functions/player-account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pseudo:String(f.get('pseudo')).trim(),playerId:String(f.get('playerId')).trim(),pin:String(f.get('pin'))})});const out=await r.json();if(!r.ok)throw Error(out.error||'Connexion impossible');
 state.playerToken=out.token;localStorage.setItem('mou_player_token',out.token);await loadPlayerProfile();if(state.player){tab('profile');$('#playerLoginForm').hidden=true;$('#playerProfile').hidden=false;document.body.classList.remove('access-locked');$('#accessGate').hidden=true;}
 }catch(err){msg.textContent=err.message;}finally{button.disabled=false;}
});
$('#saveProfilePhoto').addEventListener('click',async()=>{
 const file=$('#profilePhoto').files[0],msg=$('#profileMsg');if(!file){msg.textContent='Choisis une photo avant de continuer.';return;}
 try{msg.textContent='Envoi de la photo…';const photo=await uploadPhoto(file);const r=await fetch('/.netlify/functions/player-account',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+state.playerToken},body:JSON.stringify({photo})});const d=await r.json();if(!r.ok)throw Error(d.error||'Enregistrement impossible');msg.textContent='Photo mise à jour !';await loadPlayerProfile();}
 catch(e){msg.textContent=e.message;}
});
$('#playerLogout').onclick=()=>{state.playerToken='';state.player=null;localStorage.removeItem('mou_player_token');$('#playerProfile').hidden=true;$('#playerLoginForm').hidden=false;$('#playerLoginForm').reset();document.body.classList.add('access-locked');$('#accessGate').hidden=false;$('#gateMsg').textContent='Déconnecté.';};

const settingsMenu=$('#settingsMenu'),settingsToggle=$('#settingsToggle');
function closeSettings(){settingsMenu.hidden=true;settingsToggle.setAttribute('aria-expanded','false');}
settingsToggle.addEventListener('click',()=>{settingsMenu.hidden=!settingsMenu.hidden;settingsToggle.setAttribute('aria-expanded',String(!settingsMenu.hidden));$('#pinResetWrap').hidden=!state.playerToken;$('#themeToggle').textContent=document.body.dataset.theme==='light'?'🌙 Mode sombre':'☀️ Mode clair';});
document.addEventListener('click',e=>{if(!e.target.closest('#settingsMenu')&&!e.target.closest('#settingsToggle'))closeSettings();});
const savedTheme=localStorage.getItem('mou_theme')||'dark';document.body.dataset.theme=savedTheme;
$('#themeToggle').onclick=()=>{const next=document.body.dataset.theme==='light'?'dark':'light';document.body.dataset.theme=next;localStorage.setItem('mou_theme',next);$('#themeToggle').textContent=next==='light'?'🌙 Mode sombre':'☀️ Mode clair';};
$('#settingsLogout').onclick=()=>{closeSettings();if(state.playerToken)$('#playerLogout').click();if(state.admin)$('#logout').click();if(!state.playerToken&&!state.admin){$('#accessGate').hidden=false;$('#gateMsg').textContent='Tu es déjà déconnecté.';}};
$('#pinResetForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),msg=$('#pinResetMsg'),button=e.target.querySelector('button[type="submit"]');const currentPin=String(f.get('currentPin')||''),newPin=String(f.get('newPin')||'');if(!/^[0-9]{4,8}$/.test(newPin)){msg.textContent='Le nouveau PIN doit contenir 4 à 8 chiffres.';return;}button.disabled=true;msg.textContent='Mise à jour…';try{const r=await fetch('/.netlify/functions/player-account',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+state.playerToken},body:JSON.stringify({action:'changePin',currentPin,newPin})});const d=await r.json();if(!r.ok)throw Error(d.error||'Impossible de modifier le PIN');e.target.reset();msg.textContent='Code PIN modifié avec succès.';}catch(err){msg.textContent=err.message;}finally{button.disabled=false;}});

if(state.playerToken)loadPlayerProfile();
if(state.admin)renderAdmin();
$('#logout').onclick=()=>{state.admin=false;state.token='';sessionStorage.removeItem('mou_admin_token');$('#adminContent').hidden=true;$('#adminForm').hidden=false;$('#adminForm').reset();$('#adminMsg').textContent='Déconnecté'};
async function uploadPhoto(file){if(!CLOUDINARY_CLOUD_NAME||!CLOUDINARY_UPLOAD_PRESET)throw Error('Cloudinary non configuré dans app.js.');const fd=new FormData();fd.append('file',file);fd.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw Error(d.error?.message||'Échec de l’envoi de la photo');return d.secure_url}
async function renderAdmin(){if(!state.admin)return;$('#adminContent').hidden=false;$('#adminForm').hidden=true;$('#adminPlayers').innerHTML=state.players.map(p=>`<article class="item admin-player"><div class="admin-player-main"><div class="mini-avatar">${avatar({name:p.pseudo,photo:p.photo})}</div><div><b>${esc(p.pseudo)}</b><small>ID : ${esc(p.playerId||'non renseigné')} · ${esc(p.mode||'')}</small><small>Statut : ${esc(p.status||'En attente')}</small></div></div><div class="admin-player-controls"><select data-status="${esc(p.id)}"><option ${p.status==='En attente'?'selected':''}>En attente</option><option ${p.status==='Accepté'?'selected':''}>Accepté</option><option ${p.status==='Refusé'?'selected':''}>Refusé</option><option ${p.status==='Banni'?'selected':''}>Banni</option></select><input class="photo-input" type="file" accept="image/*"data-photo="${esc(p.id)}"><div class="item-actions"><button class="secondary" data-save-player="${esc(p.id)}">Enregistrer</button><button class="danger" data-delete-player="${esc(p.id)}">Supprimer</button></div></div></article>`).join('')||'<p class="muted">Aucune inscription.</p>';
$('#playerNames').innerHTML=state.players.map(p=>`<option value="${esc(p.pseudo)}"></option>`).join('');
const pointsForm=$('#pointsForm');
if(pointsForm){const type=pointsForm.elements.targetType.value;const choices=type==='team'?state.teams:state.players.filter(isAcceptedPlayer);pointsForm.elements.targetId.innerHTML='<option value="">Choisir</option>'+choices.map(x=>`<option value="${esc(x.id)}">${esc(type==='team'?x.name:x.pseudo)} · ${Number(x.points)||0} pts</option>`).join('');}
$('#adminMatches').innerHTML=state.matches.map(m=>`<div class="item"><div><b>${esc(m.a)} ${Number(m.sa)||0} — ${Number(m.sb)||0} ${esc(m.b)}</b><small>${esc(m.date||'')}</small></div><div class="item-actions"><button class="secondary" data-edit-match="${esc(m.id)}">Modifier</button><button class="danger" data-delete-match="${esc(m.id)}">Supprimer</button></div></div>`).join('')||'<p class="muted">Aucun match enregistré.</p>';
$('#adminPlayers').querySelectorAll('[data-save-player]').forEach(b=>b.onclick=async()=>{const id=b.dataset.savePlayer;try{b.disabled=true;const status=$(`[data-status="${CSS.escape(id)}"]`).value;const file=$(`[data-photo="${CSS.escape(id)}"]`).files[0];let photo;if(file)photo=await uploadPhoto(file);await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'updatePlayer',id,status,...(photo?{photo}:{})})});await loadAll()}catch(e){alert(e.message)}finally{b.disabled=false}});
$('#adminPlayers').querySelectorAll('[data-delete-player]').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer définitivement ce joueur ?'))return;try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'deletePlayer',id:b.dataset.deletePlayer})});await loadAll()}catch(e){alert(e.message)}});
$('#adminMatches').querySelectorAll('[data-edit-match]').forEach(b=>b.onclick=()=>{const m=state.matches.find(x=>x.id===b.dataset.editMatch);if(!m)return;const f=$('#matchForm');f.recordId.value=m.id;f.a.value=m.a;f.b.value=m.b;f.sa.value=m.sa;f.sb.value=m.sb;f.mode.value=m.mode||'1 VS 1';f.date.value=m.dateInput||'';tab('admin');f.scrollIntoView({behavior:'smooth',block:'center'})});
$('#adminMatches').querySelectorAll('[data-delete-match]').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer ce résultat ?'))return;try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'deleteMatch',id:b.dataset.deleteMatch})});await loadAll()}catch(e){alert(e.message)}})}
$('#pointsForm').addEventListener('change',e=>{if(e.target.name==='targetType'){const type=e.target.value;const choices=type==='team'?state.teams:state.players.filter(isAcceptedPlayer);e.target.form.elements.targetId.innerHTML='<option value="">Choisir</option>'+choices.map(x=>`<option value="${esc(x.id)}">${esc(type==='team'?x.name:x.pseudo)} · ${Number(x.points)||0} pts</option>`).join('');}});
$('#pointsForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),msg=$('#pointsMsg');msg.textContent='Ajout des points…';try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'addPoints',targetType:String(f.get('targetType')),id:String(f.get('targetId')),points:Number(f.get('points'))})});msg.textContent='Points ajoutés avec succès !';e.target.elements.points.value='';await loadAll()}catch(x){msg.textContent='Erreur : '+x.message}});
$('#matchForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),msg=$('#matchMsg');msg.textContent='Enregistrement…';try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'saveMatch',id:f.get('recordId')||'',a:String(f.get('a')).trim(),b:String(f.get('b')).trim(),sa:Number(f.get('sa')),sb:Number(f.get('sb')),mode:String(f.get('mode')),date:String(f.get('date')||'')})});msg.textContent='Résultat enregistré et partagé.';e.target.reset();await loadAll()}catch(x){msg.textContent=x.message}});
$('#resetMatch').onclick=()=>$('#matchForm').reset();
if(state.token){state.admin=true;$('#adminForm').hidden=true;$('#adminContent').hidden=false;}
loadAll();
let publicRefreshBusy=false;
async function refreshPublicData(){
 if(publicRefreshBusy||document.hidden)return;
 publicRefreshBusy=true;
 try{await loadAll()}finally{publicRefreshBusy=false}
}
window.addEventListener('focus',refreshPublicData);
window.addEventListener('pageshow',refreshPublicData);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPublicData()});
setInterval(refreshPublicData,15000);
