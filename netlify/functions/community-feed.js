const {airtable,verifyPlayer,verify}=require('./auth');
const POSTS='tbltBxmUUVIfPYLCs',REACTIONS='tblQ9pxLdxCtRikyR',COMMENTS='tblMi1WWNVioVT2As',PLAYERS='tblz0rJpaQBpafBN2';
const F={p:{title:'fldohdagvSTcjPbMD',author:'flde1j39JdPXunYKk',pseudo:'fld7S8WadtrhtitNs',photo:'fld6DAinzN0BXHfxO',content:'fldfNdaDjLNPExWu4',image:'fldGcsqV9Hgh6JMqA',created:'fld66Uh2GK2kdZpOL',status:'fldt5TLMRPoj9kox5'},r:{key:'fldOjwBK4D9VW2eVs',post:'fldnD3s3S8yXDBwBO',author:'fldlkKxt0144dAALY',type:'fldPmKe5VyFbTTKJp',created:'flddbbu8Etwccrdfz'},c:{text:'fldDIQiZn8NBE1b8h',post:'fldfe4dqKQTp2DIGl',parent:'fldlAGClV0n0Ut7GW',author:'fld13nH3PfYI4n5bF',pseudo:'fldC7kjuSfbQJId8P',photo:'flddzRuP7lCM4g2fT',created:'fldcm8YXYQXoP9tVO'}};
const out=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
const parse=e=>{try{return JSON.parse(e.body||'{}')}catch{return {}}};
const tableCache=new Map(),tableInflight=new Map();
async function all(table){
 const cached=tableCache.get(table);if(cached&&Date.now()-cached.time<10000)return cached.rows;
 if(tableInflight.has(table))return tableInflight.get(table);
 const task=(async()=>{let records=[],offset;do{const q=new URLSearchParams({pageSize:'100',returnFieldsByFieldId:'true'});if(offset)q.set('offset',offset);const d=await airtable(encodeURIComponent(table)+'?'+q);records.push(...(d.records||[]));offset=d.offset;}while(offset&&records.length<500);tableCache.set(table,{time:Date.now(),rows:records});return records;})();
 tableInflight.set(table,task);try{return await task;}finally{tableInflight.delete(table);}
}
exports.handler=async event=>{
 const player=verifyPlayer(event),admin=verify(event);if(!player&&!admin)return out(401,{error:'Connecte-toi pour accéder à la communauté.'});
 const method=event.httpMethod||'GET',body=parse(event),now=new Date().toISOString();
 try{
  let playerPseudo='Joueur',playerPhoto='';
  if(method==='GET'){
   const scope=event.queryStringParameters?.scope||'all';
   const [posts,reactions,comments,relations]=await Promise.all([all(POSTS),all(REACTIONS),all(COMMENTS),(scope==='public'||scope==='friends')&&player?all('tblQoAGcQhii58Hwe'):Promise.resolve([])]);
   const accepted=new Set(relations.filter(r=>r.fields?.fldV1k5nClaf3CT9M==='Acceptée').flatMap(r=>[r.fields?.fldV969gNKryDledy,r.fields?.fldbn9UWoDNNZPpS6]).filter(id=>id&&id!==player?.id));
   const visible=posts.filter(x=>{const author=x.fields?.[F.p.author]||'';return x.fields?.[F.p.status]==='Publié'&&(scope==='public'?author!==player?.id&&!accepted.has(author):scope==='friends'?author===player?.id||accepted.has(author):true);});
   return out(200,{viewerId:player?.id||'',posts:visible.sort((a,b)=>(b.fields[F.p.created]||'').localeCompare(a.fields[F.p.created]||'')).map(x=>{const f=x.fields||{};return{id:x.id,authorId:f[F.p.author]||'',canDelete:Boolean(admin||(player&&f[F.p.author]===player.id)),pseudo:f[F.p.pseudo]||'Joueur',photo:f[F.p.photo]||'',content:f[F.p.content]||'',image:f[F.p.image]||'',created:f[F.p.created]||'',reactions:reactions.filter(r=>r.fields?.[F.r.post]===x.id).map(r=>({type:r.fields[F.r.type],mine:Boolean(player&&r.fields[F.r.author]===player.id)})),comments:comments.filter(c=>c.fields?.[F.c.post]===x.id).map(c=>({id:c.id,text:c.fields[F.c.text]||'',parent:c.fields[F.c.parent]||'',pseudo:c.fields[F.c.pseudo]||'Joueur',photo:c.fields[F.c.photo]||'',created:c.fields[F.c.created]||''}))};})});
  }
  if(method!=='POST')return out(405,{error:'Méthode non autorisée.'});
  if(body.action==='delete'){
   const postId=String(body.postId||'');if(!postId)return out(400,{error:'Publication introuvable.'});
   const post=await airtable(encodeURIComponent(POSTS)+'/'+encodeURIComponent(postId)+'?returnFieldsByFieldId=true');
   if(!admin&&(!player||post.fields?.[F.p.author]!==player.id))return out(403,{error:'Tu ne peux supprimer que tes propres publications.'});
   await airtable(encodeURIComponent(POSTS)+'/'+encodeURIComponent(postId),{method:'DELETE'});tableCache.delete(POSTS);
   return out(200,{success:true});
  }
  if(!player)return out(403,{error:'Un compte joueur est nécessaire pour cette action.'});
  if(body.action==='publish'||body.action==='comment'){
   const playerRecord=await airtable(PLAYERS+'/'+encodeURIComponent(player.id));const playerFields=playerRecord.fields||{};playerPseudo=String(playerFields['Pseudo Free Fire']||'Joueur').slice(0,32);playerPhoto=String(playerFields.Photo||'');
  }
  if(body.action==='publish'){
   const text=String(body.content||'').trim(),image=String(body.image||'');if(!text&&!image)return out(400,{error:'Ajoute un texte ou une photo.'});if(text.length>2000)return out(400,{error:'Publication trop longue.'});
   const pseudo=String(playerPseudo||'Joueur').slice(0,32);
   const r=await airtable(encodeURIComponent(POSTS),{method:'POST',body:JSON.stringify({records:[{fields:{[F.p.title]:text.slice(0,70)||'Photo de '+pseudo,[F.p.author]:player.id,[F.p.pseudo]:pseudo,[F.p.photo]:playerPhoto||'',[F.p.content]:text,[F.p.image]:image,[F.p.created]:now,[F.p.status]:'Publié'}}]})});
   tableCache.delete(POSTS);
   return out(201,{success:true,id:r.records?.[0]?.id});
  }
  if(body.action==='react'){
   const postId=String(body.postId||''),type=String(body.type||'');if(!['J\'aime','J\'adore','Haha'].includes(type))return out(400,{error:'Réaction invalide.'});
   const key=postId+'_'+player.id,old=(await all(REACTIONS)).filter(r=>r.fields?.[F.r.key]===key);
   if(old.length)await airtable(encodeURIComponent(REACTIONS)+'/'+encodeURIComponent(old[0].id),{method:'PATCH',body:JSON.stringify({fields:{[F.r.type]:type,[F.r.created]:now}})});
   else await airtable(encodeURIComponent(REACTIONS),{method:'POST',body:JSON.stringify({records:[{fields:{[F.r.key]:key,[F.r.post]:postId,[F.r.author]:player.id,[F.r.type]:type,[F.r.created]:now}}]})});
   tableCache.delete(REACTIONS);
   return out(200,{success:true});
  }
  if(body.action==='comment'){
   const text=String(body.text||'').trim();if(!text||text.length>800)return out(400,{error:'Commentaire invalide.'});
   await airtable(encodeURIComponent(COMMENTS),{method:'POST',body:JSON.stringify({records:[{fields:{[F.c.text]:text,[F.c.post]:String(body.postId||''),[F.c.parent]:String(body.parentId||''),[F.c.author]:player.id,[F.c.pseudo]:String(playerPseudo||'Joueur').slice(0,32),[F.c.photo]:playerPhoto||'',[F.c.created]:now}}]})});
   tableCache.delete(COMMENTS);
   return out(201,{success:true});
  }
  return out(400,{error:'Action inconnue.'});
 }catch(e){console.error('community-feed',e);return out(500,{error:'Erreur lors du traitement de la communauté.'});}
};
