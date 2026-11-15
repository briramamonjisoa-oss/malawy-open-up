
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
// Configure Cloudinary here to enable photo uploads from the phone gallery.
const CLOUDINARY_CLOUD_NAME='owc0mtlg';
const CLOUDINARY_UPLOAD_PRESET='malawy_photos';
// L'API vit sur le Worker Cloudflare, pas nécessairement sur l'origine de la page.
const API_ORIGIN='https://malawy-open-up.briramamonjisoa.workers.dev';
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
 $$('.page').forEach(x=>x.classList.toggle('active',x.id===n));
 $$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===n));
 if(n==='admin'&&state.token){state.admin=true;$('#adminForm').hidden=true;$('#adminContent').hidden=false;renderAdmin();loadAll();loadRequestsInbox();}
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
async function api(path,opts={}){if(path.startsWith('/.netlify/functions/'))path=API_ORIGIN+path;const headers={...(opts.headers||{})};if(state.token)headers.Authorization=`Bearer ${state.token}`;else if(state.playerToken)headers.Authorization=`Bearer ${state.playerToken}`;if(opts.body&&!headers['Content-Type'])headers['Content-Type']='application/json';const r=await fetch(path,{...opts,headers,cache:opts.cache||'no-store'});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||`Erreur ${r.status}`);return d}
window.addEventListener('mou:admin-auth',()=>{
 state.token=sessionStorage.getItem('mou_admin_token')||'';
 state.admin=Boolean(state.token);
 if(state.admin){$('#adminForm').hidden=true;$('#adminContent').hidden=false;loadAll();}
});
async function loadAll(){
 const errors=[];
 const jobs=await Promise.allSettled([
  api('/.netlify/functions/matches'),
  api('/.netlify/functions/teams'),
  api('/.netlify/functions/tournament-rosters')
 ]);
 try{
  const response=await fetch(API_ORIGIN+'/.netlify/functions/players?refresh='+Date.now(),{headers:state.token?{Authorization:'Bearer '+state.token}:{},cache:'no-store'});
  const payload=await response.json();
  if(!response.ok)throw new Error(payload.error||'Erreur '+response.status);
  if(!Array.isArray(payload))throw new Error('Réponse Airtable invalide : liste de joueurs attendue.');
  state.players=payload;
  const inboxCount=document.getElementById('inboxCount');if(inboxCount)inboxCount.textContent=String(payload.length);
 }catch(error){errors.push('Inscriptions : '+(error.message||'chargement impossible'));console.error(errors[errors.length-1]);}
 if(jobs[0].status==='fulfilled'&&Array.isArray(jobs[0].value))state.matches=jobs[0].value;
 else{errors.push('Matchs : '+(jobs[0].reason?.message||'indisponible'));console.error(errors[errors.length-1]);}
 if(jobs[1].status==='fulfilled'&&Array.isArray(jobs[1].value))state.teams=jobs[1].value;
 else{errors.push('Équipes : '+(jobs[1].reason?.message||'indisponible'));console.error(errors[errors.length-1]);}
 if(jobs[2].status==='fulfilled')state.tournamentGroups=jobs[2].value?.tournaments||[];
 else{state.tournamentGroups=[];console.error('Tournois/participants:',jobs[2].reason);}
 state.adminLoadErrors=errors;
 // Render the admin list independently: a public-page rendering error must not hide player requests.
 if(state.admin){
  try{renderAdmin();}
  catch(error){
   console.error('Erreur affichage panneau admin:',error);
   const list=document.getElementById('adminPlayers');
   if(list)list.innerHTML='<p class="message">Erreur affichage joueurs : '+esc(error.message||'erreur inconnue')+'</p>';
  }
 }
 try{render();}
 catch(error){console.error('Erreur affichage public:',error);}
}
function isAcceptedPlayer(p){const s=String(p.status||'').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return !s||['accepte','acceptee','accepted','valide','validee','approved'].includes(s)}
function ranking(){
 const map=new Map();
 state.players.filter(isAcceptedPlayer).forEach(player=>{const name=String(player.pseudo||'').trim();if(!name)return;const wins=Number(player.wins)||0,losses=Number(player.losses)||0;map.set(name,{name,photo:player.photo||'',playerId:player.playerId||'',freeFireProfile:player.freeFireProfile||null,points:Number(player.points)||0,wins,losses,played:wins+losses,score:0,_winsFromMatches:0,_lossesFromMatches:0,_playedFromMatches:0});});
 state.matches.filter(x=>{const s=String(x.status||'').trim().toLocaleLowerCase('fr');return !s||s==='termine'||s==='terminé'||s==='completed';}).forEach(x=>{const a=String(x.a||'').trim(),b=String(x.b||'').trim();if(!a||!b)return;const getPlayer=name=>{const existing=[...map.entries()].find(([key])=>key.toLowerCase()===name.toLowerCase());if(existing)return existing[1];const player=state.players.find(p=>String(p.pseudo||'').toLowerCase()===name.toLowerCase());const created={name,photo:player?.photo||'',playerId:player?.playerId||'',freeFireProfile:player?.freeFireProfile||null,points:Number(player?.points)||0,wins:0,losses:0,played:0,score:0,_winsFromMatches:0,_lossesFromMatches:0,_playedFromMatches:0};map.set(name,created);return created;};const A=getPlayer(a),B=getPlayer(b),sa=Number(x.sa)||0,sb=Number(x.sb)||0;A._playedFromMatches++;B._playedFromMatches++;A.score+=sa;B.score+=sb;if(sa>sb){A._winsFromMatches++;A.points+=3;}else if(sb>sa){B._winsFromMatches++;B.points+=3;}else{A.points++;B.points++;}});
 return [...map.values()].map(p=>{const wins=Math.max(p.wins,p._winsFromMatches),losses=Math.max(p.losses,p._playedFromMatches-p._winsFromMatches);return {...p,wins,losses,played:Math.max(p.played,p._playedFromMatches)};}).sort((a,b)=>b.points-a.points||b.wins-a.wins||b.score-a.score||a.name.localeCompare(b.name));
}
function avatar(p){const letter=esc((p.name||p.pseudo||'?').slice(0,1).toUpperCase());return p.photo?`<img src="${esc(p.photo)}" alt="Photo ${esc(p.name||p.pseudo)}" onerror="this.remove();this.parentElement.textContent='${letter}'">`:letter}
function showPublicPlayer(pseudo){
 const p=state.players.find(x=>String(x.pseudo||'').toLowerCase()===String(pseudo||'').toLowerCase());
 if(!p)return;
 const rank=ranking().find(x=>x.name.toLowerCase()===String(pseudo).toLowerCase());
 const played=Math.max(rank?.played||0,(Number(p.wins)||0)+(Number(p.losses)||0));
 let modal=$('#publicPlayerModal');
 if(!modal){
  modal=document.createElement('div');modal.id='publicPlayerModal';modal.className='public-player-overlay';modal.hidden=true;
  modal.innerHTML='<div class="public-player-card" role="dialog" aria-modal="true" aria-labelledby="publicPlayerName"><button type="button" class="public-player-close" aria-label="Fermer">×</button><div id="publicPlayerPhoto" class="player-avatar"></div><h3 id="publicPlayerName"></h3><p id="publicPlayerMode"></p><p id="publicPlayerUid" class="muted"></p><span id="publicPlayerStatus" class="status"></span><div class="stats"><article><strong id="publicPlayerPoints">0</strong><span>Points</span></article><article><strong id="publicPlayerWins">0</strong><span>Victoires</span></article><article><strong id="publicPlayerLosses">0</strong><span>Défaites</span></article></div><p id="publicPlayerPlayed" class="muted"></p><div id="publicPlayerFreeFireRanks" class="public-player-ranks"></div></div>';
  document.body.append(modal);
  modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.public-player-close'))modal.hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal&&!modal.hidden)modal.hidden=true;});
 }
 $('#publicPlayerName').textContent=p.pseudo;
 $('#publicPlayerMode').textContent=p.mode||'Joueur MALAWY OPEN UP';
 $('#publicPlayerUid').textContent=p.playerId?'UID Free Fire : '+p.playerId:'';
 $('#publicPlayerStatus').textContent='Statut : '+(p.status||'Accepté');
 $('#publicPlayerPoints').textContent=Number(p.points)||rank?.points||0;
 $('#publicPlayerWins').textContent=Number(p.wins)||rank?.wins||0;
 $('#publicPlayerLosses').textContent=Number(p.losses)||0;
 $('#publicPlayerPlayed').textContent=played+' match(s) enregistré(s)';
 const profile=p.freeFireProfile||{},ff=profile.basicInfo||{},clanValue=profile.clanBasicInfo,clan=Array.isArray(clanValue)?(clanValue[0]||{}):(clanValue||{}),captain=profile.captainBasicInfo||{};const rankBox=$('#publicPlayerFreeFireRanks');if(rankBox)rankBox.innerHTML=p.freeFireProfile?'<h4>RANGS FREE FIRE</h4><div class="public-rank-grid"><div class="freefire-rank-section"><small>BATTLE ROYALE</small>'+freeFireRankCard(ff.rank,ff.rankingPoints,'br')+'</div><div class="freefire-rank-section"><small>CLASH SQUAD</small>'+freeFireRankCard(ff.csRank,ff.csRankingPoints,'cs')+'</div></div><h4 class="public-player-extra-title">INFORMATIONS DU JOUEUR</h4><div class="public-player-extra-grid"><article><small>NIVEAU FREE FIRE</small><b>⭐ Niveau '+(Number(ff.level)||'—')+'</b></article><article><small>LIKES</small><b>'+(Number(ff.liked)||0).toLocaleString('fr-FR')+'</b></article><article><small>GUILDE</small><b>'+esc(clan.clanName||'Aucune guilde')+'</b><span>Niveau '+(Number(clan.clanLevel)||'—')+' · '+(Number(clan.memberNum)||0)+' membres</span></article><article><small>CHEF DE GUILDE</small><b>'+esc(captain.nickname||'Non disponible')+'</b><span>'+(captain.accountId?'UID : '+esc(captain.accountId):'')+'</span></article></div>':'<p class="muted">Profil Free Fire : en attente de synchronisation.</p>';
 $('#publicPlayerPhoto').innerHTML=p.photo?'<img src="'+esc(p.photo)+'" alt="Photo de '+esc(p.pseudo)+'">':esc(p.pseudo.slice(0,1).toUpperCase());
 modal.hidden=false;
}
function render(){const accepted=state.players.filter(isAcceptedPlayer);const rank=ranking();const completedMatches=state.matches.filter(x=>{const status=String(x.status||'').trim().toLocaleLowerCase('fr');return !status||status==='termine'||status==='terminé'||status==='completed';});$('#statPlayers').textContent=accepted.length;$('#statMatches').textContent=completedMatches.length;$('#statWins').textContent=rank.reduce((total,player)=>total+player.wins,0);
$('#playersList').innerHTML=state.tournamentGroups.length?state.tournamentGroups.map(t=>`<article class="tournament-roster-card">
 <div class="tournament-roster-head">${t.poster?`<img class="tournament-roster-poster" src="${esc(t.poster)}" alt="Logo ${esc(t.name)}">`:'<div class="tournament-roster-placeholder">🏆</div>'}
 <div class="tournament-roster-title"><span class="eyebrow">TOURNOI</span><h3>${esc(t.name)}</h3><small>${esc(t.game)} · ${esc(t.format)}${t.date?' · '+esc(new Date(t.date).toLocaleDateString('fr-FR')):''}</small></div></div>
 <div class="tournament-roster-body"><b>JOUEURS INSCRITS</b>
 ${t.signups.map(s=>`<div class="tournament-signup-row">${s.logo?`<img class="tournament-team-logo" src="${esc(s.logo)}" alt="Logo équipe">`:''}<div class="tournament-signup-info">${s.teamName?`<strong>${esc(s.teamName)}</strong>`:''}<div class="tournament-player-names">${(s.playerDetails||s.players.map(name=>({name,photo:''}))).map(player=>`<button type="button" class="tournament-player-chip public-player-row" data-public-player="${esc(player.name.replace(/ \(remplaçant\)$/i,''))}" aria-label="Voir le profil de ${esc(player.name)}">${player.photo?`<img src="${esc(player.photo)}" alt="Photo ${esc(player.name)}" loading="lazy" onerror="this.remove()">`:''}<span>${esc(player.name)}</span></button>`).join('')}</div></div><span class="tournament-signup-status ${s.status==='Acceptée'?'approved':'pending'}">${esc(s.status)}</span></div>`).join('')}
 </div></article>`).join(''):'<p class="muted">Aucune inscription à un tournoi pour le moment.</p>';
const manualStats=rank;
$('#publicMatchList').innerHTML=(manualStats.length?'<h3>STATISTIQUES DES JOUEURS</h3>'+manualStats.map(p=>'<div class="item"><div><b>'+esc(p.name)+'</b><small>'+p.played+' match(s) · '+p.wins+' victoire(s) · '+p.losses+' défaite(s)</small></div><strong>'+p.wins+'/'+p.played+'</strong></div>').join(''):'')+(state.matches.filter(x=>x.status==='Terminé'||!x.status).length?'<h3>RÉSULTATS DES MATCHS</h3>'+state.matches.filter(x=>x.status==='Terminé'||!x.status).map(x=>'<div class="item"><div><b>'+esc(x.a)+' vs '+esc(x.b)+'</b><small>'+esc(x.date||'')+'</small></div><strong>'+(Number(x.sa)||0)+' — '+(Number(x.sb)||0)+'</strong></div>').join(''):'')||'<p class="muted">Aucune statistique ni résultat enregistré pour le moment.</p>';
$('#topPlayers').innerHTML=rank.length?rank.slice(0,3).map((p,i)=>`<button type="button" class="top-player rank-${i+1} public-player-row" data-public-player="${esc(p.name)}"><b>${i===0?'TOP 1':'TOP '+(i+1)}</b><div class="player-avatar">${avatar(p)}</div><strong>${esc(p.name)}</strong><big>${p.points} <small>PTS</small></big><span>${p.wins} victoire(s) · ${p.played} match(s)</span></button>`).join(''):'<p class="muted">Le podium apparaîtra après les premiers matchs.</p>';
$('#rankingList').innerHTML=rank.map((p,i)=>{const bi=p.freeFireProfile?.basicInfo||{};return `<button type="button" class="item public-player-row ranking-player-row" data-public-player="${esc(p.name)}"><div class="ranking-player-main"><b>#${i+1} ${esc(p.name)}</b><small>${p.wins} victoire(s) · ${p.played} match(s) · score ${p.score}</small><span class="ranking-mini-ranks">${p.freeFireProfile?'BR '+esc(freeFireRankInfo(bi.rank,bi.rankingPoints,'br').name)+' · CS '+esc(freeFireRankInfo(bi.csRank,bi.csRankingPoints,'cs').name):'Rangs Free Fire non synchronisés'}</span></div><strong>${p.points} pts</strong></button>`}).join('')||'<p class="muted">Aucun joueur classé pour le moment.</p>';
const teams=[...state.teams].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.name.localeCompare(b.name));
$('#topTeams').innerHTML=teams.length?teams.slice(0,3).map((t,i)=>`<article class="top-player rank-${i+1}"><b>${i===0?'TOP 1':'TOP '+(i+1)}</b><strong>${esc(t.name)}</strong><big>${t.points} <small>PTS</small></big><span>${esc(t.format||'Équipe')} · ${esc(t.tournament||'')}</span></article>`).join(''):'<p class="muted">Le podium des équipes apparaîtra après les premières validations.</p>';
$('#teamsRankingList').innerHTML=teams.map((t,i)=>`<div class="item"><div><b>#${i+1} ${esc(t.name)}</b><small>${esc(t.format||'Équipe')} · ${esc(t.tournament||'')} · ${esc(t.players||'')}</small></div><strong>${t.points} pts</strong></div>`).join('')||'<p class="muted">Aucune équipe pour le moment.</p>';}
$('#regForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),msg=$('#regMsg');msg.textContent='Envoi…';try{await api('/.netlify/functions/register',{method:'POST',body:JSON.stringify({pseudo:String(f.get('pseudo')).trim(),playerId:String(f.get('ffid')).trim(),mode:String(f.get('mode')),pin:String(f.get('pin')||'')})});msg.textContent='Inscription envoyée ! En attente de validation.';e.target.reset();await loadAll()}catch(x){msg.textContent='Erreur : '+x.message}});

$('#gateAdminForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const msg=$('#gateAdminMsg'),button=e.submitter;button.disabled=true;msg.textContent='Vérification du code…';
 try{
  const r=await fetch(API_ORIGIN+'/.netlify/functions/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:e.target.code.value})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Code administrateur incorrect');
  state.token=d.token;state.admin=true;sessionStorage.setItem('mou_admin_token',state.token);
  document.body.classList.remove('access-locked');$('#accessGate').hidden=true;
  $('#adminForm').hidden=true;$('#adminContent').hidden=false;await loadAll();tab('admin',false);
 }catch(err){msg.textContent=err.message;}finally{button.disabled=false;}
});
$('#refresh').onclick=loadAll;
$('#adminForm').addEventListener('submit',async e=>{e.preventDefault();const msg=$('#adminMsg');msg.textContent='Connexion…';try{const d=await api('/.netlify/functions/admin',{method:'POST',body:JSON.stringify({code:e.target.pin.value})});state.token=d.token;state.admin=true;sessionStorage.setItem('mou_admin_token',state.token);window.dispatchEvent(new Event('mou:admin-auth'));e.target.hidden=true;$('#adminContent').hidden=false;msg.textContent='Connecté';await loadAll();}catch(x){msg.textContent=x.message}});


