const {airtable,verifyPlayer}=require('./auth');
const TABLE='tblurcTUHZq4hgYVo',REL='tblQoAGcQhii58Hwe';
const F={id:'flddFspJ786tqtN5z',from:'fldnHZSKMrIxwsqFT',to:'fldACeLLXwsW4cTRo',type:'fldjGQz0LpHUWZ6Ed',status:'fldNhIfDytJpn2cbx',offer:'fld247bpN6s92tPv0',answer:'fldcsD34bwK3PQPH2',ice:'fldpzLBigCtIu4WuD',created:'fldcssy4XAJuiwGIj',expires:'fld1iyMQtX6iCbDrW',updated:'fldBDlaQ7KO38XHFu'};
const R={from:'fldV969gNKryDledy',to:'fldbn9UWoDNNZPpS6',status:'fldV1k5nClaf3CT9M'};
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS'},body:JSON.stringify(data)});
const body=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
const val=v=>'"'+String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
async function find(table,formula){const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true',filterByFormula:formula});const d=await airtable(encodeURIComponent(table)+'?'+q);return d.records||[];}
async function friend(a,b){if(!a||!b||a===b)return false;const rows=await find(REL,`AND({Statut}="Acceptée",OR(AND({Joueur demandeur ID}=${val(a)},{Joueur destinataire ID}=${val(b)}),AND({Joueur demandeur ID}=${val(b)},{Joueur destinataire ID}=${val(a)})))`);return rows.length>0;}
const publicIce=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}];
function iceServers(){const env=globalThis.__MOU_ENV||process.env;const urls=String(env.TURN_URLS||'').split(',').map(x=>x.trim()).filter(Boolean);if(!urls.length)return publicIce;return [...publicIce,{urls,username:String(env.TURN_USERNAME||''),credential:String(env.TURN_CREDENTIAL||'')}];}
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return out(200,{});
 const me=verifyPlayer(event);if(!me)return out(401,{error:'Connecte-toi pour utiliser les appels.'});
 const b=body(event),method=event.httpMethod||'GET';
 try{
  if(method==='POST'&&b.action==='start'){
   const target=String(b.targetId||''),type=String(b.type||'audio');
   if(!['audio','video'].includes(type))return out(400,{error:'Type d’appel invalide.'});
   if(!await friend(me.id,target))return out(403,{error:'Les appels sont réservés aux amis acceptés.'});
   const existing=await find(TABLE,`AND({Appelant record ID}=${val(me.id)},{Destinataire record ID}=${val(target)},{Statut}="ringing")`);
   if(existing.some(x=>Date.parse(x.fields?.[F.expires]||'')>Date.now()))return out(409,{error:'Un appel est déjà en cours avec ce joueur.'});
   const id='call_'+require('crypto').randomUUID(),now=new Date(),expires=new Date(now.getTime()+2*60*60*1000).toISOString();
   const rec=await airtable(encodeURIComponent(TABLE),{method:'POST',body:JSON.stringify({records:[{fields:{[F.id]:id,[F.from]:me.id,[F.to]:target,[F.type]:type,[F.status]:'ringing',[F.ice]:'[]',[F.created]:now.toISOString(),[F.expires]:expires,[F.updated]:now.toISOString()}}]})});
   return out(201,{success:true,callId:id,recordId:rec.records?.[0]?.id,iceServers:iceServers()});
  }
  if(method==='GET'&&event.queryStringParameters?.incoming==='1'){
   const incoming=await find(TABLE,`AND({Destinataire record ID}=${val(me.id)},{Statut}="ringing")`);
   const live=[];for(const row of incoming){const f=row.fields||{};if(f[F.offer]&&Date.parse(f[F.expires]||'')>Date.now()&&await friend(f[F.from],me.id))live.push({callId:f[F.id],callerId:f[F.from],type:f[F.type],created:f[F.created]});}
   return out(200,{incoming:live.slice(0,3)});
  }
  const callId=String(event.queryStringParameters?.callId||b.callId||'');
  if(!callId)return out(400,{error:'Appel introuvable.'});
  const rows=await find(TABLE,`{Call ID}=${val(callId)}`),record=rows[0];if(!record)return out(404,{error:'Cet appel n’existe plus.'});
  const f=record.fields||{},caller=f[F.from],recipient=f[F.to];
  if(me.id!==caller&&me.id!==recipient)return out(403,{error:'Tu ne participes pas à cet appel.'});
  if(!await friend(caller,recipient))return out(403,{error:'Cette relation ne permet plus les appels.'});
  const expired=Date.parse(f[F.expires]||'')<Date.now();
  if(expired&&f[F.status]!=='ended')return out(410,{error:'Cet appel a expiré.'});
  if(method==='GET')return out(200,{call:{callId,callerId:caller,recipientId:recipient,type:f[F.type],status:f[F.status],offer:f[F.offer]||'',answer:f[F.answer]||'',ice:(()=>{try{return JSON.parse(f[F.ice]||'[]')}catch{return []}})(),created:f[F.created]},iceServers:iceServers()});
  if(method!=='POST')return out(405,{error:'Méthode non autorisée.'});
  const patch={[F.updated]:new Date().toISOString()};
  if(b.action==='offer'&&me.id===caller&&f[F.status]==='ringing'){patch[F.offer]=String(b.sdp||'').slice(0,25000);patch[F.status]='ringing';}
  else if(b.action==='answer'&&me.id===recipient&&f[F.status]==='ringing'){patch[F.answer]=String(b.sdp||'').slice(0,25000);patch[F.status]='connected';}
  else if(b.action==='candidate'){
   let list=[];try{list=JSON.parse(f[F.ice]||'[]')}catch{};if(!Array.isArray(list))list=[];
   const candidate=b.candidate;if(!candidate||typeof candidate!=='object')return out(400,{error:'Candidat ICE invalide.'});
   if(!list.some(x=>x.senderId===me.id&&x.candidate?.candidate===candidate.candidate))list.push({senderId:me.id,candidate});
   patch[F.ice]=JSON.stringify(list.slice(-80));
  }else if(b.action==='decline'||b.action==='end'){patch[F.status]='ended';}
  else return out(400,{error:'Action d’appel inconnue.'});
  await airtable(encodeURIComponent(TABLE)+'/'+encodeURIComponent(record.id),{method:'PATCH',body:JSON.stringify({fields:patch})});
  return out(200,{success:true,status:patch[F.status]||f[F.status]});
 }catch(e){return out(500,{error:e.message||'Erreur appels.'});}
};
