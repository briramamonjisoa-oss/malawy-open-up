const GUILD_ID='3076348376';
const GUILD_TABLE='tblHgA9YIuR9Oqwe5';
const PLAYERS_TABLE='tblz0rJpaQBpafBN2';
const F={id:'flde1aEl0Rfmt8oEb',name:'fldqXbfYepLyAxtrD',level:'fld0uMiE1PHh3GoAg',region:'fldNGVDjZxHMbaFKM',members:'fldudC5wdD6EZsQnB',capacity:'fldEVWY1R0aInz996',online:'flde3AkNObHR0BusJ',leader:'fld4Um2XwpcgXoySZ',leaderUid:'fldh2AcVScdk5TQEh',leaderJson:'fldXAWYVwscWFxbo4',raw:'fldhImFvhTHv55oPh',synced:'fldcgxLer6bnBKmkL'};
const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
async function airtable(env,path,options={}){const r=await fetch('https://api.airtable.com/v0/'+env.AIRTABLE_BASE_ID+'/'+path,{...options,headers:{Authorization:'Bearer '+env.AIRTABLE_TOKEN,'Content-Type':'application/json',...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error?.message||'Airtable HTTP '+r.status);return d;}
async function cached(env){const q=new URLSearchParams({maxRecords:'1',filterByFormula:"{ID guilde}='"+GUILD_ID+"'"});const d=await airtable(env,encodeURIComponent(GUILD_TABLE)+'?'+q);return d.records?.[0]||null;}
async function sync(env){
 const key=env.FREE_FIRE_API_KEY;if(!key)throw new Error('FREE_FIRE_API_KEY absent');
 const u=new URL('http://siambhau69.eu.cc/guild/info');u.searchParams.set('clan_id',GUILD_ID);u.searchParams.set('key',key);
 const response=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error||String(data.id||data.guild_details?.clan_id||'')!==GUILD_ID)throw new Error(data.error||'Réponse /guild/info invalide (vérifier permission guildinfo)');
 // Leader is taken from the API's player profile captainBasicInfo, matched by guild ID and captain UID.
 const q=new URLSearchParams({pageSize:'100',fields:['ID Free Fire','Profil Free Fire JSON'].map(x=>'fields[]='+encodeURIComponent(x)).join('&')});
 const pr=await airtable(env,PLAYERS_TABLE+'?pageSize=100');
 let captain=null;
 for(const rec of pr.records||[]){try{const p=JSON.parse(rec.fields?.['Profil Free Fire JSON']||'{}');if(String(p.clanBasicInfo?.clanId||'')===GUILD_ID){const uid=String(p.clanBasicInfo?.captainId||'');const c=p.captainBasicInfo;if(c&&String(c.accountId||'')===uid){captain=c;break;}}}catch{}}
 const detail=data.guild_details||{};
 const payload={
  id:GUILD_ID,name:data.clan_name||data.guild_name||'CIA',
  level:Number(data.level??data.clanLevel??0)||0,region:data.region||'ME',
  members:Number(detail.total_members??data.total_members??data.memberNum??0)||0,
  capacity:Number(data.capacity??detail.capacity??55)||55,
  online:(()=>{const value=detail.members_online??data.members_online??data.online_members??data.online??null;return value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);})(),
  leader:captain?.nickname||'',leaderUid:String(captain?.accountId||data.captain_id||''),
  leaderJson:captain?JSON.stringify(captain):'',raw:JSON.stringify(data),synced:new Date().toISOString()
 };
 const fields={[F.id]:payload.id,[F.name]:payload.name,[F.level]:payload.level,[F.region]:payload.region,[F.members]:payload.members,[F.capacity]:payload.capacity,[F.online]:payload.online,[F.leader]:payload.leader,[F.leaderUid]:payload.leaderUid,[F.leaderJson]:payload.leaderJson,[F.raw]:payload.raw,[F.synced]:payload.synced};
 const old=await cached(env);
 if(old)await airtable(env,encodeURIComponent(GUILD_TABLE)+'/'+old.id,{method:'PATCH',body:JSON.stringify({fields})});
 else await airtable(env,encodeURIComponent(GUILD_TABLE),{method:'POST',body:JSON.stringify({fields})});
 return payload;
}
exports.handler=async(event)=>{
 const env=globalThis.__MOU_ENV||process.env;
 try{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers,body:''};
  let rec=await cached(env),age=rec?Date.now()-new Date(rec.fields?.['Synchronisé le']||0).getTime():Infinity;
  if(event.queryStringParameters?.refresh==='1'||!rec||age>15*60*1000){try{const fresh=await sync(env);return{statusCode:200,headers,body:JSON.stringify(fresh)}}catch(e){console.warn('Guild sync failed:',e.message);if(!rec)return{statusCode:503,headers,body:JSON.stringify({error:e.message})};}}
  const f=rec.fields||{};
  return{statusCode:200,headers,body:JSON.stringify({id:f['ID guilde'],name:f['Nom guilde'],level:f.Niveau,region:f.Région,members:f.Membres,capacity:f.Capacité,online:(f['Membres connectés']===undefined||f['Membres connectés']===''?null:Number(f['Membres connectés'])),leader:f['Chef de guilde'],leaderUid:f['UID chef'],leaderProfile:(()=>{try{return JSON.parse(f['Profil chef JSON']||'null')}catch{return null}})(),syncedAt:f['Synchronisé le'],cached:true})};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message||'Erreur synchronisation guilde'})};}
};