const FREE_FIRE_RANK_SPRITE='assets/freefire-ranks-hd.webp';
const FREE_FIRE_RANK_POS={
 B1:[0,0],B2:[1,0],B3:[2,0],S1:[3,0],S2:[4,0],S3:[5,0],
 G1:[6,0],G2:[0,1],G3:[1,1],G4:[2,1],P1:[3,1],P2:[4,1],P3:[5,1],P4:[6,1],
 D1:[0,2],D2:[1,2],D3:[2,2],D4:[3,2],D45:[4,2],D5:[5,2],
 H1:[6,2],H2:[0,3],H3:[1,3],H4:[2,3],H5:[3,3],
 M1:[4,3],M3:[5,3],M4:[6,3],M5:[0,4],
 BRGM1:[1,4],BRGM2:[2,4],BRGM3:[3,4],BRGM4:[4,4],BRGM5:[5,4],BRGM6:[6,4]
};
// Les rangs sont calculés avec les points RP (BR) et les étoiles (CS).
// Les codes API sont conservés à titre d'information, jamais utilisés seuls pour deviner le grade.
function freeFireRankInfo(rankCode,points,mode='br'){
 const score=Number(points);
 if(!Number.isFinite(score)||score<0)return {name:'Rang indisponible',division:'',asset:'',code:Number.isFinite(Number(rankCode))?Number(rankCode):null,points:0,mode};
 let rank;
 if(mode==='cs'){
  if(score===0)rank={name:'Argent',division:'III',asset:'S3'};
  else if(score<=4)rank={name:'Or',division:'I',asset:'G1'};
  else if(score<=8)rank={name:'Or',division:'II',asset:'G2'};
  else if(score<=12)rank={name:'Or',division:'III',asset:'G3'};
  else if(score<=16)rank={name:'Or',division:'IV',asset:'G4'};
  else if(score<=21)rank={name:'Platine',division:'I',asset:'P1'};
  else if(score<=26)rank={name:'Platine',division:'II',asset:'P2'};
  else if(score<=31)rank={name:'Platine',division:'III',asset:'P3'};
  else if(score<=36)rank={name:'Platine',division:'IV',asset:'P4'};
  else if(score<=45)rank={name:'Diamant',division:'I',asset:'D1'};
  else if(score<=54)rank={name:'Diamant',division:'II',asset:'D2'};
  else if(score<=63)rank={name:'Diamant',division:'III',asset:'D3'};
  else if(score<=72)rank={name:'Diamant',division:'IV',asset:'D4'};
  else if(score<=81)rank={name:'Diamant',division:'V',asset:'D5'};
  else if(score<=106)rank={name:'Héroïque',division:'',asset:'H1'};
  else if(score<=131)rank={name:'Héroïque élite',division:'',asset:'H2'};
  else if(score<=156)rank={name:'Maître',division:'',asset:'M1'};
  else rank={name:'Grand maître',division:'',asset:'BRGM1'};
 }else{
  if(score<=1000)rank={name:'Bronze',division:score<=800?'I':score<=900?'II':'III',asset:score<=800?'B1':score<=900?'B2':'B3'};
  else if(score<=1300)rank={name:'Argent',division:score<=1100?'I':score<=1200?'II':'III',asset:score<=1100?'S1':score<=1200?'S2':'S3'};
  else if(score<=1800)rank={name:'Or',division:score<=1425?'I':score<=1550?'II':score<=1675?'III':'IV',asset:score<=1425?'G1':score<=1550?'G2':score<=1675?'G3':'G4'};
  else if(score<=2300)rank={name:'Platine',division:score<=1925?'I':score<=2050?'II':score<=2175?'III':'IV',asset:score<=1925?'P1':score<=2050?'P2':score<=2175?'P3':'P4'};
  else if(score<=3200)rank={name:'Diamant',division:score<=2525?'I':score<=2750?'II':score<=2975?'III':'IV',asset:score<=2525?'D1':score<=2750?'D2':score<=2975?'D3':'D4'};
  else if(score<=6000)rank={name:'Héroïque',division:'',asset:'H1'};
  else rank={name:'Maître',division:'',asset:'M1'};
 }
 return {...rank,tier:rank.asset,code:Number.isFinite(Number(rankCode))?Number(rankCode):null,points:score,mode};
}
function freeFireRankCard(rankCode,points,mode='br'){
 const info=freeFireRankInfo(rankCode,points,mode),pos=FREE_FIRE_RANK_POS[info.asset],value=Math.max(0,Number(points)||0);
 const icon=pos?'<span class="freefire-rank-emblem" role="img" aria-label="Emblème '+(mode==='cs'?'Clash Squad':'Battle Royale')+' '+esc(info.name)+'" style="background-position:'+((pos[0]/6)*100)+'% '+((pos[1]/4)*100)+'%"></span>':'<span class="freefire-rank-emblem is-unknown" role="img" aria-label="Grade Free Fire indisponible">?</span>';
 const grade=info.name+(info.division?' '+info.division:'');
 const label='<span class="freefire-rank-copy"><b>'+esc(grade)+'</b><small>'+value.toLocaleString('fr-FR')+(mode==='cs'?' étoiles':' points')+' · code '+(info.code??'—')+'</small></span>';
 return '<div class="freefire-rank-tile '+(mode==='cs'?'is-cs':'is-br')+'">'+icon+label+'</div>';
}

