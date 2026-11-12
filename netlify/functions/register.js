const crypto=require('crypto');
const {airtable}=require('./auth');
const hashPin=(pin,salt)=>crypto.scryptSync(pin,salt,64).toString('hex');
exports.handler=async(event)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 try{
  const {pseudo,playerId,mode,pin,photo}=JSON.parse(event.body||'{}');
  if(!pseudo||!playerId||!['1 VS 1','2 VS 1'].includes(mode))return{statusCode:400,headers,body:JSON.stringify({error:'Informations invalides'})};
  const secure=pin!==undefined||photo!==undefined;
  if(secure&&!/^[0-9]{4,8}$/.test(String(pin||'')))return{statusCode:400,headers,body:JSON.stringify({error:'Le PIN doit contenir 4 à 8 chiffres.'})};
  if(photo!==undefined&&(typeof photo!=='string'||!/^https:\/\//i.test(photo)))return{statusCode:400,headers,body:JSON.stringify({error:'Photo invalide.'})};
  let records=[],offset;do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable('Inscriptions?'+q);records.push(...(d.records||[]));offset=d.offset;}while(offset);
  const duplicate=records.find(r=>String(r.fields['ID Free Fire']||'').trim()===String(playerId).trim()||String(r.fields['Pseudo Free Fire']||'').trim().toLowerCase()===String(pseudo).trim().toLowerCase());
  if(duplicate)return{statusCode:409,headers,body:JSON.stringify({error:'Ce pseudo ou cet UID est déjà inscrit. Si tu as déjà un compte, utilise « Déjà inscrit ? Connexion ».'})};
  const fields={'Pseudo Free Fire':String(pseudo).trim(),'ID Free Fire':String(playerId).trim(),'Mode de combat':mode,'Statut inscription':'En attente'};
  if(secure){const salt=crypto.randomBytes(16).toString('hex');fields['PIN hash']=salt+'
  const out=await airtable('Inscriptions',{method:'POST',body:JSON.stringify({records:[{fields}]})});
  return{statusCode:200,headers,body:JSON.stringify({success:true,message:'Inscription envoyée',id:out.records?.[0]?.id})};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message})}}
};
+hashPin(String(pin),salt);}
  if(photo)fields.Photo=photo;
  const out=await airtable('Inscriptions',{method:'POST',body:JSON.stringify({records:[{fields}]})});
  return{statusCode:200,headers,body:JSON.stringify({success:true,message:'Inscription envoyée',id:out.records?.[0]?.id})};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message})}}
};
