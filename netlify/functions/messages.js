const crypto=require('crypto');
const {airtable,verifyPlayer}=require('./auth');
const TABLE='tblvtmlhTFkVdsX0C',REL='tblQoAGcQhii58Hwe',PLAYERS='tblz0rJpaQBpafBN2';
const F={id:'fldBfRkQQLeYnV9ti',key:'fldaRDVwnflWRAR0L',from:'fldV3hCY47mznFBfu',fromName:'fldO6V4B8zA2QGNfW',to:'fld1Kaj1hVyHDPeb0',toName:'fld6MjPNGRqATQDmD',content:'fldOMcUM8kSHFz3ML',created:'fldbLOwXN5hSzieoD',read:'fldtXgb1lWgzNBc0E',status:'fldiPm5xI7CBgEq5q'};
const R={from:'fldV969gNKryDledy',to:'fldbn9UWoDNNZPpS6',status:'fldV1k5nClaf3CT9M'};
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
const body=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
async function all(table){let rows=[],offset;do{const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true'});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);rows.push(...(d.records||[]));offset=d.offset;}while(offset&&rows.length<1000);return rows;}
async function accepted(a,b){const rows=await all(REL);return rows.some(r=>r.fields?.[R.status]==='Acceptée'&&((r.fields[R.from]===a&&r.fields[R.to]===b)||(r.fields[R.to]===a&&r.fields[R.from]===b)));}
exports.handler=async event=>{
 const me=verifyPlayer(event);if(!me)return out(401,{error:'Connecte-toi pour accéder à la messagerie.'});
 const b=body(event),method=event.httpMethod||'GET';
 try{
  if(method==='GET'){
   const withId=String(event.queryStringParameters?.with||'');
   if(withId&&withId!==me.id&&!await accepted(me.id,withId))return out(403,{error:'La messagerie privée est réservée aux amis acceptés.'});
   const rows=await all(TABLE),visible=rows.filter(r=>{const f=r.fields||{};return (f[F.from]===me.id||f[F.to]===me.id)&&(!withId||f[F.from]===withId||f[F.to]===withId)&&f[F.status]!=='Supprimé';});
   return out(200,{messages:visible.sort((a,b)=>String(a.fields?.[F.created]||'').localeCompare(String(b.fields?.[F.created]||''))).map(r=>{const f=r.fields||{};return{id:r.id,messageId:f[F.id],senderId:f[F.from],senderPseudo:f[F.fromName],recipientId:f[F.to],recipientPseudo:f[F.toName],content:f[F.content],created:f[F.created],readAt:f[F.read]||'',mine:f[F.from]===me.id};})});
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
  return out(201,{success:true,id:saved.records?.[0]?.id,message:{id,senderId:me.id,senderPseudo,recipientId:target,recipientPseudo,content,created,mine:true}});
 }catch(e){return out(500,{error:e.message||'Erreur messagerie.'});}
};