async function loadPlayerProfile(){
 if(!state.playerToken)return;
 try{
  const r=await fetch(API_ORIGIN+'/.netlify/functions/player-account',{headers:{Authorization:'Bearer '+state.playerToken},cache:'no-store'});
  const p=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401||r.status===403){state.playerToken='';localStorage.removeItem('mou_player_token');}throw Error(p.error||'Profil temporairement inaccessible ('+r.status+').');}
  state.player=p;$('#playerLoginForm').hidden=true;$('#playerProfile').hidden=false;document.body.classList.remove('access-locked');$('#accessGate').hidden=true;
  $('#profilePseudo').textContent=p.pseudo;$('#profileUid').textContent='UID : '+p.playerId;$('#profileStatus').textContent='Statut : '+p.status;
  $('#profilePoints').textContent=p.points;$('#profileWins').textContent=p.wins;$('#profileLosses').textContent=p.losses;
  const ff=p.freeFireProfile||{},bi=ff.basicInfo||{},clan=ff.clanBasicInfo||{},pet=ff.petInfo||{};
  const ffCard=$('#freeFireProfileCard');
  if(ffCard){
   const dateValue=Number(bi.lastLoginAt||0),lastLogin=dateValue?new Date(dateValue*1000).toLocaleString('fr-FR'):'Non communiqué';
   const inGuild=String(clan.clanId||'')==='3076348376';
   ffCard.hidden=!Object.keys(bi).length;
   ffCard.innerHTML = Object.keys(bi).length ? [
    '<div class="freefire-head"><div><span class="eyebrow">FREE FIRE · PROFIL SYNCHRONISÉ</span><h3>', esc(bi.nickname || p.pseudo),
    '</h3><small>UID ', esc(bi.accountId || p.playerId), ' · Région ', esc(bi.region || 'ME'),
    '</small></div><span class="freefire-guild-state ', inGuild ? 'is-member' : 'not-member', '">',
    inGuild ? 'Membre C•I•A FF' : 'Guilde différente / inconnue',
    '</span></div><div class="freefire-grid">',
    '<div><b>', esc(bi.level ?? '—'), '</b><small>Niveau</small></div>',
    '<div><b>', esc(bi.liked ?? '—'), '</b><small>Likes</small></div>',
    '<div class="freefire-rank-section"><small>BATTLE ROYALE</small>', freeFireRankCard(bi.rank,bi.rankingPoints,'br'), '</div>',
    
    '<div class="freefire-rank-section"><small>CLASH SQUAD</small>', freeFireRankCard(bi.csRank,bi.csRankingPoints,'cs'), '</div>',
    
    '</div><div class="freefire-extra"><span>Guilde : <b>', esc(clan.clanName || 'Non renseignée'),
    '</b> · Niveau ', esc(clan.clanLevel ?? '—'), ' · ', esc(clan.memberNum ?? '—'), '/', esc(clan.capacity ?? '—'),
    '</span><span>Dernière connexion connue : ', esc(lastLogin),
    '</span><span>Crédit : ', esc(ff.creditScoreInfo?.creditScore ?? '—'), ' · Compagnon : ',
    esc(pet.name || '—'), ' (niv. ', esc(pet.level ?? '—'), ')</span><span>Synchronisé : ',
    esc(p.freeFireSyncedAt ? new Date(p.freeFireSyncedAt).toLocaleString('fr-FR') : 'Pas encore'),
    '</span><small>Ces données ne constituent pas un statut en ligne en temps réel.</small></div>'
   ].join('') : '<p class="muted">Profil Free Fire indisponible pour le moment.</p>';
  }
  const profilePlayed=(Number(p.wins)||0)+(Number(p.losses)||0);
  $('#profileAvatar').innerHTML=p.photo?'<img src="'+esc(p.photo)+'" alt="Photo joueur">':esc(p.pseudo.slice(0,1).toUpperCase());
  $('#profileMatches').innerHTML='<div class="item"><div><b>Statistiques cumulées</b><small>'+profilePlayed+' match(s) · '+(Number(p.wins)||0)+' victoire(s) · '+(Number(p.losses)||0)+' défaite(s)</small></div><strong>'+(Number(p.wins)||0)+'/'+profilePlayed+'</strong></div>'+p.matches.map(m=>'<div class="item"><div><b>'+esc(m.a)+' vs '+esc(m.b)+'</b><small>'+ (m.date?new Date(m.date).toLocaleDateString('fr-FR'):'')+'</small></div><strong>'+m.sa+' — '+m.sb+'</strong></div>').join('');
 }catch(e){state.player=null;$('#playerProfile').hidden=true;$('#playerLoginForm').hidden=false;document.body.classList.add('access-locked');$('#accessGate').hidden=false;$('#gateMsg').textContent=e.message+' Ton accès reste mémorisé : réessaie sans recréer de compte.';}
}
window.addEventListener('mou:player-auth',async()=>{
 const msg=$('#gateMsg');
 try{
  state.playerToken=localStorage.getItem('mou_player_token')||'';
  if(!state.playerToken)throw new Error('Session joueur introuvable sur cet appareil.');
  await loadPlayerProfile();
  if(!state.player)throw new Error(msg.textContent||'Le profil n’a pas pu être chargé.');
  $('#accessGate').hidden=true;
  document.body.classList.remove('access-locked');
  $('#playerLoginForm').hidden=true;
  $('#playerProfile').hidden=false;
  tab('profile');
 }catch(error){
  console.error('Ouverture profil joueur:',error);
  if(msg)msg.textContent='Connexion validée, mais ouverture du profil impossible : '+error.message;
 }
});
$('#showSignup').onclick=()=>{$('#playerSignupForm').hidden=false;$('#playerLoginForm').hidden=true;};
$('#showLogin').onclick=()=>{$('#playerSignupForm').hidden=true;$('#playerLoginForm').hidden=false;};
$('#playerSignupForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=new FormData(e.target),msg=$('#signupMsg'),button=e.submitter;button.disabled=true;msg.textContent='Préparation de ta demande…';
 try{
  const file=f.get('photo');let photo='';
  if(file&&file.size){
   msg.textContent='Envoi de ta photo…';
   try{photo=await uploadPhoto(file);}catch(photoError){console.warn('Photo non envoyée:',photoError);msg.textContent='Photo indisponible, envoi de la demande sans photo…';}
  }
  msg.textContent='Envoi de ta demande…';
  const payload={pseudo:String(f.get('pseudo')).trim(),playerId:String(f.get('playerId')).trim(),mode:String(f.get('mode')),pin:String(f.get('pin'))};
  if(photo)payload.photo=photo;
  const r=await fetch(API_ORIGIN+'/.netlify/functions/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const out=await r.json();if(!r.ok)throw Error(out.error||'Inscription impossible');
  msg.textContent='Demande envoyée ! Attends la validation de l’administration. Tu pourras ensuite te connecter avec ton pseudo, UID et PIN.';e.target.reset();
 }catch(err){msg.textContent=err.message;}finally{button.disabled=false;}
});
$('#playerLoginForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=new FormData(e.target),msg=$('#gateMsg'),button=e.submitter;button.disabled=true;msg.textContent='Vérification…';
 try{const r=await fetch(API_ORIGIN+'/.netlify/functions/player-account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pseudo:String(f.get('pseudo')).trim(),playerId:String(f.get('playerId')).trim(),pin:String(f.get('pin'))})});const out=await r.json();if(!r.ok)throw Error(out.error||'Connexion impossible');
 state.playerToken=out.token;localStorage.setItem('mou_player_token',out.token);await loadPlayerProfile();if(state.player){tab('profile');$('#playerLoginForm').hidden=true;$('#playerProfile').hidden=false;document.body.classList.remove('access-locked');$('#accessGate').hidden=true;}
 }catch(err){msg.textContent=err.message;}finally{button.disabled=false;}
});
$('#saveProfilePhoto').addEventListener('click',async()=>{
 const file=$('#profilePhoto').files[0],msg=$('#profileMsg');if(!file){msg.textContent='Choisis une photo avant de continuer.';return;}
 try{msg.textContent='Envoi de la photo…';const photo=await uploadPhoto(file);const r=await fetch(API_ORIGIN+'/.netlify/functions/player-account',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+state.playerToken},body:JSON.stringify({photo})});const d=await r.json();if(!r.ok)throw Error(d.error||'Enregistrement impossible');msg.textContent='Photo mise à jour !';await loadPlayerProfile();}
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
$('#pinResetForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),msg=$('#pinResetMsg'),button=e.target.querySelector('button[type="submit"]');const currentPin=String(f.get('currentPin')||''),newPin=String(f.get('newPin')||'');if(!/^[0-9]{4,8}$/.test(newPin)){msg.textContent='Le nouveau PIN doit contenir 4 à 8 chiffres.';return;}button.disabled=true;msg.textContent='Mise à jour…';try{const r=await fetch(API_ORIGIN+'/.netlify/functions/player-account',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+state.playerToken},body:JSON.stringify({action:'changePin',currentPin,newPin})});const d=await r.json();if(!r.ok)throw Error(d.error||'Impossible de modifier le PIN');e.target.reset();msg.textContent='Code PIN modifié avec succès.';}catch(err){msg.textContent=err.message;}finally{button.disabled=false;}});

if(state.playerToken)loadPlayerProfile();
if(state.admin)renderAdmin();
$('#logout').onclick=()=>{state.admin=false;state.token='';sessionStorage.removeItem('mou_admin_token');$('#adminContent').hidden=true;$('#adminForm').hidden=false;$('#adminForm').reset();$('#adminMsg').textContent='Déconnecté'};
async function loadRequestsInbox(){
 const box=$('#inboxPlayers'),msg=$('#inboxMessage'),count=$('#inboxCount');
 if(msg)msg.textContent='Récupération des inscriptions…';
 try{
  const response=await fetch(API_ORIGIN+'/.netlify/functions/players?inbox='+Date.now(),{headers:state.token?{Authorization:'Bearer '+state.token}:{},cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Erreur '+response.status);
  if(!Array.isArray(data))throw Error('Format de réponse invalide');
  state.players=data;
  if(count)count.textContent=String(data.length);
  if(msg)msg.textContent=data.length+' inscription(s) enregistrée(s) — toutes les demandes, quel que soit leur statut.';
  if(box)box.innerHTML=data.map(p=>'<article class="item admin-player"><div class="admin-player-main"><div class="mini-avatar">'+avatar({name:p.pseudo,photo:p.photo})+'</div><div><b>'+esc(p.pseudo)+'</b><small>ID Free Fire : '+esc(p.playerId||'non renseigné')+'</small><small>Mode : '+esc(p.mode||'')+' · Statut : '+esc(p.status||'En attente')+'</small></div></div><div class="admin-player-controls"><select data-inbox-status="'+esc(p.id)+'"><option '+(p.status==='En attente'?'selected':'')+'>En attente</option><option '+(p.status==='Accepté'?'selected':'')+'>Accepté</option><option '+(p.status==='Refusé'?'selected':'')+'>Refusé</option><option '+(p.status==='Banni'?'selected':'')+'>Banni</option></select><button type="button" class="primary" data-inbox-save="'+esc(p.id)+'">Enregistrer</button></div></article>').join('')||'<p class="muted">Aucune inscription dans Airtable.</p>';
  box?.querySelectorAll('[data-inbox-save]').forEach(button=>button.addEventListener('click',async()=>{
   const id=button.dataset.inboxSave,select=box.querySelector('[data-inbox-status="'+CSS.escape(id)+'"]');
   button.disabled=true;
   try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'updatePlayer',id,status:select.value})});await loadRequestsInbox();await loadAll();}
   catch(error){alert('Enregistrement impossible : '+error.message);}
   finally{button.disabled=false;}
  }));
 }catch(error){if(msg)msg.textContent='Erreur de chargement : '+error.message;console.error('Boîte des demandes:',error);}
}
function setRequestsInboxOpen(open){const panel=$('#requestsInbox');if(!panel)return;panel.hidden=!open;document.body.classList.toggle('requests-inbox-open',open);if(open)loadRequestsInbox();}
$('#openRequestsInbox')?.addEventListener('click',()=>setRequestsInboxOpen($('#requestsInbox').hidden));
$('#closeRequestsInbox')?.addEventListener('click',()=>setRequestsInboxOpen(false));
$('#refreshRequestsInbox')?.addEventListener('click',loadRequestsInbox);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#requestsInbox')?.hidden)setRequestsInboxOpen(false);});

