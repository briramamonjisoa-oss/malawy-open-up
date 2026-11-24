const {airtable,verifyPlayer}=require('./auth');
const TABLE='tblxP7R5Pa9hbOJ1Z',REL='tblQoAGcQhii58Hwe';
const F={id:'fldH1TLes527ZVr36',author:'fldTXpmWUSxyw0ED6',pseudo:'fldgxaf9qpBZcEDLT',photo:'fldaxw9mvGKh2U1yL',media:'fldo3TPTUqnJ9AWno',caption:'fldkEy60HPPnCXxzA',created:'fldVZLJAKABNvO3l3',expires:'fldi1GHX4OujTzEDc',audience:'fld7RVLnuwGeDmiJZ',status:'fldET3vMcOO4SokUr'};
const R={from:'fldV969gNKryDledy',to:'fldbn9UWoDNNZPpS6',status:'fldV1k5nClaf3CT9M'};
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
const body=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
async function all(table){let rows=[],offset;do{const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true'});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);rows.push(...(d.records||[]));offset=d.offset;}while(offset&&rows.length<1000);return rows;}
exports.handler=async event=>{
 const me=verifyPlayer(event);if(!me)return out(401,{error:'Connecte-toi pour accéder aux stories.'});
 const b=body(event),now=Date.now();
 try{
  const [player,relations]=await Promise.all([airtable('Inscriptions/'+encodeURIComponent(me.id)+'?returnFieldsByFieldId=true'),all(REL)]);
  const pf=player.fields||{},pseudo=String(pf['Pseudo Free Fire']||me.pseudo||'Joueur'),photo=String(pf.Photo||'');
  const friends=new Set(relations.filter(x=>x.fields?.[R.status]==='Acceptée'&&(x.fields[R.from]===me.id||x.fields[R.to]===me.id)).map(x=>x.fields[R.from]===me.id?x.fields[R.to]:x.fields[R.from]));
  if(event.httpMethod==='GET'){
   const rows=await all(TABLE);
   const visible=rows.filter(x=>{const f=x.fields||{};return f[F.status]==='Publié'&&Date.parse(f[F.expires]||'')>now&&(f[F.author]===me.id||f[F.audience]==='Tous'||(f[F.audience]==='Amis'&&friends.has(f[F.author])));});
   return out(200,{stories:visible.sort((a,b)=>String(a.fields[F.created]).localeCompare(String(b.fields[F.created]))).map(x=>{const f=x.fields||{};return{id:x.id,authorId:f[F.author],pseudo:f[F.pseudo]||'Joueur',photo:f[F.photo]||'',media:f[F.media]||'',caption:f[F.caption]||'',created:f[F.created]||'',expires:f[F.expires]||'',mine:f[F.author]===me.id};})});
  }
  if(event.httpMethod!=='POST')return out(405,{error:'Méthode non autorisée.'});
  if(b.action==='publish'){
   const media=String(b.media||''),caption=String(b.caption||'').trim(),audience=b.audience==='Tous'?'Tous':'Amis';
   if(!media||!/^https:\/\//i.test(media))return out(400,{error:'Ajoute une photo ou une vidéo valide.'});
   if(caption.length>180)return out(400,{error:'La légende est trop longue.'});
   const created=new Date().toISOString(),expires=new Date(now+86400000).toISOString(),id=me.id+'_'+Date.now();
   const d=await airtable(encodeURIComponent(TABLE),{method:'POST',body:JSON.stringify({records:[{fields:{[F.id]:id,[F.author]:me.id,[F.pseudo]:pseudo,[F.photo]:photo,[F.media]:media,[F.caption]:caption,[F.created]:created,[F.expires]:expires,[F.audience]:audience,[F.status]:'Publié'}}]})});
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