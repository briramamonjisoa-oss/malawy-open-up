const {airtable}=require('./auth');
exports.handler=async(event)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'no-store, no-cache, must-revalidate, proxy-revalidate','Pragma':'no-cache','Expires':'0'};
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 try{let records=[],offset;do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable(`Inscriptions?${q}`);records.push(...(d.records||[]));offset=d.offset}while(offset);
 const signupRecords=await (async()=>{let all=[],off;do{const q=new URLSearchParams({pageSize:'100'});if(off)q.set('offset',off);const d=await airtable(encodeURIComponent('Inscriptions tournois')+'?'+q);all.push(...(d.records||[]));off=d.offset}while(off);return all})();
 const participantUIDs=new Set(),participantNames=new Set();
 for(const signup of signupRecords){const f=signup.fields||{};if(f.Statut==='Refusée')continue;for(let i=1;i<=4;i++){const uid=String(f['ID joueur '+i]||'').trim(),name=String(f['Joueur '+i]||'').trim();if(uid)participantUIDs.add(uid);if(name)participantNames.add(name.toLocaleLowerCase('fr'));}for(let i=1;i<=2;i++){const uid=String(f['ID remplaçant '+i]||'').trim(),name=String(f['Remplaçant '+i]||'').trim();if(uid)participantUIDs.add(uid);if(name)participantNames.add(name.toLocaleLowerCase('fr'));}}
 const players=records.map(r=>{const rawStatus=String(r.fields['Statut inscription']||'En attente').trim();const normalized=rawStatus.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');const status=['accepte','acceptee','accepted','valide','validee','approved'].includes(normalized)?'Accepté':rawStatus;return{id:r.id,pseudo:r.fields['Pseudo Free Fire']||'Joueur',playerId:r.fields['ID Free Fire']||'',mode:r.fields['Mode de combat']||'Inscrit',status,points:Number(r.fields.Points)||0,wins:Number(r.fields.Victoires)||0,losses:Number(r.fields.Défaites)||0,photo:r.fields.Photo||'',participant:participantUIDs.has(String(r.fields['ID Free Fire']||'').trim())||participantNames.has(String(r.fields['Pseudo Free Fire']||'').trim().toLocaleLowerCase('fr'))}});
 return{statusCode:200,headers,body:JSON.stringify(players)};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message})}}
};
