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
  const [tournaments,signups,playerRecords]=await Promise.all([all('Tournois'),all('Inscriptions tournois'),all('Inscriptions')]);
  const photoByUid=new Map();
  const photoByPseudo=new Map();
  for(const record of playerRecords){
   const pf=record.fields||{};
   const photo=String(pf.Photo||'').trim();
   if(!photo)continue;
   const uid=String(pf['ID Free Fire']||'').trim();
   const pseudo=String(pf['Pseudo Free Fire']||'').trim().toLocaleLowerCase('fr');
   if(uid)photoByUid.set(uid,photo);
   if(pseudo)photoByPseudo.set(pseudo,photo);
  }
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
   const playerDetails=[];
   const count=f.Format==='E_sport'?4:(Number(String(f.Format||'1v1')[0])||1);
   for(let i=1;i<=count;i++){
    const name=String(f['Joueur '+i]||'').trim();
    const uid=String(f['ID joueur '+i]||'').trim();
    if(name){players.push(name);playerDetails.push({name,photo:photoByUid.get(uid)||photoByPseudo.get(name.toLocaleLowerCase('fr'))||'',substitute:false});}
   }
   if(f.Format==='E_sport')for(let i=1;i<=2;i++){
    const name=String(f['Remplaçant '+i]||'').trim();
    const uid=String(f['ID remplaçant '+i]||'').trim();
    if(name){players.push(name+' (remplaçant)');playerDetails.push({name:name+' (remplaçant)',photo:photoByUid.get(uid)||photoByPseudo.get(name.toLocaleLowerCase('fr'))||'',substitute:true});}
   }
   groups.get(id).signups.push({
    id:signup.id,teamName:f['Nom équipe']||'',
    logo:f['Logo équipe']||'',status:f.Statut||'En attente',players,playerDetails
   });
  }
  return R(200,{tournaments:[...groups.values()]});
 }catch(e){return R(500,{error:e.message||'Erreur serveur'});}
};
