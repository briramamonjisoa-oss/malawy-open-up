const {airtable}=require('./auth');
exports.handler=async(event)=>{
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, OPTIONS'};
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 try{let records=[],offset;do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable(`Matchs?${q}`);records.push(...(d.records||[]));offset=d.offset}while(offset);
 const matches=records.map(r=>({id:r.id,a:r.fields['Équipe A']||'',b:r.fields['Équipe B']||'',sa:Number(r.fields['Score A'])||0,sb:Number(r.fields['Score B'])||0,mode:r.fields.Mode||'1 VS 1',status:r.fields.Statut||'Terminé',date:r.fields['Date du match']?new Date(r.fields['Date du match']).toLocaleString('fr-FR'):'',dateInput:r.fields['Date du match']?new Date(r.fields['Date du match']).toISOString().slice(0,16):''}));
 return{statusCode:200,headers,body:JSON.stringify(matches)};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message})}}
};
