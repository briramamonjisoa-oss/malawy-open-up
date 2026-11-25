const {airtable,verifyPlayer}=require('./auth');
const TABLE='tblvtmlhTFkVdsX0C',REACTIONS='tblIIl8Kj2yoXOljw',REL='tblQoAGcQhii58Hwe';
const F={id:'fldBfRkQQLeYnV9ti',key:'fldaRDVwnflWRAR0L',from:'fldV3hCY47mznFBfu',to:'fld1Kaj1hVyHDPeb0',status:'fldiPm5xI7CBgEq5q'};
const X={key:'fldhpIicgyhg5C3tY',message:'fldGfsp1SMu06bScV',player:'fld4GON2r9U35rOuE',emoji:'fldBNVtRerpvuTDKt',created:'fldNoCSVxyGi4MyJH'};
const R={from:'fldV969gNKryDledy',to:'fldbn9UWoDNNZPpS6',status:'fldV1k5nClaf3CT9M'};
const allowed=new Set(['❤️','😂','👍','😮','😢','🔥']);
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS'},body:JSON.stringify(data)});
const body=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
const val=v=>'"'+String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
async function find(table,formula){const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true',filterByFormula:formula});const d=await airtable(encodeURIComponent(table)+'?'+q);return d.records||[];}
async function canSee(me,messageId){const rows=await find(TABLE,`{Message ID}=${val(messageId)}`),m=rows[0];if(!m)return null;const f=m.fields||{},a=f[F.from],b=f[F.to];if(me.id!==a&&me.id!==b)return null;const rel=await find(REL,`AND({Statut}="Acceptée",OR(AND({Joueur demandeur ID}=${val(a)},{Joueur destinataire ID}=${val(b)}),AND({Joueur demandeur ID}=${val(b)},{Joueur destinataire ID}=${val(a)})))`);return rel.length?m:null;}
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return out(200,{});
 const me=verifyPlayer(event);if(!me)return out(401,{error:'Connecte-toi.'});
 const b=body(event),id=String(event.queryStringParameters?.messageId||b.messageId||'');
 try{
  if(!id)return out(400,{error:'Message introuvable.'});
  const msg=await canSee(me,id);if(!msg)return out(403,{error:'Ce message ne t’est pas accessible.'});
  if(event.httpMethod==='GET'){
   const rows=await find(REACTIONS,`{Message ID}=${val(id)}`);
   return out(200,{reactions:rows.map(r=>({playerId:r.fields?.[X.player],emoji:r.fields?.[X.emoji]}))});
  }
  if(event.httpMethod!=='POST')return out(405,{error:'Méthode non autorisée.'});
  const emoji=String(b.emoji||'');if(!allowed.has(emoji))return out(400,{error:'Réaction non autorisée.'});
  const key=id+':'+me.id,rows=await find(REACTIONS,`{Clé réaction}=${val(key)}`),existing=rows[0];
  if(existing&&existing.fields?.[X.emoji]===emoji){await airtable(encodeURIComponent(REACTIONS)+'/'+encodeURIComponent(existing.id),{method:'DELETE'});return out(200,{success:true,removed:true});}
  if(existing)await airtable(encodeURIComponent(REACTIONS)+'/'+encodeURIComponent(existing.id),{method:'PATCH',body:JSON.stringify({fields:{[X.emoji]:emoji,[X.created]:new Date().toISOString()}})});
  else await airtable(encodeURIComponent(REACTIONS),{method:'POST',body:JSON.stringify({records:[{fields:{[X.key]:key,[X.message]:id,[X.player]:me.id,[X.emoji]:emoji,[X.created]:new Date().toISOString()}}]})});
  return out(200,{success:true,emoji});
 }catch(e){return out(500,{error:e.message||'Erreur réaction.'});}
};
