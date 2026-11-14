const {verify,airtable}=require('./auth');
const TABLE='Résultats Battle Royale';
const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
const R=(status,data)=>({statusCode:status,headers:H,body:JSON.stringify(data)});
async function all(table){let records=[],offset='';do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);records.push(...(d.records||[]));offset=d.offset||'';}while(offset);return records;}
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return R(200,{});
 if(event.httpMethod!=='POST')return R(405,{error:'Méthode non autorisée'});
 if(!verify(event))return R(401,{error:'Session administrateur expirée.'});
 try{
  const x=JSON.parse(event.body||'{}'),tid=String(x.tournamentId||''),count=Number(x.mapCount);
  if(!tid||![2,3].includes(count)||!Array.isArray(x.maps)||x.maps.length!==count)throw Error('Choisis un tournoi et 2 ou 3 maps.');
  const [tournaments,signups]=await Promise.all([all('Tournois'),all('Inscriptions tournois')]);
  const t=tournaments.find(r=>r.id===tid);if(!t)throw Error('Tournoi introuvable.');
  if(String(t.fields?.Jeu||'').toLowerCase()!=='battle royale')throw Error('Ce tournoi n’est pas en Battle Royale.');
  const eligible=new Map();
  signups.filter(r=>String(r.fields?.['ID tournoi']||'')===tid&&String(r.fields?.Statut||'').trim()==='Acceptée').forEach(r=>{
   const f=r.fields||{},n=f.Format==='E_sport'?4:(Number(String(f.Format||'1v1')[0])||1);
   for(let i=1;i<=n;i++){const pseudo=String(f['Joueur '+i]||'').trim();if(pseudo)eligible.set(pseudo.toLocaleLowerCase('fr'),{pseudo,signupId:r.id});}
  });
  if(!eligible.size)throw Error('Aucun joueur accepté dans ce tournoi.');
  const prepared=[];
  x.maps.forEach((map,m)=>{if(!Array.isArray(map.players))throw Error('Map invalide.');
   const seen=new Set();map.players.forEach(p=>{
    const key=String(p.pseudo||'').trim().toLocaleLowerCase('fr');if(!key||!eligible.has(key))return;
    if(seen.has(key))throw Error('Joueur en double sur la map '+(m+1)+'.');seen.add(key);
    const rank=Number(p.rank),kills=Number(p.kills);if(!Number.isSafeInteger(rank)||rank<1||!Number.isSafeInteger(kills)||kills<0)throw Error('Top ou kills invalide.');
    const placement=rank===1?20:rank===2?15:rank===3?10:0,player=eligible.get(key);
    prepared.push({fields:{'ID tournoi':tid,'ID inscription tournoi':player.signupId,'Nom tournoi':String(t.fields?.['Nom du tournoi']||''),'Pseudo':player.pseudo,'Map':m+1,'Classement':rank,'Kills':kills,'Points classement':placement,'Points kills':kills,'Total points':placement+kills}});
   });
  });
  if(!prepared.length)throw Error('Aucun résultat valide.');
  const old=(await all(TABLE)).filter(r=>String(r.fields?.['ID tournoi']||'')===tid);
  for(let i=0;i<old.length;i+=10)await airtable(encodeURIComponent(TABLE),{method:'DELETE',body:JSON.stringify({records:old.slice(i,i+10).map(r=>({id:r.id}))})});
  for(let i=0;i<prepared.length;i+=10)await airtable(encodeURIComponent(TABLE),{method:'POST',body:JSON.stringify({records:prepared.slice(i,i+10)})});
  const totals=new Map();prepared.forEach(r=>{const f=r.fields,row=totals.get(f.Pseudo)||{pseudo:f.Pseudo,kills:0,placement:0,total:0};row.kills+=f.Kills;row.placement+=f['Points classement'];row.total+=f['Total points'];totals.set(f.Pseudo,row);});
  return R(200,{success:true,saved:prepared.length,players:[...totals.values()].sort((a,b)=>b.total-a.total)});
 }catch(e){return R(400,{error:e.message||'Erreur serveur'});}
};