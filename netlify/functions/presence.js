const {airtable,verifyPlayer}=require('./auth');
const TABLE='tblWeARZwdTBJrMiP',REL='tblQoAGcQhii58Hwe';
const F={player:'fld12eZop0VEKP0mS',pseudo:'fldJBTox63f0A6x3n',last:'fldBCUhUOABDJxAZQ',hide:'fldGamWVmLHus6dY0'};
const R={from:'fldV969gNKryDledy',to:'fldbn9UWoDNNZPpS6',status:'fldV1k5nClaf3CT9M'};
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
const body=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
async function all(table){let rows=[],offset;do{const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true'});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);rows.push(...(d.records||[]));offset=d.offset;}while(offset&&rows.length<1000);return rows;}
exports.handler=async event=>{
 const me=verifyPlayer(event);if(!me)return out(401,{error:'Connecte-toi pour actualiser ta présence.'});
 const now=new Date(),b=body(event);
 try{
  const [player,relations,rows]=await Promise.all([airtable('Inscriptions/'+encodeURIComponent(me.id)+'?returnFieldsByFieldId=true'),all(REL),all(TABLE)]);
  const pseudo=String(player.fields?.['Pseudo Free Fire']||me.pseudo||'Joueur'),existing=rows.find(x=>x.fields?.[F.player]===me.id);
  if(event.httpMethod==='POST'){
   if(b.action==='privacy'){
    const hide=Boolean(b.hidden);
    if(existing)await airtable(encodeURIComponent(TABLE)+'/'+existing.id,{method:'PATCH',body:JSON.stringify({fields:{[F.hide]:hide,[F.last]:now.toISOString(),[F.pseudo]:pseudo}})});
    else await airtable(encodeURIComponent(TABLE),{method:'POST',body:JSON.stringify({records:[{fields:{[F.player]:me.id,[F.pseudo]:pseudo,[F.last]:now.toISOString(),[F.hide]:hide}}]})});
    return out(200,{success:true,hidden:hide});
   }
   if(existing)await airtable(encodeURIComponent(TABLE)+'/'+existing.id,{method:'PATCH',body:JSON.stringify({fields:{[F.last]:now.toISOString(),[F.pseudo]:pseudo}})});
   else await airtable(encodeURIComponent(TABLE),{method:'POST',body:JSON.stringify({records:[{fields:{[F.player]:me.id,[F.pseudo]:pseudo,[F.last]:now.toISOString(),[F.hide]:false}}]})});
  }
  if(!['GET','POST'].includes(event.httpMethod))return out(405,{error:'Méthode non autorisée.'});
  const friends=new Set(relations.filter(x=>x.fields?.[R.status]==='Acceptée'&&(x.fields[R.from]===me.id||x.fields[R.to]===me.id)).map(x=>x.fields[R.from]===me.id?x.fields[R.to]:x.fields[R.from]));
  const online=rows.filter(x=>friends.has(x.fields?.[F.player])&&!x.fields?.[F.hide]&&now-Date.parse(x.fields?.[F.last]||0)<120000).map(x=>({playerId:x.fields[F.player],pseudo:x.fields[F.pseudo]||'Ami',lastSeen:x.fields[F.last]}));
  return out(200,{online,hidden:Boolean(existing?.fields?.[F.hide]),heartbeatSeconds:45});
 }catch(e){return out(500,{error:e.message||'Erreur présence.'});}
};