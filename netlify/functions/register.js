const {airtable}=require('./auth');
exports.handler=async(event)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 try{const {pseudo,playerId,mode}=JSON.parse(event.body||'{}');if(!pseudo||!playerId||!['1 VS 1','2 VS 1'].includes(mode))return{statusCode:400,headers,body:JSON.stringify({error:'Informations invalides'})};
 const d=await airtable('Inscriptions',{method:'POST',body:JSON.stringify({records:[{fields:{'Pseudo Free Fire':pseudo,'ID Free Fire':String(playerId),'Mode de combat':mode,'Statut inscription':'En attente'}}]})});
 return{statusCode:200,headers,body:JSON.stringify({success:true,message:'Inscription envoyée',id:d.records?.[0]?.id})};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message})}}
};
