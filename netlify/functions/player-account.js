const crypto=require('crypto');
const {airtable,verifyPlayer}=require('./auth');
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, GET, PATCH, OPTIONS'};
const sign=(data)=>{const payload=Buffer.from(JSON.stringify(data)).toString('base64url');const secret=(globalThis.__MOU_ENV || process.env).ADMIN_CODE;if(!secret)throw new Error('ADMIN_CODE absent des variables et secrets du Worker Cloudflare');const signature=crypto.createHmac('sha256',secret).update(payload).digest('base64url');return payload+'.'+signature;};
const syncFreeFireProfile=async(record)=>{
 const fields=record.fields||{},uid=String(fields['ID Free Fire']||'').trim();
 const cached=fields['Profil Free Fire JSON'];
 const cachedAt=fields['Profil Free Fire synchronisé le'];
 const fresh=cachedAt&&Date.now()-new Date(cachedAt).getTime()<5*60*1000;
 if(fresh&&cached){try{return{data:JSON.parse(cached),syncedAt:cachedAt,cached:true};}catch{}}
 const key=(globalThis.__MOU_ENV||process.env).FREE_FIRE_API_KEY;
 if(!key||!uid)return{data:cached?(()=>{try{return JSON.parse(cached)}catch{return null}})():null,syncedAt:cachedAt||null,cached:true};
 const url=new URL('https://siambhau69.eu.cc/freefireinfo/bhau');
 url.searchParams.set('uid',uid);url.searchParams.set('region','ME');url.searchParams.set('key',key);
 try{
  const response=await fetch(url.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.error||String(data.basicInfo?.accountId||'')!==uid)throw new Error(data.error||'Réponse Free Fire invalide');
  const syncedAt=new Date().toISOString();
  await airtable('Inscriptions/'+encodeURIComponent(record.id),{method:'PATCH',body:JSON.stringify({fields:{'Profil Free Fire JSON':JSON.stringify(data),'Profil Free Fire synchronisé le':syncedAt}})});
  return{data,syncedAt,cached:false};
 }catch(error){console.warn('Free Fire profile sync:',error.message);let old=null;try{old=cached?JSON.parse(cached):null}catch{}return{data:old,syncedAt:cachedAt||null,cached:true,error:'Synchronisation temporairement indisponible'};}
};
const hashPin=(pin,salt)=>crypto.scryptSync(pin,salt,64).toString('hex');
const validPin=(pin,stored)=>{try{const [salt,hash]=String(stored||'').split('$');if(!salt||!hash)return false;const actual=Buffer.from(hashPin(pin,salt),'hex'),expected=Buffer.from(hash,'hex');return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);}catch{return false;}};
const getPlayerTournamentSignups=async uid=>{
 const safe=String(uid||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
 const names=['ID joueur 1','ID joueur 2','ID joueur 3','ID joueur 4','ID remplaçant 1','ID remplaçant 2'];
 const formula='OR('+names.map(name=>'{'+name+"}='"+safe+"'").join(',')+')';
 const q=new URLSearchParams({filterByFormula:formula,pageSize:'100'});
 const data=await airtable(encodeURIComponent('Inscriptions tournois')+'?'+q.toString());
 return(data.records||[]).map(record=>{const f=record.fields||{};return{id:record.id,tournamentId:f['ID tournoi']||'',tournamentName:f['Nom tournoi']||'Tournoi',game:f.Jeu||'',format:f.Format||'',status:f.Statut||'En attente',date:f['Date inscription']||''};});
};
const isApproved=(status)=>['accepte','acceptee','accepted','valide','validee','approved'].includes(String(status||'').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,''));
exports.handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 try{
  if(event.httpMethod==='POST'){
   const {playerId,uid,pin}=JSON.parse(event.body||'{}');
   const loginUid=String(playerId||uid||'').trim();
   if(!/^[0-9]{5,40}$/.test(loginUid)||!/^[0-9]{4,8}$/.test(String(pin||'')))return{statusCode:400,headers,body:JSON.stringify({error:'Saisis ton UID Free Fire et ton PIN de 4 à 8 chiffres.'})};
   let records=[],offset;
   do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable('Inscriptions?'+q);records.push(...(d.records||[]));offset=d.offset;}while(offset);
   const matches=records.filter(r=>String(r.fields['ID Free Fire']||'').trim()===loginUid);
   if(matches.length!==1)return{statusCode:401,headers,body:JSON.stringify({error:'UID Free Fire introuvable ou associé à plusieurs comptes. Vérifie ton UID.'})};
   const r=matches[0],fields=r.fields||{},status=fields['Statut inscription']||'En attente';
   if(!isApproved(status))return{statusCode:403,headers,body:JSON.stringify({error:'Ton inscription doit être acceptée par un administrateur avant de te connecter.'})};
   let pinStored=fields['PIN hash']||'';
   // Ancien compte approuvé sans PIN : enregistrer le PIN choisi à la première connexion.
   if(!pinStored){
    const salt=crypto.randomBytes(16).toString('hex');
    pinStored=salt+'$'+hashPin(String(pin),salt);
    await airtable('Inscriptions/'+encodeURIComponent(r.id),{method:'PATCH',body:JSON.stringify({fields:{'PIN hash':pinStored}})});
   }else if(!validPin(String(pin),pinStored)){
    return{statusCode:401,headers,body:JSON.stringify({error:'Code PIN incorrect.'})};
   }
   const token=sign({role:'player',pinAuth:1,id:r.id,exp:Date.now()+10*365*24*60*60*1000});
   return{statusCode:200,headers,body:JSON.stringify({success:true,token})};
  }
  if(event.httpMethod==='GET'){
   const session=verifyPlayer(event);if(!session)return{statusCode:401,headers,body:JSON.stringify({error:'Session joueur expirée. Reconnecte-toi.'})};
   const r=await airtable('Inscriptions/'+encodeURIComponent(session.id));
   const f=r.fields||{};
   if(!isApproved(f['Statut inscription']))return{statusCode:403,headers,body:JSON.stringify({error:'Ton inscription n’est plus acceptée.'})};
   const tournamentSignups=await getPlayerTournamentSignups(String(f['ID Free Fire']||'').trim());
   const history=[];
   let ff=null,freeFire={syncedAt:f['Profil Free Fire synchronisé le']||null,cached:true,error:null};
   try{ff=f['Profil Free Fire JSON']?JSON.parse(f['Profil Free Fire JSON']):null;}catch{}
   if(event.queryStringParameters?.fast!=='1'){freeFire=await syncFreeFireProfile(r);ff=freeFire.data||ff;}
   const pseudo=String(ff?.basicInfo?.nickname||f['Pseudo Free Fire']||'Joueur');
   return{statusCode:200,headers,body:JSON.stringify({id:r.id,pseudo,freeFirePseudo:f['Pseudo Free Fire']||'Joueur',playerId:f['ID Free Fire']||'',mode:f['Mode de combat']||'',photo:f.Photo||'',points:Number(f.Points)||0,wins:Number(f.Victoires)||0,losses:Number(f.Défaites)||0,matchesPlayed:(Number(f.Victoires)||0)+(Number(f.Défaites)||0),status:f['Statut inscription']||'',matches:history,tournamentSignups,freeFireProfile:ff,freeFireSyncedAt:freeFire.syncedAt,freeFireSyncCached:freeFire.cached,freeFireSyncError:freeFire.error||null})};
  }
  if(event.httpMethod==='PATCH'){
   const session=verifyPlayer(event);if(!session)return{statusCode:401,headers,body:JSON.stringify({error:'Session joueur expirée. Reconnecte-toi.'})};
   const x=JSON.parse(event.body||'{}');
   if(x.action==='changePin'){
    const current=String(x.currentPin||''),next=String(x.newPin||'');
    if(!/^[0-9]{4,8}$/.test(current)||!/^[0-9]{4,8}$/.test(next))return{statusCode:400,headers,body:JSON.stringify({error:'Les PIN doivent contenir 4 à 8 chiffres.'})};
    const record=await airtable('Inscriptions/'+encodeURIComponent(session.id)),fields=record.fields||{};
    if(!validPin(current,fields['PIN hash']))return{statusCode:401,headers,body:JSON.stringify({error:'Ancien code PIN incorrect.'})};
    const salt=crypto.randomBytes(16).toString('hex');
    const pinHash=salt+'$'+hashPin(next,salt);
    await airtable('Inscriptions/'+encodeURIComponent(session.id),{method:'PATCH',body:JSON.stringify({fields:{'PIN hash':pinHash}})});
    return{statusCode:200,headers,body:JSON.stringify({success:true})};
   }
   if(typeof x.photo!=='string'||!/^https:\/\//i.test(x.photo))return{statusCode:400,headers,body:JSON.stringify({error:'Photo invalide.'})};
   const out=await airtable('Inscriptions/'+encodeURIComponent(session.id),{method:'PATCH',body:JSON.stringify({fields:{Photo:x.photo}})});
   return{statusCode:200,headers,body:JSON.stringify({success:true,photo:out.fields.Photo})};
  }
  return{statusCode:405,headers,body:JSON.stringify({error:'Méthode non autorisée'})};
 }catch(e){return{statusCode:500,headers,body:JSON.stringify({error:e.message})}}
};
