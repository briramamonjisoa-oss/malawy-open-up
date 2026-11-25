const {airtable,verifyPlayer}=require('./auth');
const PLAYERS='tblz0rJpaQBpafBN2';
const CACHE='tblHgA9YIuR9Oqwe5';
const GROUPS='tblOf7CoOFBKpIueo';
const PF={pseudo:'fldaNsxza3T3krjfr',uid:'fldbZWPSxIePTc41P',profile:'fldJAultgWl4cZfCW',synced:'fldr4kMBGAqlN6rU4',status:'fldmc3ktn1we8phLq'};
const APPROVED=['accepte','acceptee','accepted','valide','validee','approved'];
const approved=v=>APPROVED.includes(String(v||'').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,''));
const CF={id:'flde1aEl0Rfmt8oEb',name:'fldqXbfYepLyAxtrD',level:'fld0uMiE1PHh3GoAg',region:'fldNGVDjZxHMbaFKM',members:'fldudC5wdD6EZsQnB',capacity:'fldEVWY1R0aInz996',online:'flde3AkNObHR0BusJ',leader:'fld4Um2XwpcgXoySZ',leaderUid:'fldh2AcVScdk5TQEh',leaderJson:'fldXAWYVwscWFxbo4',raw:'fldhImFvhTHv55oPh',synced:'fldcgxLer6bnBKmkL'};
const GF={groupId:'fldR1XeGsryaDzlAa',guildId:'fldfLYjJEme1kBMx0',name:'fldr1iPGh1XKgvqMU',level:'fldClrRG6DV8rrGsg',region:'fldOI53lZNVaqEyT3',leaderRecord:'fldKcXZ2Miz5CmKm1',leaderUid:'fldK0983lKd0dFqfH',leaderName:'flddhMQ8z9yVtfzU2',officers:'fld7ca2t1SdIwGo3c',status:'fldBZBT3Vm1aexeXD',created:'fldtKzjWbRofTULEA',updated:'fldafzcYOPNNq5xGc'};
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(data)});
const body=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
async function all(table){let rows=[],offset;do{const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true'});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);rows.push(...(d.records||[]));offset=d.offset;}while(offset&&rows.length<2000);return rows;}
const fields=r=>r?.fields||{};
async function playerProfile(record,force=false){
 const f=fields(record),uid=String(f[PF.uid]||'').trim();if(!approved(f[PF.status]))throw new Error('Ton compte MALAWY OPEN UP doit être accepté et actif.');if(!uid)throw new Error('UID Free Fire absent du compte.');
 let profile=null;try{profile=JSON.parse(f[PF.profile]||'null')}catch{}
 const age=f[PF.synced]?Date.now()-Date.parse(f[PF.synced]):Infinity;
 if(force||!profile||!Number.isFinite(age)||age>5*60*1000){
  const env=globalThis.__MOU_ENV||process.env,key=env.FREE_FIRE_API_KEY;if(!key)throw new Error('Détecteur Free Fire indisponible : clé API manquante.');
  const u=new URL('https://siambhau69.eu.cc/freefireinfo/bhau');u.searchParams.set('uid',uid);u.searchParams.set('region','ME');u.searchParams.set('key',key);
  const res=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)}),data=await res.json().catch(()=>({}));
  if(!res.ok||data.error||String(data.basicInfo?.accountId||'')!==uid)throw new Error('Impossible de vérifier le profil Free Fire du joueur.');
  profile=data;await airtable(PLAYERS+'/'+encodeURIComponent(record.id),{method:'PATCH',body:JSON.stringify({fields:{[PF.profile]:JSON.stringify(data),[PF.synced]:new Date().toISOString()}})});
 }
 return {uid,profile,pseudo:String(f[PF.pseudo]||profile.basicInfo?.nickname||'Joueur')};
}
async function guildInfo(guildId){
 const env=globalThis.__MOU_ENV||process.env,key=env.FREE_FIRE_API_KEY;if(!key)throw new Error('Détecteur Free Fire indisponible.');
 const u=new URL('http://siambhau69.eu.cc/guild/info');u.searchParams.set('clan_id',guildId);u.searchParams.set('key',key);
 const res=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)}),data=await res.json().catch(()=>({}));
 const returned=String(data.id||data.guild_details?.clan_id||'');
 if(!res.ok||data.error||returned!==guildId)throw new Error('Les informations de cette guilde ne sont pas vérifiables actuellement.');
 const detail=data.guild_details||{};
 return {id:guildId,name:String(data.clan_name||data.guild_name||'').trim(),level:Number(data.level??data.clanLevel??0)||0,region:String(data.region||'ME'),members:Number(detail.total_members??data.total_members??data.memberNum??0)||0,capacity:Number(data.capacity??detail.capacity??55)||55,online:Number(detail.members_online??data.members_online??data.online_members??0)||0,raw:data};
}
async function syncGuildCache(info,leader){
 const old=(await all(CACHE)).find(r=>String(fields(r)[CF.id]||'')===info.id);
 const values={[CF.id]:info.id,[CF.name]:info.name,[CF.level]:info.level,[CF.region]:info.region,[CF.members]:info.members,[CF.capacity]:info.capacity,[CF.online]:info.online,[CF.leader]:leader.pseudo,[CF.leaderUid]:leader.uid,[CF.leaderJson]:JSON.stringify(leader.profile.captainBasicInfo||{}),[CF.raw]:JSON.stringify(info.raw),[CF.synced]:new Date().toISOString()};
 if(old)await airtable(CACHE+'/'+old.id,{method:'PATCH',body:JSON.stringify({fields:values})});
 else await airtable(encodeURIComponent(CACHE),{method:'POST',body:JSON.stringify({records:[{fields:values}]})});
}
async function resolveMe(me,force=false){
 const record=await airtable(PLAYERS+'/'+encodeURIComponent(me.id)+'?returnFieldsByFieldId=true');
 const player=await playerProfile(record,force),basic=player.profile.basicInfo||{},clan=player.profile.clanBasicInfo||{},captain=player.profile.captainBasicInfo||{};
 const guildId=String(clan.clanId||'').trim(),captainUid=String(clan.captainId||captain.accountId||'').trim();
 if(!guildId)throw new Error('Aucune guilde détectée sur le profil Free Fire.');
 if(!captainUid)throw new Error('Le détecteur ne fournit pas l’UID du chef de guilde.');
 const isLeader=player.uid===captainUid&&String(captain.accountId||captainUid)===player.uid;
 return {record,player,basic,clan,captain,guildId,captainUid,isLeader};
}
async function getGroup(guildId){return (await all(GROUPS)).find(r=>String(fields(r)[GF.guildId]||'')===guildId)||null;}
function publicGroup(r){const f=fields(r);let officers=[];try{officers=JSON.parse(f[GF.officers]||'[]')}catch{}return {id:r.id,groupId:f[GF.groupId],guildId:f[GF.guildId],name:f[GF.name],level:Number(f[GF.level])||0,region:f[GF.region]||'',leaderPlayerId:f[GF.leaderRecord],leaderUid:f[GF.leaderUid],leaderPseudo:f[GF.leaderName],officers,status:f[GF.status]||'Actif',createdAt:f[GF.created]};}
exports.handler=async event=>{
 const me=verifyPlayer(event);if(!me)return out(401,{error:'Connecte-toi avec ton compte MALAWY OPEN UP.'});
 const method=event.httpMethod||'GET',b=body(event),action=String(b.action||event.queryStringParameters?.action||'mine');
 try{
  const resolved=await resolveMe(me,action==='refresh');
  if(method==='GET'){
   const group=await getGroup(resolved.guildId);
   const guild={id:resolved.guildId,name:resolved.clan.clanName||resolved.clan.name||'',level:Number(resolved.clan.clanLevel)||0,leaderPseudo:resolved.captain.nickname||'',leaderUid:resolved.captainUid};
   if(!group)return out(200,{group:null,guild,canCreate:resolved.isLeader,role:resolved.isLeader?'leader':'member',members:[]});
   let g=publicGroup(group);
   if(resolved.isLeader&&g.leaderUid!==resolved.player.uid){
    const now=new Date().toISOString();
    await airtable(GROUPS+'/'+group.id,{method:'PATCH',body:JSON.stringify({fields:{[GF.leaderRecord]:me.id,[GF.leaderUid]:resolved.player.uid,[GF.leaderName]:resolved.player.pseudo,[GF.name]:String(resolved.clan.clanName||resolved.clan.name||g.name),[GF.officers]:'[]',[GF.updated]:now}})});
    const refreshed=await airtable(GROUPS+'/'+group.id+'?returnFieldsByFieldId=true');g=publicGroup(refreshed);
   }
   const isOfficer=g.officers.some(x=>x.playerRecordId===me.id);
   const roster=await all(PLAYERS);
   const members=roster.flatMap(r=>{
    const f=fields(r);
    if(!approved(f[PF.status]))return [];
    let p=null;try{p=JSON.parse(f[PF.profile]||'null')}catch{}
    if(String(p?.clanBasicInfo?.clanId||'')!==resolved.guildId)return [];
    const uid=String(f[PF.uid]||p?.basicInfo?.accountId||'');
    if(!uid)return [];
    const officer=g.officers.find(x=>x.playerRecordId===r.id);
    return [{playerRecordId:r.id,uid,pseudo:String(p?.basicInfo?.nickname||f[PF.pseudo]||'Joueur'),role:r.id===g.leaderPlayerId?'leader':officer?'officer':'member'}];
   });
   members.sort((a,b)=>(a.role==='leader'?-1:b.role==='leader'?1:a.role==='officer'?-1:b.role==='officer'?1:a.pseudo.localeCompare(b.pseudo,'fr')));
   return out(200,{group:g,guild,canCreate:resolved.isLeader&&g.leaderPlayerId!==me.id,role:resolved.isLeader?'leader':isOfficer?'officer':'member',members});
  }
  if(method!=='POST')return out(405,{error:'Méthode non autorisée.'});
  if(action==='create'){
   if(!resolved.isLeader)return out(403,{error:'Seul le chef Free Fire connecté sur MALAWY OPEN UP peut créer le groupe officiel.'});
   const info=await guildInfo(resolved.guildId);if(!info.name)return out(502,{error:'Le nom officiel de la guilde est indisponible.'});
   await syncGuildCache(info,resolved.player);
   const existing=await getGroup(resolved.guildId),now=new Date().toISOString();
   if(existing){
    const ef=fields(existing);
    if(ef[GF.leaderRecord]!==me.id){
     const values={[GF.leaderRecord]:me.id,[GF.leaderUid]:resolved.player.uid,[GF.leaderName]:resolved.player.pseudo,[GF.name]:info.name,[GF.level]:info.level,[GF.region]:info.region,[GF.officers]:'[]',[GF.updated]:now};
     await airtable(GROUPS+'/'+existing.id,{method:'PATCH',body:JSON.stringify({fields:values})});
     const updated=await airtable(GROUPS+'/'+existing.id+'?returnFieldsByFieldId=true');return out(200,{success:true,transferred:true,group:publicGroup(updated)});
    }
    return out(200,{success:true,alreadyExists:true,group:publicGroup(existing)});
   }
   const groupId='guild_'+resolved.guildId;
   const saved=await airtable(encodeURIComponent(GROUPS),{method:'POST',body:JSON.stringify({records:[{fields:{[GF.groupId]:groupId,[GF.guildId]:resolved.guildId,[GF.name]:info.name,[GF.level]:info.level,[GF.region]:info.region,[GF.leaderRecord]:me.id,[GF.leaderUid]:resolved.player.uid,[GF.leaderName]:resolved.player.pseudo,[GF.officers]:'[]',[GF.status]:'Actif',[GF.created]:now,[GF.updated]:now}}]})});
   const created=await airtable(GROUPS+'/'+saved.records?.[0]?.id+'?returnFieldsByFieldId=true');
   return out(201,{success:true,group:publicGroup(created)});
  }
  const group=await getGroup(resolved.guildId);if(!group)return out(404,{error:'Le groupe officiel de ta guilde n’existe pas encore.'});
  const gf=fields(group),officers=(()=>{try{return JSON.parse(gf[GF.officers]||'[]')}catch{return []}})();
  if(gf[GF.status]!=='Actif')return out(403,{error:'Ce groupe est actuellement suspendu.'});
  if(gf[GF.leaderRecord]!==me.id)return out(403,{error:'Seul le chef actuel de la guilde peut gérer les officiers.'});
  if(action==='appointOfficer'||action==='removeOfficer'){
   const targetId=String(b.playerRecordId||'').trim();if(!targetId||targetId===me.id)return out(400,{error:'Joueur cible invalide.'});
   let targetProfile=null;
   if(action==='appointOfficer'){
    const target=await airtable(PLAYERS+'/'+encodeURIComponent(targetId)+'?returnFieldsByFieldId=true');targetProfile=await playerProfile(target,true);
    const targetClan=targetProfile.profile.clanBasicInfo||{};
    if(String(targetClan.clanId||'')!==resolved.guildId)return out(403,{error:'Un officier doit appartenir à la même guilde.'});
   }
   let next=officers.filter(x=>x.playerRecordId!==targetId);
   if(action==='appointOfficer'){
    if(officers.some(x=>x.playerRecordId===targetId))return out(200,{success:true,officers});
    if(next.length>=4)return out(409,{error:'Tu peux désigner quatre officiers au maximum.'});
    next.push({playerRecordId:targetId,uid:targetProfile.uid,pseudo:targetProfile.pseudo,appointedAt:new Date().toISOString()});
   }
   await airtable(GROUPS+'/'+group.id,{method:'PATCH',body:JSON.stringify({fields:{[GF.officers]:JSON.stringify(next),[GF.updated]:new Date().toISOString()}})});
   return out(200,{success:true,officers:next});
  }
  return out(400,{error:'Action inconnue.'});
 }catch(e){console.error('guild-groups:',e.message);return out(400,{error:e.message||'Erreur groupes de guilde.'});}
};
