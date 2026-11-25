const crypto=require('crypto');
const {airtable,verifyPlayer}=require('./auth');
const {queuePlayerEventNotification,queuePlayersEventNotification}=require('./notifications');
const TABLE='tblvtmlhTFkVdsX0C',REL='tblQoAGcQhii58Hwe',PLAYERS='tblz0rJpaQBpafBN2',GROUPS='tblOf7CoOFBKpIueo';
const F={id:'fldBfRkQQLeYnV9ti',key:'fldaRDVwnflWRAR0L',from:'fldV3hCY47mznFBfu',fromName:'fldO6V4B8zA2QGNfW',to:'fld1Kaj1hVyHDPeb0',toName:'fld6MjPNGRqATQDmD',content:'fldOMcUM8kSHFz3ML',created:'fldbLOwXN5hSzieoD',read:'fldtXgb1lWgzNBc0E',status:'fldiPm5xI7CBgEq5q'};
const R={from:'fldV969gNKryDledy',to:'fldbn9UWoDNNZPpS6',status:'fldV1k5nClaf3CT9M'};
const P={pseudo:'fldaNsxza3T3krjfr',profile:'fldJAultgWl4cZfCW',status:'fldmc3ktn1we8phLq'};
const G={guildId:'fldfLYjJEme1kBMx0',name:'fldr1iPGh1XKgvqMU',status:'fldBZBT3Vm1aexeXD'};
const approved=v=>['accepte','acceptee','accepted','valide','validee','approved'].includes(String(v||'').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,''));
async function verifyGuildMember(playerId,guildId){
 if(!/^[0-9]{5,24}$/.test(guildId))return null;
 const [player,groups]=await Promise.all([airtable(PLAYERS+'/'+encodeURIComponent(playerId)+'?returnFieldsByFieldId=true'),find(GROUPS,`AND({ID guilde}=${value(guildId)},{Statut}="Actif")`)]);
 const pf=player.fields||{};if(!approved(pf[P.status]))return null;
 let profile={};try{profile=JSON.parse(pf[P.profile]||'{}')}catch{}
 if(String(profile.clanBasicInfo?.clanId||'')!==guildId)return null;
 const group=groups.find(row=>String(row.fields?.[G.guildId]||'')===guildId&&row.fields?.[G.status]==='Actif');
 if(!group)return null;
 return {groupId:guildId,groupName:String(group.fields?.[G.name]||'Groupe de guilde'),pseudo:String(pf[P.pseudo]||profile.basicInfo?.nickname||'Joueur')};
}
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
const body=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
async function all(table){let rows=[],offset;do{const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true'});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);rows.push(...(d.records||[]));offset=d.offset;}while(offset&&rows.length<1000);return rows;}
const value=v=>'"'+String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
async function find(table,formula){let rows=[],offset;do{const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true',filterByFormula:formula});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);rows.push(...(d.records||[]));offset=d.offset;}while(offset&&rows.length<1000);return rows;}
async function guildMemberIds(guildId) {
 const players=await all(PLAYERS),members=[];
 for(const row of players){
  const f=row.fields||{};
  if(!approved(f[P.status]))continue;
  let profile={};try{profile=JSON.parse(f[P.profile]||'{}')}catch{}
  if(String(profile.clanBasicInfo?.clanId||'')===guildId)members.push({id:row.id,pseudo:String(f[P.pseudo]||profile.basicInfo?.nickname||'Joueur')});
 }
 return members;
}
async function accepted(a,b){const rows=await find(REL,`AND({Statut}="Acceptée",OR(AND({${R.from}}=${value(a)},{${R.to}}=${value(b)}),AND({${R.from}}=${value(b)},{${R.to}}=${value(a)})))`);return rows.length>0;}
exports.handler=async event=>{
 const me=verifyPlayer(event);if(!me)return out(401,{error:'Connecte-toi pour accéder à la messagerie.'});
 const b=body(event),method=event.httpMethod||'GET';
 try{
  if(method==='GET'){
   const groupId=String(event.queryStringParameters?.group||'');
   if(groupId){
    const membership=await verifyGuildMember(me.id,groupId);
    if(!membership)return out(403,{error:'Tu dois appartenir à cette guilde et son groupe officiel doit être actif.'});
    const key='group:'+groupId,rows=await find(TABLE,`AND({Conversation Key}=${value(key)},{Statut}!="Supprimé")`);
    const visible=rows.filter(r=>r.fields?.[F.key]===key&&r.fields?.[F.status]!=='Supprimé');
    return out(200,{group:{id:membership.groupId,name:membership.groupName},messages:visible.sort((a,b)=>String(a.fields?.[F.created]||'').localeCompare(String(b.fields?.[F.created]||''))).map(r=>{const f=r.fields||{};return{id:r.id,messageId:f[F.id],senderId:f[F.from],senderPseudo:f[F.fromName],recipientId:key,recipientPseudo:membership.groupName,content:f[F.content],created:f[F.created],readAt:'',mine:f[F.from]===me.id};})});
   }

   const withId=String(event.queryStringParameters?.with||'');
   if(withId&&withId!==me.id&&!await accepted(me.id,withId))return out(403,{error:'La messagerie privée est réservée aux amis acceptés.'});
   const pair=withId?`OR(AND({Expéditeur record ID}=${value(me.id)},{Destinataire record ID}=${value(withId)}),AND({Expéditeur record ID}=${value(withId)},{Destinataire record ID}=${value(me.id)}))`:`OR({Expéditeur record ID}=${value(me.id)},{Destinataire record ID}=${value(me.id)})`;const rows=await find(TABLE,`AND({Statut}!="Supprimé",NOT(LEFT({Conversation Key},6)="group:"),${pair})`),visible=rows;
   if(withId){
    const unread=visible.filter(r=>r.fields?.[F.to]===me.id&&!r.fields?.[F.read]);
    const readAt=new Date().toISOString();for(let i=0;i<Math.min(unread.length,20);i+=10){const batch=unread.slice(i,i+10);await airtable(encodeURIComponent(TABLE),{method:'PATCH',body:JSON.stringify({records:batch.map(r=>({id:r.id,fields:{[F.read]:readAt}}))})});}
   }
   return out(200,{messages:visible.sort((a,b)=>String(a.fields?.[F.created]||'').localeCompare(String(b.fields?.[F.created]||''))).map(r=>{const f=r.fields||{};return{id:r.id,messageId:f[F.id],senderId:f[F.from],senderPseudo:f[F.fromName],recipientId:f[F.to],recipientPseudo:f[F.toName],content:f[F.content],created:f[F.created],readAt:withId&&f[F.to]===me.id&&!f[F.read]?new Date().toISOString():(f[F.read]||''),mine:f[F.from]===me.id};})});
  }
  if(method==='POST'&&b.action==='sendGroup'){
   const groupId=String(b.groupId||''),content=String(b.content||'').trim();
   if(!content||content.length>3000)return out(400,{error:'Le message doit contenir entre 1 et 3 000 caractères.'});
   const membership=await verifyGuildMember(me.id,groupId);
   if(!membership)return out(403,{error:'Tu dois appartenir à cette guilde et son groupe officiel doit être actif.'});
   const id='msg_'+crypto.randomUUID(),created=new Date().toISOString(),key='group:'+groupId;
   const fields={[F.id]:id,[F.key]:key,[F.from]:me.id,[F.fromName]:membership.pseudo,[F.to]:key,[F.toName]:membership.groupName,[F.content]:content,[F.created]:created,[F.status]:'Envoyé'};
   const saved=await airtable(encodeURIComponent(TABLE),{method:'POST',body:JSON.stringify({records:[{fields}]})});
   try{
    const recipients=(await guildMemberIds(groupId)).filter(player=>player.id!==me.id);
    await queuePlayersEventNotification(recipients.map(player=>player.id),'Nouveau message dans ta guilde',membership.pseudo+' a écrit dans le groupe '+membership.groupName+'.','/#messages','guild-message:'+id);
   }catch(error){console.warn('Notifications du groupe de guilde non envoyées:',error.message);}
   return out(201,{success:true,id:saved.records?.[0]?.id,message:{id,senderId:me.id,senderPseudo:membership.pseudo,recipientId:key,recipientPseudo:membership.groupName,content,created,mine:true}});
  }
  if(method!=='POST'||b.action!=='send')return out(400,{error:'Action inconnue.'});
  const target=String(b.targetId||''),content=String(b.content||'').trim();
  if(!target||target===me.id)return out(400,{error:'Destinataire invalide.'});
  if(!content||content.length>1000)return out(400,{error:'Le message doit contenir entre 1 et 1 000 caractères.'});
  if(!await accepted(me.id,target))return out(403,{error:'Tu dois être ami avec ce joueur pour lui envoyer un message privé.'});
  const [sender,recipient]=await Promise.all([airtable(PLAYERS+'/'+encodeURIComponent(me.id)+'?returnFieldsByFieldId=true'),airtable(PLAYERS+'/'+encodeURIComponent(target)+'?returnFieldsByFieldId=true')]);
  const senderPseudo=String(sender.fields?.fldaNsxza3T3krjfr||me.pseudo||'Joueur'),recipientPseudo=String(recipient.fields?.fldaNsxza3T3krjfr||'Joueur');
  const id='msg_'+crypto.randomUUID(),created=new Date().toISOString(),key=[me.id,target].sort().join('_');
  const fields={[F.id]:id,[F.key]:key,[F.from]:me.id,[F.fromName]:senderPseudo,[F.to]:target,[F.toName]:recipientPseudo,[F.content]:content,[F.created]:created,[F.status]:'Envoyé'};
  const saved=await airtable(encodeURIComponent(TABLE),{method:'POST',body:JSON.stringify({records:[{fields}]})});
  try{await queuePlayerEventNotification(target,'Nouveau message',senderPseudo+' t’a envoyé un message.','/#messages','message:'+id+':'+target);}catch(error){console.warn('Notification de message non envoyée:',error.message);}
  return out(201,{success:true,id:saved.records?.[0]?.id,message:{id,senderId:me.id,senderPseudo,recipientId:target,recipientPseudo,content,created,mine:true}});
 }catch(e){return out(500,{error:e.message||'Erreur messagerie.'});}
};