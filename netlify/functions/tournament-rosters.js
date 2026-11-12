const { airtable } = require('./auth');

const H = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
const R = (status,data)=>({statusCode:status,headers:H,body:JSON.stringify(data)});
async function all(table){
 let records=[],offset='';
 do{
  const q=new URLSearchParams({pageSize:'100'});
  if(offset)q.set('offset',offset);
  const d=await airtable(encodeURIComponent(table)+'?'+q.toString());
  records.push(...(d.records||[]));offset=d.offset||'';
 }while(offset);
 return records;
}
exports.handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return R(200,{});
 if(event.httpMethod!=='GET')return R(405,{error:'Méthode non autorisée'});
 try{
  const [tournaments,signups]=await Promise.all([all('Tournois'),all('Inscriptions tournois')]);
  const tournamentMap=new Map(tournaments.map(t=>[t.id,t.fields||{}]));
  const groups=new Map();
  for(const signup of signups){
   const f=signup.fields||{};
   if(['Refusée','Annulée'].includes(f.Statut))continue;
   const id=String(f['ID tournoi']||'');
   if(!id)continue;
   const t=tournamentMap.get(id)||{};
   if(!groups.has(id))groups.set(id,{
    id,name:t['Nom du tournoi']||f['Nom tournoi']||'Tournoi',
    poster:t['Affiche du tournoi']||'',game:t.Jeu||f.Jeu||'',
    format:t.Format||f.Format||'',date:t['Date du tournoi']||'',
    signups:[]
   });
   const players=[];
   const count=f.Format==='E_sport'?4:(Number(String(f.Format||'1v1')[0])||1);
   for(let i=1;i<=count;i++){const name=String(f['Joueur '+i]||'').trim();if(name)players.push(name);}
   if(f.Format==='E_sport')for(let i=1;i<=2;i++){const name=String(f['Remplaçant '+i]||'').trim();if(name)players.push(name+' (remplaçant)');}
   groups.get(id).signups.push({
    id:signup.id,teamName:f['Nom équipe']||'',
    logo:f['Logo équipe']||'',status:f.Statut||'En attente',players
   });
  }
  return R(200,{tournaments:[...groups.values()]});
 }catch(e){return R(500,{error:e.message||'Erreur serveur'});}
};
