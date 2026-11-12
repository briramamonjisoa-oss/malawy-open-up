(()=> {
 'use strict';
 const $=id=>document.getElementById(id);
 function auth(){const token=sessionStorage.getItem('mou_admin_token')||'';return token?{Authorization:'Bearer '+token}:{};}
 function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
 async function showInbox(){
  const panel=$('requestsInbox'),box=$('inboxPlayers'),msg=$('inboxMessage'),count=$('inboxCount');
  if(!panel||!box||!msg)return;
  panel.hidden=false;msg.textContent='Chargement des demandes…';box.replaceChildren();
  try{
   const response=await fetch('/.netlify/functions/players?inbox='+Date.now(),{headers:auth(),cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Erreur HTTP '+response.status);
   if(!Array.isArray(data))throw new Error('La réponse du serveur n’est pas une liste.');
   if(count)count.textContent=String(data.length);
   msg.textContent=data.length+' demande(s) trouvée(s).';
   if(!data.length){box.append(node('p','muted','Aucune inscription retournée par le serveur.'));return;}
   data.forEach(p=>{
    const card=node('article','item admin-player'),main=node('div','admin-player-main'),info=node('div','');
    info.append(node('b','',p.pseudo||'Joueur'),node('small','', 'ID Free Fire : '+(p.playerId||'non renseigné')),node('small','', 'Mode : '+(p.mode||'')+' · Statut : '+(p.status||'En attente')));
    main.append(node('div','mini-avatar',(p.pseudo||'J').slice(0,1).toUpperCase()),info);
    const controls=node('div','admin-player-controls'),select=node('select','');
    ['En attente','Accepté','Refusé','Banni'].forEach(status=>{const opt=node('option','',status);opt.value=status;opt.selected=status===(p.status||'En attente');select.append(opt);});
    const save=node('button','primary','Enregistrer');save.type='button';
    save.addEventListener('click',async()=>{save.disabled=true;try{const r=await fetch('/.netlify/functions/admin-data',{method:'POST',headers:{'Content-Type':'application/json',...auth()},body:JSON.stringify({action:'updatePlayer',id:p.id,status:select.value})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Erreur HTTP '+r.status);await showInbox();}catch(e){alert('Impossible d’enregistrer : '+e.message)}finally{save.disabled=false}});
    controls.append(select,save);card.append(main,controls);box.append(card);
   });
  }catch(e){msg.textContent='Erreur de chargement : '+e.message;}
 }
 document.addEventListener('click',e=>{
  const open=e.target.closest('#openRequestsInbox');
  if(open){e.preventDefault();const panel=$('requestsInbox');if(panel){if(panel.hidden)showInbox();else panel.hidden=true;}}
  if(e.target.closest('#refreshRequestsInbox')){e.preventDefault();showInbox();}
 });
 window.addEventListener('mou:admin-auth',()=>{const count=$('inboxCount');if(count)count.textContent='…';});
})();