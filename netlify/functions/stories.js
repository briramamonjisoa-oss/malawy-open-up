const {airtable,verifyPlayer}=require('./auth');
const TABLE='tblxP7R5Pa9hbOJ1Z',REL='tblQoAGcQhii58Hwe',PLAYERS='tblz0rJpaQBpafBN2';
const F={author:'fldTXpmWUSxyw0ED6',pseudo:'fldgxaf9qpBZcEDLT',photo:'fldaxw9mvGKh2U1yL',media:'fldo3TPTUqnJ9AWno',caption:'fldkEy60HPPnCXxzA',created:'fldVZLJAKABNvO3l3',expires:'fldi1GHX4OujTzEDc',audience:'fld7RVLnuwGeDmiJZ',status:'fldET3vMcOO4SokUr'};
const R={from:'fldV969gNKryDledy',to:'fldbn9UWoDNNZPpS6',status:'fldV1k5nClaf3CT9M'};
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
const body=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
async function all(table){let rows=[],offset;do{const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true'});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);rows.push(...(d.records||[]));offset=d.offset;}while(offset&&rows.length<1000);return rows;}
exports.handler=async event=>{
 const me=verifyPlayer(event);if(!me)return out(401,{error:'Connecte-toi pour accéder aux stories.'});
 const b=body(event),now=Date.now();
 try{
  if(event.httpMethod==='GET'){
   // Charger d'abord les stories : une panne de lecture des relations ne doit
   // jamais masquer les stories publiques ou celles du joueur connecté.
   const rows=await all(TABLE);
   let friends=new Set();
   try{
    const relations=await all(REL);
    friends=new Set(relations.filter(x=>x.fields?.[R.status]==='Acceptée'&&(x.fields[R.from]===me.id||x.fields[R.to]===me.id)).map(x=>x.fields[R.from]===me.id?x.fields[R.to]:x.fields[R.from]));
   }catch(relationError){console.warn('Stories: relations indisponibles, stories publiques conservées',relationError);}
   const playerRows=await all(PLAYERS).catch(()=>[]),playerMap=new Map(playerRows.map(x=>[x.id,x.fields||{}]));
   const reactionRows=await all('tbll4617fx7IWwHIF').catch(()=>[]);
   const visible=rows.filter(x=>{const f=x.fields||{};const expiry=Date.parse(f[F.expires]||'')||Date.parse(f[F.created]||'')+86400000;return f[F.status]==='Publié'&&expiry>now&&(f[F.author]===me.id||f[F.audience]==='Tous'||(f[F.audience]==='Amis'&&friends.has(f[F.author])));});
   return out(200,{stories:visible.sort((a,b)=>String(a.fields[F.created]).localeCompare(String(b.fields[F.created]))).map(x=>{const f=x.fields||{},p=playerMap.get(f[F.author])||{},rr=reactionRows.filter(r=>r.fields?.fldkr9L5Ba2XOEl1J===x.id);return{id:x.id,authorId:f[F.author],pseudo:f[F.pseudo]||p.fldaNsxza3T3krjfr||'Joueur',photo:f[F.photo]||p.flds2WZeeSrLJZVOC||'',media:f[F.media]||'',caption:f[F.caption]||'',created:f[F.created]||'',expires:f[F.expires]||'',mine:f[F.author]===me.id,reactionCounts:{'Cœur':rr.filter(r=>r.fields?.fldCZIIrH61GvxqIB==='Cœur').length,'Étoile':rr.filter(r=>r.fields?.fldCZIIrH61GvxqIB==='Étoile').length},myReaction:rr.find(r=>r.fields?.fldoE2V95Bib1KJuv===me.id)?.fields?.fldCZIIrH61GvxqIB||''};})});
  }
  if(event.httpMethod==='POST'&&b.action==='react'){
   const storyId=String(b.storyId||''),type=String(b.type||'');
   if(!storyId||!['Cœur','Étoile'].includes(type))return out(400,{error:'Réaction invalide.'});
   const story=await airtable(encodeURIComponent(TABLE)+'/'+encodeURIComponent(storyId)+'?returnFieldsByFieldId=true'),sf=story.fields||{},expiry=Date.parse(sf[F.expires]||'')||Date.parse(sf[F.created]||'')+86400000;
   if(sf[F.status]!=='Publié'||expiry<=Date.now())return out(404,{error:'Cette story n’est plus disponible.'});
   if(sf[F.author]!==me.id&&sf[F.audience]==='Amis'){
    const relations=await all(REL),ok=relations.some(r=>r.fields?.[R.status]==='Acceptée'&&((r.fields[R.from]===me.id&&r.fields[R.to]===sf[F.author])||(r.fields[R.to]===me.id&&r.fields[R.from]===sf[F.author])));
    if(!ok)return out(403,{error:'Cette story est réservée aux amis.'});
   }
   const key=storyId+'_'+me.id,reactions=await all('tbll4617fx7IWwHIF'),existing=reactions.find(r=>r.fields?.fldqXaCFYR72SubYI===key);
   if(existing&&existing.fields?.fldCZIIrH61GvxqIB===type){await airtable('tbll4617fx7IWwHIF/'+encodeURIComponent(existing.id),{method:'DELETE'});return out(200,{success:true,reaction:'',removed:true});}
   const player=await airtable(PLAYERS+'/'+encodeURIComponent(me.id)+'?returnFieldsByFieldId=true'),pseudo=String(player.fields?.fldaNsxza3T3krjfr||me.pseudo||'Joueur');
   const fields={fldqXaCFYR72SubYI:key,fldkr9L5Ba2XOEl1J:storyId,fldoE2V95Bib1KJuv:me.id,fldFh0WBIdJAY4GS9:pseudo,fldCZIIrH61GvxqIB:type,fldHPLMaG6xZskuIX:new Date().toISOString()};
   if(existing)await airtable('tbll4617fx7IWwHIF/'+encodeURIComponent(existing.id),{method:'PATCH',body:JSON.stringify({fields})});
   else await airtable('tbll4617fx7IWwHIF',{method:'POST',body:JSON.stringify({records:[{fields}]})});
   return out(200,{success:true,reaction:type});
  }
  const player=await airtable(PLAYERS+'/'+encodeURIComponent(me.id)+'?returnFieldsByFieldId=true');
  const pf=player.fields||{},pseudo=String(pf.fldaNsxza3T3krjfr||me.pseudo||'Joueur'),photo=String(pf.flds2WZeeSrLJZVOC||'');
  if(event.httpMethod!=='POST')return out(405,{error:'Méthode non autorisée.'});
  if(b.action==='publish'){
   const media=String(b.media||''),caption=String(b.caption||'').trim(),audience=b.audience==='Tous'?'Tous':'Amis';
   if(!media||!/^https:\/\//i.test(media))return out(400,{error:'Ajoute une photo ou une vidéo valide.'});
   if(caption.length>180)return out(400,{error:'La légende est trop longue.'});
   const created=new Date().toISOString(),expires=new Date(now+86400000).toISOString();
   const d=await airtable(encodeURIComponent(TABLE),{method:'POST',body:JSON.stringify({records:[{fields:{[F.author]:me.id,[F.pseudo]:pseudo,[F.photo]:photo,[F.media]:media,[F.caption]:caption,[F.created]:created,[F.expires]:expires,[F.audience]:audience,[F.status]:'Publié'}}]})});
   return out(201,{success:true,id:d.records?.[0]?.id});
  }
  if(b.action==='delete'){
   const id=String(b.storyId||''),record=await airtable(encodeURIComponent(TABLE)+'/'+encodeURIComponent(id)+'?returnFieldsByFieldId=true');
   if(record.fields?.[F.author]!==me.id)return out(403,{error:'Tu peux supprimer uniquement tes propres stories.'});
   await airtable(encodeURIComponent(TABLE)+'/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({fields:{[F.status]:'Supprimé'}})});
   return out(200,{success:true});
  }
  return out(400,{error:'Action inconnue.'});
 }catch(e){return out(500,{error:e.message||'Erreur stories.'});}
};