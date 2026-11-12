const crypto=require('crypto');
const {airtable,verifyPlayer}=require('./auth');
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, GET, PATCH, OPTIONS'};
const sign=(data)=>{const payload=Buffer.from(JSON.stringify(data)).toString('base64url');const secret=(globalThis.__MOU_ENV || process.env).ADMIN_CODE;if(!secret)throw new Error('ADMIN_CODE absent des variables et secrets du Worker Cloudflare');const signature=crypto.createHmac('sha256',secret).update(payload).digest('base64url');return payload+'.'+signature;};
const hashPin=(pin,salt)=>crypto.scryptSync(pin,salt,64).toString('hex');
const validPin=(pin,stored)=>{try{const [salt,hash]=String(stored||'').split('$');if(!salt||!hash)return false;const actual=Buffer.from(hashPin(pin,salt),'hex'),expected=Buffer.from(hash,'hex');return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);}catch{return false;}};
const isApproved=(status)=>['accepte','acceptee','accepted','valide','validee','approved'].includes(String(status||'').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,''));
exports.handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
 try{
  if(event.httpMethod==='POST'){
   const {pseudo,playerId,pin,photo}=JSON.parse(event.body||'{}');
   if(!pseudo||!playerId||!/^[0-9]{4,8}$/.test(String(pin||'')))return{statusCode:400,headers,body:JSON.stringify({error:'Saisis ton pseudo, ton UID et un PIN de 4 à 8 chiffres.'})};
   let records=[],offset;
   do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable('Inscriptions?'+q);records.push(...(d.records||[]));offset=d.offset;}while(offset);
   const matches=records.filter(r=>String(r.fields['Pseudo Free Fire']||'').trim().toLowerCase()===String(pseudo).trim().toLowerCase()&&String(r.fields['ID Free Fire']||'').trim()===String(playerId).trim());
   if(matches.length!==1)return{statusCode:401,headers,body:JSON.stringify({error:'Pseudo ou UID incorrect.'})};
   const r=matches[0],fields=r.fields||{},status=fields['Statut inscription']||'En attente';
   if(!isApproved(status))return{statusCode:403,headers,body:JSON.stringify({error:'Ton inscription doit être acceptée par un administrateur avant de te connecter.'})};
   let pinStored=fields['PIN hash']||'';
   // Les anciens comptes acceptés, créés avant l'ajout du PIN, initialisent leur PIN à la première connexion.
   if(!pinStored){
    const salt=crypto.randomBytes(16).toString('hex');
    pinStored=salt+'
   const token=sign({role:'player',pinAuth:1,id:r.id,exp:Date.now()+10*365*24*60*60*1000});
   return{statusCode:200,headers,body:JSON.stringify({success:true,token})};
  }
  if(event.httpMethod==='GET'){
   const session=verifyPlayer(event);if(!session)return{statusCode:401,headers,body:JSON.stringify({error:'Session joueur expirée. Reconnecte-toi.'})};
   const r=await airtable('Inscriptions/'+encodeURIComponent(session.id));
   const f=r.fields||{},pseudo=f['Pseudo Free Fire']||'Joueur';
   if(!isApproved(f['Statut inscription']))return{statusCode:403,headers,body:JSON.stringify({error:'Ton inscription n’est plus acceptée.'})};
   let matches=[],offset;
   do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable('Matchs?'+q);matches.push(...(d.records||[]));offset=d.offset;}while(offset);
   const history=matches.filter(m=>[m.fields['Équipe A'],m.fields['Équipe B']].some(n=>String(n||'').trim().toLowerCase()===pseudo.toLowerCase())&&(m.fields.Statut||'Terminé')==='Terminé').map(m=>({a:m.fields['Équipe A']||'',b:m.fields['Équipe B']||'',sa:Number(m.fields['Score A'])||0,sb:Number(m.fields['Score B'])||0,date:m.fields['Date du match']||''})).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
   let signups=[],signupOffset;
   do{const q=new URLSearchParams({pageSize:'100'});if(signupOffset)q.set('offset',signupOffset);const d=await airtable(encodeURIComponent('Inscriptions tournois')+'?'+q);signups.push(...(d.records||[]));signupOffset=d.offset;}while(signupOffset);
   const uid=String(f['ID Free Fire']||'').trim();
   const tournamentSignups=signups.filter(s=>{
    const sf=s.fields||{};
    for(let i=1;i<=4;i++)if(String(sf['ID joueur '+i]||'').trim()===uid)return true;
    for(let i=1;i<=2;i++)if(String(sf['ID remplaçant '+i]||'').trim()===uid)return true;
    return String(sf['ID Free Fire chef']||'').trim()===uid;
   }).map(s=>({id:s.id,tournamentId:s.fields['ID tournoi']||'',tournamentName:s.fields['Nom tournoi']||'Tournoi',game:s.fields.Jeu||'',format:s.fields.Format||'',status:s.fields.Statut||'En attente'}));
   return{statusCode:200,headers,body:JSON.stringify({id:r.id,pseudo,playerId:f['ID Free Fire']||'',mode:f['Mode de combat']||'',photo:f.Photo||'',points:Number(f.Points)||0,wins:Number(f.Victoires)||0,losses:Number(f.Défaites)||0,status:f['Statut inscription']||'',matches:history,tournamentSignups})};
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
+hashPin(String(pin),salt);
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
   const f=r.fields||{},pseudo=f['Pseudo Free Fire']||'Joueur';
   if((f['Statut inscription']||'')!=='Accepté')return{statusCode:403,headers,body:JSON.stringify({error:'Ton inscription n’est plus acceptée.'})};
   let matches=[],offset;
   do{const q=new URLSearchParams({pageSize:'100'});if(offset)q.set('offset',offset);const d=await airtable('Matchs?'+q);matches.push(...(d.records||[]));offset=d.offset;}while(offset);
   const history=matches.filter(m=>[m.fields['Équipe A'],m.fields['Équipe B']].some(n=>String(n||'').trim().toLowerCase()===pseudo.toLowerCase())&&(m.fields.Statut||'Terminé')==='Terminé').map(m=>({a:m.fields['Équipe A']||'',b:m.fields['Équipe B']||'',sa:Number(m.fields['Score A'])||0,sb:Number(m.fields['Score B'])||0,date:m.fields['Date du match']||''})).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
   let signups=[],signupOffset;
   do{const q=new URLSearchParams({pageSize:'100'});if(signupOffset)q.set('offset',signupOffset);const d=await airtable(encodeURIComponent('Inscriptions tournois')+'?'+q);signups.push(...(d.records||[]));signupOffset=d.offset;}while(signupOffset);
   const uid=String(f['ID Free Fire']||'').trim();
   const tournamentSignups=signups.filter(s=>{
    const sf=s.fields||{};
    for(let i=1;i<=4;i++)if(String(sf['ID joueur '+i]||'').trim()===uid)return true;
    for(let i=1;i<=2;i++)if(String(sf['ID remplaçant '+i]||'').trim()===uid)return true;
    return String(sf['ID Free Fire chef']||'').trim()===uid;
   }).map(s=>({id:s.id,tournamentId:s.fields['ID tournoi']||'',tournamentName:s.fields['Nom tournoi']||'Tournoi',game:s.fields.Jeu||'',format:s.fields.Format||'',status:s.fields.Statut||'En attente'}));
   return{statusCode:200,headers,body:JSON.stringify({id:r.id,pseudo,playerId:f['ID Free Fire']||'',mode:f['Mode de combat']||'',photo:f.Photo||'',points:Number(f.Points)||0,wins:Number(f.Victoires)||0,losses:Number(f.Défaites)||0,status:f['Statut inscription']||'',matches:history,tournamentSignups})};
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
