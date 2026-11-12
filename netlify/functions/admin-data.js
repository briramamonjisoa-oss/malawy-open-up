const {verify,airtable}=require('./auth');
exports.handler=async(event)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 if(event.httpMethod!=='POST')return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 if(!verify(event))return{statusCode:401,headers,body:JSON.stringify({error:'Session administrateur expirée. Reconnecte-toi.'})};
 try{const x=JSON.parse(event.body||'{}');let out;
 if(x.action==='updatePlayer'){
  const fields={'Statut inscription':x.status}; if(x.photo)fields.Photo=x.photo;
  out=await airtable(`Inscriptions/${encodeURIComponent(x.id)}`,{method:'PATCH',body:JSON.stringify({fields})});
 }else if(x.action==='deletePlayer'){
  await airtable(`Inscriptions/${encodeURIComponent(x.id)}`,{method:'DELETE'});out={success:true};
 }else if(x.action==='saveMatch'){
  if(!x.a||!x.b||x.a.toLowerCase()===x.b.toLowerCase())throw new Error('Indique deux joueurs différents.');
  const fields={'Équipe A':x.a,'Équipe B':x.b,'Score A':Number(x.sa)||0,'Score B':Number(x.sb)||0,'Mode':x.mode||'1 VS 1','Statut':'Terminé'};
  if(x.date)fields['Date du match']=new Date(x.date).toISOString();
  out=x.id?await airtable(`Matchs/${encodeURIComponent(x.id)}`,{method:'PATCH',body:JSON.stringify({fields})}):await airtable('Matchs',{method:'POST',body:JSON.stringify({records:[{fields}]})});
 }else if(x.action==='deleteMatch'){
  await airtable(`Matchs/${encodeURIComponent(x.id)}`,{method:'DELETE'});out={success:true};
 }else throw new Error('Action inconnue');
 return{statusCode:200,headers,body:JSON.stringify({success:true,result:out})};
 }catch(e){return{statusCode:400,headers,body:JSON.stringify({error:e.message})}}
};
