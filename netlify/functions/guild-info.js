const GUILD_TABLE='tblHgA9YIuR9Oqwe5';
const PLAYERS_TABLE='tblz0rJpaQBpafBN2';
const F={id:'flde1aEl0Rfmt8oEb',name:'fldqXbfYepLyAxtrD',level:'fld0uMiE1PHh3GoAg',region:'fldNGVDjZxHMbaFKM',members:'fldudC5wdD6EZsQnB',capacity:'fldEVWY1R0aInz996',online:'flde3AkNObHR0BusJ',leader:'fld4Um2XwpcgXoySZ',leaderUid:'fldh2AcVScdk5TQEh',leaderJson:'fldXAWYVwscWFxbo4',raw:'fldhImFvhTHv55oPh',synced:'fldcgxLer6bnBKmkL'};
const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
async function airtable(env,path,options={}){const r=await fetch('https://api.airtable.com/v0/'+env.AIRTABLE_BASE_ID+'/'+path,{...options,headers:{Authorization:'Bearer '+env.AIRTABLE_TOKEN,'Content-Type':'application/json',...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error?.message||'Airtable HTTP '+r.status);return d;}
async function cached(env,guildId){
 const formula=guildId?"{ID guilde}='"+guildId+"'":'';
 const q=new URLSearchParams({pageSize:guildId?'1':'100','sort[0][field]':'Synchronisé le','sort[0][direction]':'desc'});
 if(formula)q.set('filterByFormula',formula);
 const d=await airtable(env,encodeURIComponent(GUILD_TABLE)+'?'+q);
 return guildId?(d.records?.[0]||null):(d.records||[]);
}
async function sync(env,guildId){
 const key=env.FREE_FIRE_API_KEY;if(!key)throw new Error('FREE_FIRE_API_KEY absent');
 const u=new URL('http://siambhau69.eu.cc/guild/info');u.searchParams.set('clan_id',guildId);u.searchParams.set('key',key);
 const response=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error||String(data.id||data.guild_details?.clan_id||'')!==guildId)throw new Error(data.error||'Réponse /guild/info invalide');
 const detail=data.guild_details||{};
 const payload={id:guildId,name:String(data.clan_name||data.guild_name||'').trim(),level:Number(data.level??data.clanLevel??0)||0,region:data.region||'ME',members:Number(detail.total_members??data.total_members??data.memberNum??0)||0,capacity:Number(data.capacity??detail.capacity??55)||55,online:(()=>{const v=detail.members_online??data.members_online??data.online_members??data.online??null;return v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null)})(),leader:'',leaderUid:'',leaderJson:'',raw:JSON.stringify(data),synced:new Date().toISOString()};
 let offset='',records=[];
 do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const p=await airtable(env,PLAYERS_TABLE+'?'+q);records.push(...(p.records||[]));offset=p.offset||'';}while(offset);
 for(const rec of records){try{const profile=JSON.parse(rec.fields?.['Profil Free Fire JSON']||'{}');if(String(profile.clanBasicInfo?.clanId||'')===guildId){const captain=profile.captainBasicInfo||{},captainUid=String(profile.clanBasicInfo?.captainId||'');if(captainUid&&String(captain.accountId||'')===captainUid){payload.leader=String(captain.nickname||'');payload.leaderUid=captainUid;payload.leaderJson=JSON.stringify(captain);break;}}}catch{}}
 const fields={[F.id]:payload.id,[F.name]:payload.name,[F.level]:payload.level,[F.region]:payload.region,[F.members]:payload.members,[F.capacity]:payload.capacity,[F.online]:payload.online,[F.leader]:payload.leader,[F.leaderUid]:payload.leaderUid,[F.leaderJson]:payload.leaderJson,[F.raw]:payload.raw,[F.synced]:payload.synced};
 const old=await cached(env,guildId);
 if(old)await airtable(env,encodeURIComponent(GUILD_TABLE)+'/'+old.id,{method:'PATCH',body:JSON.stringify({fields})});
 else await airtable(env,encodeURIComponent(GUILD_TABLE),{method:'POST',body:JSON.stringify({fields})});
 return payload;
}
function fromRecord(r){const f=r.fields||{};return{id:f['ID guilde'],name:f['Nom guilde'],level:Number(f.Niveau)||0,region:f.Région||'',members:Number(f.Membres)||0,capacity:Number(f.Capacité)||0,online:f['Membres connectés']===''||f['Membres connectés']===undefined?null:Number(f['Membres connectés']),leader:f['Chef de guilde']||'',leaderUid:f['UID chef']||'',leaderProfile:(()=>{try{return JSON.parse(f['Profil chef JSON']||'null')}catch{return null}})(),syncedAt:f['Synchronisé le']||'',cached:true};}
exports.handler=async event=>{
 try{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers,body:''};
  if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
  const env=globalThis.__MOU_ENV||process.env,guildId=String(event.queryStringParameters?.clanId||'').trim();
  if(guildId&&!/^[0-9]{5,24}$/.test(guildId))return{statusCode:400,headers,body:JSON.stringify({error:'Identifiant de guilde invalide.'})};
  if(guildId){
   let rec=await cached(env,guildId),age=rec?Date.now()-new Date(rec.fields?.['Synchronisé le']||0).getTime():Infinity;
   if(event.queryStringParameters?.fast!=='1'&&(event.queryStringParameters?.refresh==='1'||!rec||age>15*60*1000)){try{const fresh=await sync(env,guildId);return{statusCode:200,headers,body:JSON.stringify(fresh)}}catch(e){console.warn('Guild sync failed:',e.message);if(!rec)return{statusCode:503,headers,body:JSON.stringify({error:e.message})}}}
   return{statusCode:200,headers,body:JSON.stringify(fromRecord(rec))};
  }
  const rows=await cached(env,'');
  return{statusCode:200,headers,body:JSON.stringify({guilds:rows.map(fromRecord)})};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message||'Erreur synchronisation guilde'})};}
};
