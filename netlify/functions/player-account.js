const crypto=require('crypto');
const {airtable,verifyPlayer}=require('./auth');
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, GET, OPTIONS'};
const sign=(data)=>{const payload=Buffer.from(JSON.stringify(data)).toString('base64url');const signature=crypto.createHmac('sha256',process.env.ADMIN_CODE).update(payload).digest('base64url');return payload+'.'+signature;};
exports.handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 try{
  if(event.httpMethod==='POST'){
   const {pseudo,playerId}=JSON.parse(event.body||'{}');
   if(!pseudo||!playerId)return{statusCode:400,headers,body:JSON.stringify({error:'Saisis ton pseudo et ton UID Free Fire.'})};
   let records=[],offset;
   do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable('Inscriptions?'+q);records.push(...(d.records||[]));offset=d.offset;}while(offset);
   const matches=records.filter(r=>String(r.fields['Pseudo Free Fire']||'').trim().toLowerCase()===String(pseudo).trim().toLowerCase()&&String(r.fields['ID Free Fire']||'').trim()===String(playerId).trim());
   if(matches.length!==1)return{statusCode:401,headers,body:JSON.stringify({error:'Pseudo ou UID incorrect.'})};
   const r=matches[0],status=r.fields['Statut inscription']||'En attente';
   if(status!=='Accepté')return{statusCode:403,headers,body:JSON.stringify({error:'Ton inscription doit être acceptée par un administrateur avant de te connecter.'})};
   const token=sign({role:'player',id:r.id,exp:Date.now()+12*60*60*1000});
   return{statusCode:200,headers,body:JSON.stringify({success:true,token})};
  }
  if(event.httpMethod==='GET'){
   const session=verifyPlayer(event);if(!session)return{statusCode:401,headers,body:JSON.stringify({error:'Session joueur expirée. Reconnecte-toi.'})};
   const r=await airtable('Inscriptions/'+encodeURIComponent(session.id));
   const f=r.fields||{},pseudo=f['Pseudo Free Fire']||'Joueur';
   let matches=[],offset;
   do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable('Matchs?'+q);matches.push(...(d.records||[]));offset=d.offset;}while(offset);
   const history=matches.filter(m=>[m.fields['Équipe A'],m.fields['Équipe B']].some(n=>String(n||'').trim().toLowerCase()===pseudo.toLowerCase())&&(m.fields.Statut||'Terminé')==='Terminé').map(m=>({a:m.fields['Équipe A']||'',b:m.fields['Équipe B']||'',sa:Number(m.fields['Score A'])||0,sb:Number(m.fields['Score B'])||0,date:m.fields['Date du match']||''})).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
   return{statusCode:200,headers,body:JSON.stringify({id:r.id,pseudo,playerId:f['ID Free Fire']||'',mode:f['Mode de combat']||'',photo:f.Photo||'',points:Number(f.Points)||0,wins:Number(f.Victoires)||0,losses:Number(f.Défaites)||0,status:f['Statut inscription']||'',matches:history})};
  }
  if(event.httpMethod==='PATCH'){
   const session=verifyPlayer(event);if(!session)return{statusCode:401,headers,body:JSON.stringify({error:'Session joueur expirée. Reconnecte-toi.'})};
   const x=JSON.parse(event.body||'{}');
   if(typeof x.photo!=='string'||!/^https:\/\//i.test(x.photo))return{statusCode:400,headers,body:JSON.stringify({error:'Photo invalide.'})};
   const out=await airtable('Inscriptions/'+encodeURIComponent(session.id),{method:'PATCH',body:JSON.stringify({fields:{Photo:x.photo}})});
   return{statusCode:200,headers,body:JSON.stringify({success:true,photo:out.fields.Photo})};
  }
  return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message})}}
};
