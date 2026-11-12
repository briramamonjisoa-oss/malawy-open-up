const {airtable}=require('./auth');
exports.handler=async(event)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'no-store, no-cache, must-revalidate, proxy-revalidate','Pragma':'no-cache','Expires':'0'};
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 try{
  let records=[],offset;
  do{
   const query=new URLSearchParams({pageSize:'100'});
   if(offset)query.set('offset',offset);
   const data=await airtable('Inscriptions?'+query);
   records.push(...(data.records||[]));
   offset=data.offset;
  }while(offset);
  const players=records.map(record=>{
   const fields=record.fields||{};
   const rawStatus=String(fields['Statut inscription']||'En attente').trim();
   const normalized=rawStatus.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
   const status=['accepte','acceptee','accepted','valide','validee','approved'].includes(normalized)?'Accepté':rawStatus;
   return {id:record.id,pseudo:fields['Pseudo Free Fire']||'Joueur',playerId:fields['ID Free Fire']||'',mode:fields['Mode de combat']||'Inscrit',status,points:Number(fields.Points)||0,wins:Number(fields.Victoires)||0,losses:Number(fields.Défaites)||0,photo:fields.Photo||'',participant:false};
  });
  return{statusCode:200,headers,body:JSON.stringify(players)};
 }catch(error){
  console.error('Erreur chargement inscriptions Airtable:',error);
  return{statusCode:500,headers,body:JSON.stringify({error:error.message||'Impossible de lire les inscriptions Airtable.'})};
 }
};
