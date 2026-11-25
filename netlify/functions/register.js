const crypto = require('crypto');
const { airtable } = require('./auth');
const { queuePlayerEventNotification } = require('./notifications');
const TABLE = 'Inscriptions';
const hashPin = (pin, salt) => crypto.scryptSync(pin, salt, 64).toString('hex');
const sign = data => {
  const payload=Buffer.from(JSON.stringify(data)).toString('base64url');
  const secret=(globalThis.__MOU_ENV||process.env).ADMIN_CODE;
  if(!secret)throw new Error('ADMIN_CODE absent des variables du Worker Cloudflare.');
  return payload+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url');
};
const response=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
exports.handler=async event=>{
 if(event.httpMethod==='OPTIONS')return response(200,{});
 if(event.httpMethod!=='POST')return response(405,{error:'Méthode non autorisée.'});
 try{
  const x=JSON.parse(event.body||'{}'),uid=String(x.playerId||x.uid||'').trim(),pin=String(x.pin||''),photo=String(x.photo||'').trim();
  if(!/^[0-9]{5,40}$/.test(uid))return response(400,{error:'UID Free Fire invalide.'});
  if(!/^[0-9]{4,8}$/.test(pin))return response(400,{error:'Le PIN doit contenir 4 à 8 chiffres.'});
  if(!/^https:\/\//i.test(photo))return response(400,{error:'La photo de profil est obligatoire.'});
  const fcmToken=String(x.fcmToken||'').trim(),subscription=x.subscription,isFcm=fcmToken.length>=40;
  if(!isFcm&&(!subscription?.endpoint?.startsWith('https://')||!subscription?.keys?.p256dh||!subscription?.keys?.auth))return response(400,{error:'Active les notifications avant de créer ton compte.'});
  const env=globalThis.__MOU_ENV||process.env,key=env.FREE_FIRE_API_KEY;
  if(!key)return response(503,{error:'La vérification Free Fire est momentanément indisponible. Réessaie plus tard.'});
  const url=new URL('https://siambhau69.eu.cc/freefireinfo/bhau');url.searchParams.set('uid',uid);url.searchParams.set('region','ME');url.searchParams.set('key',key);
  const apiResponse=await fetch(url.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  const profile=await apiResponse.json().catch(()=>({}));
  if(!apiResponse.ok||profile.error||String(profile.basicInfo?.accountId||'')!==uid)return response(422,{error:'Profil Free Fire introuvable ou UID incorrect. Vérifie ton UID et réessaie.'});
  let records=[],offset;
  do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const data=await airtable(encodeURIComponent(TABLE)+'?'+q.toString());records.push(...(data.records||[]));offset=data.offset;}while(offset);
  if(records.some(r=>String(r.fields?.['ID Free Fire']||'').trim()===uid))return response(409,{error:'Cet UID possède déjà un compte. Utilise « Se connecter ».'});
  const pseudo=String(profile.basicInfo.nickname||'Joueur').slice(0,32),salt=crypto.randomBytes(16).toString('hex');
  const created=await airtable(encodeURIComponent(TABLE),{method:'POST',body:JSON.stringify({records:[{fields:{'Pseudo Free Fire':pseudo,'ID Free Fire':uid,Photo:photo,'PIN hash':salt+'$'+hashPin(pin,salt),'Statut inscription':'Accepté','Profil Free Fire JSON':JSON.stringify(profile),'Profil Free Fire synchronisé le':new Date().toISOString()}}]})});
  const player=created.records?.[0];if(!player?.id)throw new Error('Le compte n’a pas pu être enregistré.');
  const endpoint=isFcm?'https://fcm.googleapis.com/device/'+fcmToken:subscription.endpoint;
  await airtable(encodeURIComponent('Push subscriptions'),{method:'POST',body:JSON.stringify({records:[{fields:{Endpoint:endpoint,P256dh:isFcm?'FCM':subscription.keys.p256dh,Auth:isFcm?'FCM':subscription.keys.auth,'Player record ID':player.id,Pseudo:pseudo,UID:uid,Active:true,'Created At':new Date().toISOString()}}]})});
  const token=sign({role:'player',pinAuth:1,id:player.id,exp:Date.now()+10*365*24*60*60*1000});
  try{await queuePlayerEventNotification(player.id,'Profil vérifié !','Ton profil Free Fire a été vérifié avec succès. Bienvenue sur MALAWY OPEN UP ! Tu peux maintenant accéder à ton compte.','/#profile','player-verified:'+player.id);}catch(error){console.error('Notification de bienvenue non envoyée:',error.message);}
  return response(200,{success:true,token,player:{id:player.id,pseudo,uid,photo},message:'Profil vérifié avec succès. Bienvenue sur MALAWY OPEN UP !'});
 }catch(error){console.error('Inscription joueur:',error);return response(500,{error:'Impossible de terminer ton inscription pour le moment. Réessaie dans quelques instants.'});}
};