const {airtable}=require('./auth');
exports.handler=async(event)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'no-store, no-cache, must-revalidate, proxy-revalidate','Pragma':'no-cache','Expires':'0'};
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 try{let records=[],offset;do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable(`Inscriptions?${q}`);records.push(...(d.records||[]));offset=d.offset}while(offset);
 const players=records.map(r=>{const rawStatus=String(r.fields['Statut inscription']||'En attente').trim();const normalized=rawStatus.toLocaleLowerCase('fr').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');const status=['accepte','acceptee','accepted','valide','validee','approved'].includes(normalized)?'Accepté':rawStatus;return{id:r.id,pseudo:r.fields['Pseudo Free Fire']||'Joueur',playerId:r.fields['ID Free Fire']||'',mode:r.fields['Mode de combat']||'Inscrit',status,points:Number(r.fields.Points)||0,wins:Number(r.fields.Victoires)||0,losses:Number(r.fields.Défaites)||0,photo:r.fields.Photo||''}});
 return{statusCode:200,headers,body:JSON.stringify(players)};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message})}}
};
