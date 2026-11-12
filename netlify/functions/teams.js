const {airtable}=require('./auth');
exports.handler=async(event)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, OPTIONS'};
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 try{
  let records=[],offset;
  do{
   const q=new URLSearchParams({pageSize:'100'});
   if(offset)q.set('offset',offset);
   const d=await airtable('Equipes?'+q);
   records.push(...(d.records||[]));offset=d.offset;
  }while(offset);
  const teams=records.map(r=>({id:r.id,name:r.fields['Nom équipe']||'Équipe',status:r.fields.Statut||'',points:Number(r.fields.Points)||0,wins:Number(r.fields.Victoires)||0,losses:Number(r.fields.Défaites)||0,tournament:r.fields['Nom tournoi']||'',format:r.fields.Format||'',players:r.fields.Joueurs||''}));
  return{statusCode:200,headers,body:JSON.stringify(teams)};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message})}}
};
