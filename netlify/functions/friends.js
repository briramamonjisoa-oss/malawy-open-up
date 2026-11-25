const {airtable,verifyPlayer}=require('./auth');
const {queuePlayerEventNotification}=require('./notifications');
const PLAYERS='tblz0rJpaQBpafBN2';
const RELATIONS='tblQoAGcQhii58Hwe';
const F={pseudo:'fldaNsxza3T3krjfr',status:'fldmc3ktn1we8phLq',photo:'flds2WZeeSrLJZVOC',lastSeen:'fldnilxQoLEsLNiH2',circleSeen:'fld6FLW3XcwyuqgRo'};
const R={key:'fldv1Zlsgkl0YQDHR',from:'fldV969gNKryDledy',fromName:'fldZnm4SNGHBE04cz',to:'fldbn9UWoDNNZPpS6',toName:'fldsPztDNdzkcBdh6',status:'fldV1k5nClaf3CT9M',created:'fldXjv0WpwBUiBFW9',updated:'fldh9cgvKYYYfHnGh'};
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
const body=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
const tableCache = new Map();
const tableInflight = new Map();
async function all(table,force=false){
 const cached=tableCache.get(table);
 const ttl=table===RELATIONS?2500:30000;
 if(!force&&cached&&Date.now()-cached.time<ttl)return cached.rows;
 if(tableInflight.has(table))return tableInflight.get(table);
 const task=(async()=>{let rows=[],offset;do{const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true'});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);rows.push(...(d.records||[]));offset=d.offset;}while(offset&&rows.length<1000);tableCache.set(table,{time:Date.now(),rows});return rows;})();
 tableInflight.set(table,task);
 try{return await task;}finally{tableInflight.delete(table);}
}
const fields=r=>r.fields||{};
exports.handler=async event=>{
 const me=verifyPlayer(event);if(!me)return out(401,{error:'Connecte-toi avec ton compte joueur.'});
 const method=event.httpMethod||'GET';const b=body(event);const now=new Date().toISOString();
 try{
  const mine=await airtable('Inscriptions/'+encodeURIComponent(me.id)+'?returnFieldsByFieldId=true');
  const myPseudo=String(fields(mine)[F.pseudo]||me.pseudo||'Joueur').slice(0,32);
  if(method==='GET'){
   const action=event.queryStringParameters?.action||'list';
   if(action==='suggestions'){
    const [players,allRelations]=await Promise.all([all(PLAYERS),all(RELATIONS)]);
    const accepted=allRelations.filter(r=>fields(r)[R.status]==='Acceptée');
    const myFriends=new Set();
    const excluded=new Set();
    for(const r of allRelations){const f=fields(r);if(f[R.from]===me.id)excluded.add(f[R.to]);if(f[R.to]===me.id)excluded.add(f[R.from]);}
    for(const r of accepted){const f=fields(r);if(f[R.from]===me.id)myFriends.add(f[R.to]);if(f[R.to]===me.id)myFriends.add(f[R.from]);}
    const friendSets=new Map();
    for(const r of accepted){const f=fields(r),a=f[R.from],z=f[R.to];if(!friendSets.has(a))friendSets.set(a,new Set());if(!friendSets.has(z))friendSets.set(z,new Set());friendSets.get(a).add(z);friendSets.get(z).add(a);}
    const suggestions=players.filter(p=>p.id!==me.id&&!excluded.has(p.id)&&String(fields(p)[F.status]||'').toLocaleLowerCase('fr').includes('accept'))
     .map(p=>{const f=fields(p),mutual=[...(friendSets.get(p.id)||[])].filter(id=>myFriends.has(id)).length,score=mutual*10;return{id:p.id,pseudo:f[F.pseudo]||'Joueur',photo:f[F.photo]||'',mutualFriends:mutual,reason:mutual?mutual+' ami(s) en commun':'À découvrir dans la communauté',score};})
     .sort((a,b)=>b.score-a.score||a.pseudo.localeCompare(b.pseudo,'fr')).slice(0,12);
    return out(200,{players:suggestions});
   }
   if(action==='search'){
    const q=String(event.queryStringParameters?.q||'').trim().toLocaleLowerCase('fr');
    if(q.length<2)return out(200,{players:[]});
    const rows=await all(PLAYERS);
    const relations=await all(RELATIONS);
    const players=rows.filter(x=>x.id!==me.id&&String(fields(x)[F.status]||'').toLocaleLowerCase('fr').includes('accept')&&String(fields(x)[F.pseudo]||'').toLocaleLowerCase('fr').includes(q)).slice(0,20).map(x=>({id:x.id,pseudo:fields(x)[F.pseudo]||'Joueur',photo:fields(x)[F.photo]||'',relation:relations.find(r=>{const f=fields(r);return f[R.key]===[me.id,x.id].sort().join('_')})?.fields?.[R.status]||'Aucune'}));
    return out(200,{players});
   }
   const rows=await all(RELATIONS,event.queryStringParameters?.fresh==='1');
   const mineRelations=rows.filter(x=>fields(x)[R.from]===me.id||fields(x)[R.to]===me.id);
   const acceptedIds=mineRelations.filter(x=>fields(x)[R.status]==='Acceptée').map(x=>fields(x)[R.from]===me.id?fields(x)[R.to]:fields(x)[R.from]);
   const playerRows=acceptedIds.length?await all(PLAYERS):[];
   const presence=new Map(playerRows.filter(p=>acceptedIds.includes(p.id)).map(p=>{const stamp=fields(p)[F.lastSeen]||'';const age=stamp?Date.now()-Date.parse(stamp):Infinity;const circleStamp=fields(p)[F.circleSeen]||'';const circleAge=circleStamp?Date.now()-Date.parse(circleStamp):Infinity;return[p.id,{online:Number.isFinite(age)&&age>=-60000&&age<90000,lastSeen:stamp||null,circleOnline:Number.isFinite(circleAge)&&circleAge>=-60000&&circleAge<90000,circleLastSeen:circleStamp||null}];}));
   return out(200,{relations:mineRelations.map(x=>{const f=fields(x),outgoing=f[R.from]===me.id,otherId=outgoing?f[R.to]:f[R.from],p=presence.get(otherId)||{online:false,lastSeen:null,circleOnline:false,circleLastSeen:null};return{id:x.id,otherId,pseudo:outgoing?f[R.toName]:f[R.fromName],status:f[R.status],direction:outgoing?'sent':'received',created:f[R.created]||'',online:f[R.status]==='Acceptée'?p.online:false,lastSeen:f[R.status]==='Acceptée'?p.lastSeen:null,circleOnline:f[R.status]==='Acceptée'?p.circleOnline:false,circleLastSeen:f[R.status]==='Acceptée'?p.circleLastSeen:null};})});
  }
  if(method!=='POST')return out(405,{error:'Méthode non autorisée.'});
  const action=String(b.action||'');
  if(action==='circle-presence'){
   await airtable('Inscriptions/'+encodeURIComponent(me.id),{method:'PATCH',body:JSON.stringify({fields:{[F.circleSeen]:now}})});
   tableCache.delete(PLAYERS);
   return out(200,{success:true,circleOnline:true,lastSeen:now});
  }
  if(action==='presence'){
   await airtable('Inscriptions/'+encodeURIComponent(me.id),{method:'PATCH',body:JSON.stringify({fields:{[F.lastSeen]:now}})});
   tableCache.delete(PLAYERS);
   return out(200,{success:true,online:true,lastSeen:now});
  }
  if(action==='request'){
   const target=String(b.targetId||'');if(!target||target===me.id)return out(400,{error:'Joueur invalide.'});
   const targetRecord=await airtable('Inscriptions/'+encodeURIComponent(target)+'?returnFieldsByFieldId=true');
   const targetFields=fields(targetRecord);if(!targetFields[F.pseudo]||!String(targetFields[F.status]||'').toLocaleLowerCase('fr').includes('accept'))return out(404,{error:'Joueur introuvable ou compte non actif.'});
   const key=[me.id,target].sort().join('_'),rows=await all(RELATIONS,true),existing=rows.find(x=>fields(x)[R.key]===key);
   if(existing){const st=fields(existing)[R.status];if(st==='Acceptée')return out(409,{error:'Vous êtes déjà amis.'});if(st==='En attente')return out(200,{success:true,alreadyPending:true});if(st==='Bloquée')return out(403,{error:'Cette relation est bloquée.'});await airtable(RELATIONS+'/'+existing.id,{method:'PATCH',body:JSON.stringify({fields:{[R.from]:me.id,[R.fromName]:myPseudo,[R.to]:target,[R.toName]:String(targetFields[F.pseudo]),[R.status]:'En attente',[R.updated]:now}})});}
   else await airtable(encodeURIComponent(RELATIONS),{method:'POST',body:JSON.stringify({records:[{fields:{[R.key]:key,[R.from]:me.id,[R.fromName]:myPseudo,[R.to]:target,[R.toName]:String(targetFields[F.pseudo]),[R.status]:'En attente',[R.created]:now,[R.updated]:now}}]})});
   tableCache.delete(RELATIONS);
   try{await queuePlayerEventNotification(target,'Nouvelle demande d’ami',myPseudo+' souhaite devenir ton ami.','/#profile','friend-request:'+key+':'+now);}catch(error){console.warn('Notification de demande d’ami non envoyée:',error.message);}
   return out(201,{success:true,status:'En attente'});
  }
  if(action==='respond'){
   const id=String(b.relationId||''),decision=String(b.decision||'');if(!id||!['Acceptée','Refusée'].includes(decision))return out(400,{error:'Réponse invalide.'});
   const rec=await airtable(encodeURIComponent(RELATIONS)+'/'+encodeURIComponent(id)+'?returnFieldsByFieldId=true'),f=fields(rec);
   if(f[R.to]!==me.id||f[R.status]!=='En attente')return out(403,{error:'Cette demande ne peut pas être traitée.'});
   await airtable(encodeURIComponent(RELATIONS)+'/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({fields:{[R.status]:decision,[R.updated]:now}})});
   tableCache.delete(RELATIONS);
   if(decision==='Acceptée'){
    try{await queuePlayerEventNotification(f[R.from],'Demande d’ami acceptée',myPseudo+' a accepté ta demande d’ami.','/#profile','friend-accepted:'+id);}catch(error){console.warn('Notification d’acceptation non envoyée:',error.message);}
   }
   return out(200,{success:true});
  }
  if(action==='remove'){
   const id=String(b.relationId||'');if(!id)return out(400,{error:'Relation introuvable.'});
   const rec=await airtable(encodeURIComponent(RELATIONS)+'/'+encodeURIComponent(id)+'?returnFieldsByFieldId=true'),f=fields(rec);
   if(f[R.from]!==me.id&&f[R.to]!==me.id)return out(403,{error:'Action non autorisée.'});
   await airtable(encodeURIComponent(RELATIONS)+'/'+encodeURIComponent(id),{method:'DELETE'});
   tableCache.delete(RELATIONS);
   return out(200,{success:true});
  }
  return out(400,{error:'Action inconnue.'});
 }catch(e){const status=e.status===429?429:500;return out(status,{error:status===429?'Le service est momentanément très sollicité. Réessaie dans quelques secondes.':e.message||'Erreur serveur.'});}
};