async function uploadPhoto(file){if(!CLOUDINARY_CLOUD_NAME||!CLOUDINARY_UPLOAD_PRESET)throw Error('Cloudinary non configuré dans app.js.');const fd=new FormData();fd.append('file',file);fd.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw Error(d.error?.message||'Échec de l’envoi de la photo');return d.secure_url}
async function renderAdmin(){if(!state.admin)return;$('#adminContent').hidden=false;$('#adminForm').hidden=true;const pending=state.players.filter(p=>!isAcceptedPlayer(p)&&!['refuse','refusee','banni','banned'].includes(String(p.status||'').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')));const pendingTitle=document.getElementById('pendingRequestsTitle');if(pendingTitle)pendingTitle.textContent='Demandes en attente ('+pending.length+')';$('#adminPlayers').innerHTML=(state.players.map(p=>`<article class="item admin-player"><div class="admin-player-main"><div class="mini-avatar">${avatar({name:p.pseudo,photo:p.photo})}</div><div><b>${esc(p.pseudo)}</b><small>ID : ${esc(p.playerId||'non renseigné')} · ${esc(p.mode||'')}</small><small>Statut : ${esc(p.status||'En attente')}</small></div></div><div class="admin-player-controls"><select data-status="${esc(p.id)}"><option ${p.status==='En attente'?'selected':''}>En attente</option><option ${p.status==='Accepté'?'selected':''}>Accepté</option><option ${p.status==='Refusé'?'selected':''}>Refusé</option><option ${p.status==='Banni'?'selected':''}>Banni</option></select><input class="photo-input" type="file" accept="image/*"data-photo="${esc(p.id)}"><div class="item-actions"><button class="secondary" data-save-player="${esc(p.id)}">Enregistrer</button><button class="danger" data-delete-player="${esc(p.id)}">Supprimer</button></div></div></article>`).join('')||'<p class="muted">Aucune inscription retournée par Airtable.</p>')+(state.adminLoadErrors?.length?'<p class="message">Erreur de chargement : '+esc(state.adminLoadErrors.join(' · '))+'</p>':'');
const statsForm=$('#playerStatsForm');
if(statsForm){const playerSelect=statsForm.elements.playerId;const selectedPlayerId=playerSelect.value;const options=state.players.filter(isAcceptedPlayer);playerSelect.innerHTML='<option value="">Choisir un joueur</option>'+options.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.pseudo)+' · '+(Number(p.wins)||0)+' V / '+(Number(p.losses)||0)+' D</option>').join('');if(selectedPlayerId&&options.some(p=>p.id===selectedPlayerId))playerSelect.value=selectedPlayerId;}
$('#playerNames').innerHTML=state.players.map(p=>`<option value="${esc(p.pseudo)}"></option>`).join('');
const pointsForm=$('#pointsForm');
if(pointsForm){const type=pointsForm.elements.targetType.value;const choices=type==='team'?state.teams:state.players.filter(isAcceptedPlayer);pointsForm.elements.targetId.innerHTML='<option value="">Choisir</option>'+choices.map(x=>`<option value="${esc(x.id)}">${esc(type==='team'?x.name:x.pseudo)} · ${Number(x.points)||0} pts</option>`).join('');}
const correctionForm=$('#correctionPointsForm');
if(correctionForm){const type=correctionForm.elements.targetType.value;const choices=type==='team'?state.teams:state.players.filter(isAcceptedPlayer);correctionForm.elements.targetId.innerHTML='<option value="">Choisir</option>'+choices.map(x=>`<option value="${esc(x.id)}">${esc(type==='team'?x.name:x.pseudo)} · actuel : ${Number(x.points)||0} pts</option>`).join('');}
$('#adminMatches').innerHTML=state.matches.map(m=>`<div class="item"><div><b>${esc(m.a)} ${Number(m.sa)||0} — ${Number(m.sb)||0} ${esc(m.b)}</b><small>${esc(m.date||'')}</small></div><div class="item-actions"><button class="secondary" data-edit-match="${esc(m.id)}">Modifier</button><button class="danger" data-delete-match="${esc(m.id)}">Supprimer</button></div></div>`).join('')||'<p class="muted">Aucun match enregistré.</p>';
$('#adminPlayers').querySelectorAll('[data-save-player]').forEach(b=>b.onclick=async()=>{const id=b.dataset.savePlayer;try{b.disabled=true;const status=$(`[data-status="${CSS.escape(id)}"]`).value;const file=$(`[data-photo="${CSS.escape(id)}"]`).files[0];let photo;if(file)photo=await uploadPhoto(file);await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'updatePlayer',id,status,...(photo?{photo}:{})})});await loadAll()}catch(e){alert(e.message)}finally{b.disabled=false}});
$('#adminPlayers').querySelectorAll('[data-delete-player]').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer définitivement ce joueur ?'))return;try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'deletePlayer',id:b.dataset.deletePlayer})});await loadAll()}catch(e){alert(e.message)}});
$('#adminMatches').querySelectorAll('[data-edit-match]').forEach(b=>b.onclick=()=>{const m=state.matches.find(x=>x.id===b.dataset.editMatch);if(!m)return;const f=$('#matchForm');f.recordId.value=m.id;f.a.value=m.a;f.b.value=m.b;f.sa.value=m.sa;f.sb.value=m.sb;f.mode.value=m.mode||'1 VS 1';f.date.value=m.dateInput||'';tab('admin');f.scrollIntoView({behavior:'smooth',block:'center'})});
$('#adminMatches').querySelectorAll('[data-delete-match]').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer ce résultat ?'))return;try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'deleteMatch',id:b.dataset.deleteMatch})});await loadAll()}catch(e){alert(e.message)}})}
const playerStatsForm=$('#playerStatsForm');
if(playerStatsForm){
 const updateLossPreview=()=>{const played=Number(playerStatsForm.elements.played.value)||0;const wins=Number(playerStatsForm.elements.wins.value)||0;$('#playerStatsLosses').textContent='Défaites : '+Math.max(0,played-wins);};
 playerStatsForm.addEventListener('change',e=>{if(e.target.name==='playerId'){const p=state.players.find(x=>x.id===e.target.value);if(p){playerStatsForm.elements.played.value=(Number(p.wins)||0)+(Number(p.losses)||0);playerStatsForm.elements.wins.value=Number(p.wins)||0;updateLossPreview();}}else if(['played','wins'].includes(e.target.name))updateLossPreview();});
 playerStatsForm.addEventListener('input',e=>{if(['played','wins'].includes(e.target.name))updateLossPreview();});
 playerStatsForm.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(playerStatsForm),msg=$('#playerStatsMsg');const played=Number(f.get('played')),wins=Number(f.get('wins'));if(!Number.isSafeInteger(played)||!Number.isSafeInteger(wins)||played<0||wins<0||wins>played){msg.textContent='Vérifie les valeurs : les victoires ne peuvent pas dépasser les matchs joués.';return;}msg.textContent='Enregistrement…';try{const playerId=String(f.get('playerId')||'');if(!playerId)throw new Error('Choisis un joueur avant l’enregistrement.');const saved=await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'setPlayerStats',id:playerId,played,wins})});if(!saved.success)throw new Error(saved.error||'Enregistrement non confirmé.');msg.textContent='Statistiques enregistrées et vérifiées dans Airtable.';await loadAll();const p=state.players.find(x=>x.id===String(f.get('playerId')));if(p){playerStatsForm.elements.playerId.value=p.id;playerStatsForm.elements.played.value=(Number(p.wins)||0)+(Number(p.losses)||0);playerStatsForm.elements.wins.value=Number(p.wins)||0;updateLossPreview();}}catch(err){msg.textContent='Erreur : '+err.message;}});
}
$('#pointsForm').addEventListener('change',e=>{if(e.target.name==='targetType'){const type=e.target.value;const choices=type==='team'?state.teams:state.players.filter(isAcceptedPlayer);e.target.form.elements.targetId.innerHTML='<option value="">Choisir</option>'+choices.map(x=>`<option value="${esc(x.id)}">${esc(type==='team'?x.name:x.pseudo)} · ${Number(x.points)||0} pts</option>`).join('');}});
$('#pointsForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),msg=$('#pointsMsg');msg.textContent='Ajout des points…';try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'addPoints',targetType:String(f.get('targetType')),id:String(f.get('targetId')),points:Number(f.get('points'))})});msg.textContent='Points ajoutés avec succès !';e.target.elements.points.value='';await loadAll()}catch(x){msg.textContent='Erreur : '+x.message}});
$('#correctionPointsForm').addEventListener('change',e=>{if(e.target.name==='targetType'){const type=e.target.value;const choices=type==='team'?state.teams:state.players.filter(isAcceptedPlayer);e.target.form.elements.targetId.innerHTML='<option value="">Choisir</option>'+choices.map(x=>`<option value="${esc(x.id)}">${esc(type==='team'?x.name:x.pseudo)} · actuel : ${Number(x.points)||0} pts</option>`).join('');}});
$('#correctionPointsForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),msg=$('#correctionPointsMsg');const points=Number(f.get('points'));if(!Number.isSafeInteger(points)||points<0){msg.textContent='Indique un total entier supérieur ou égal à 0.';return;}if(!confirm('Remplacer le total actuel par '+points+' points ?'))return;msg.textContent='Correction en cours…';try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'setPoints',targetType:String(f.get('targetType')),id:String(f.get('targetId')),points})});msg.textContent='Total de points corrigé avec succès.';await loadAll();const type=correctionForm.elements.targetType.value;const choices=type==='team'?state.teams:state.players.filter(isAcceptedPlayer);correctionForm.elements.targetId.innerHTML='<option value="">Choisir</option>'+choices.map(x=>`<option value="${esc(x.id)}">${esc(type==='team'?x.name:x.pseudo)} · actuel : ${Number(x.points)||0} pts</option>`).join('');}catch(x){msg.textContent='Erreur : '+x.message}});
$('#matchForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),msg=$('#matchMsg');msg.textContent='Enregistrement…';try{await api('/.netlify/functions/admin-data',{method:'POST',body:JSON.stringify({action:'saveMatch',id:f.get('recordId')||'',a:String(f.get('a')).trim(),b:String(f.get('b')).trim(),sa:Number(f.get('sa')),sb:Number(f.get('sb')),mode:String(f.get('mode')),date:String(f.get('date')||'')})});msg.textContent='Résultat enregistré et partagé.';e.target.reset();await loadAll()}catch(x){msg.textContent=x.message}});
$('#resetMatch').onclick=()=>$('#matchForm').reset();
if(state.token){state.admin=true;$('#adminForm').hidden=true;$('#adminContent').hidden=false;loadAll();}
let publicRefreshBusy=false;
async function refreshPublicData(){
 if(publicRefreshBusy||document.hidden)return;
 const active=document.activeElement;
 if(active&&active.matches('input,textarea,select,[contenteditable="true"]'))return;
 publicRefreshBusy=true;
 try{await loadAll()}finally{publicRefreshBusy=false}
}
window.addEventListener('focus',refreshPublicData);
window.addEventListener('pageshow',refreshPublicData);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPublicData()});
setInterval(refreshPublicData,60000);

// Restore an authenticated player session after the WebView/app is reopened.
(async function restorePlayerSession(){
 if(!state.playerToken)return;
 try{
  await loadPlayerProfile();
  if(!state.player)return;
  document.body.classList.remove('access-locked');
  $('#accessGate').hidden=true;
  $('#playerLoginForm').hidden=true;
  $('#playerProfile').hidden=false;
  const destination=getSavedPage();
  tab(destination==='admin'&&!state.admin?'home':destination,false);
 }catch(error){
  console.error('Session restoration failed:',error);
 }
})();

