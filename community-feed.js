(()=>{
const API='https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/community-feed', $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=$('#feedPosts'),modal=$('#feedComposer'),form=$('#feedComposerForm');if(!root||!modal||!form)return;
let posts=[],reply='';
const token=()=>sessionStorage.getItem('mou_admin_token')||localStorage.getItem('mou_player_token')||'';
async function api(method='GET',data){if(!navigator.onLine)throw Error('Vous n’êtes pas connecté à Internet.');const r=await fetch(API,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},...(data?{body:JSON.stringify(data)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Action impossible');return d;}
const dt=s=>s?new Date(s).toLocaleString('fr-FR'):'À l’instant';
const photoList=value=>{if(!value)return[];try{const parsed=JSON.parse(value);if(Array.isArray(parsed))return parsed.filter(x=>typeof x==='string'&&/^https:\/\//.test(x));}catch{}return typeof value==='string'&&/^https:\/\//.test(value)?[value]:[];};
const photosMarkup=value=>{const urls=photoList(value);if(!urls.length)return'';return '<div class="feed-gallery feed-gallery-'+Math.min(urls.length,5)+'">'+urls.map((url,i)=>'<img class="feed-image" src="'+esc(url)+'" alt="Photo '+(i+1)+' de la publication" loading="lazy">').join('')+'</div>';};

function confirmDelete(){
 return new Promise(resolve=>{
  const overlay=document.createElement('div');overlay.className='mou-confirm-overlay';overlay.innerHTML='<div class="mou-confirm-card" role="dialog" aria-modal="true" aria-labelledby="mouConfirmTitle" aria-describedby="mouConfirmText"><span class="mou-confirm-kicker">MALAWY COMMUNITY</span><div class="mou-confirm-symbol">!</div><h3 id="mouConfirmTitle">Supprimer la publication ?</h3><p id="mouConfirmText">Cette action est définitive. La publication sera retirée du fil de la communauté.</p><div class="mou-confirm-actions"><button type="button" class="mou-confirm-cancel">Annuler</button><button type="button" class="mou-confirm-delete">Supprimer</button></div></div>';
  const finish=value=>{overlay.remove();document.removeEventListener('keydown',onKey);resolve(value);};
  const onKey=e=>{if(e.key==='Escape')finish(false);};
  overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false);});
  overlay.querySelector('.mou-confirm-cancel').addEventListener('click',()=>finish(false));
  overlay.querySelector('.mou-confirm-delete').addEventListener('click',()=>finish(true));
  document.addEventListener('keydown',onKey);document.body.appendChild(overlay);
  overlay.querySelector('.mou-confirm-delete').focus();
 });
}

const actionIcon=name=>({
like:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 5.1-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.7a4.5 4.5 0 0 1 8.8-1.2 4.5 4.5 0 0 1 8.8 1.2Z"/></svg>',
comment:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/></svg>',
share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-8.5 18-3.2-7.3L2 10.5 21 3Z"/><path d="m9.3 13.7 5-5"/></svg>',
save:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/></svg>'
}[name]||'');
function render(){
 $('#feedCount').textContent=posts.length+' publication(s)';
 root.innerHTML=posts.map(p=>{
  const likeCount=p.reactions.length;
  const commentCount=p.comments.length;
  const liked=p.reactions.some(r=>r.mine&&r.type==="J'aime");
  const saved=(JSON.parse(localStorage.getItem('mou_saved_posts')||'[]')).includes(String(p.id));
  const comments=p.comments.filter(c=>!c.parent);
  const commentMarkup=comments.map(c=>'<p><b>'+esc(c.pseudo)+'</b> '+esc(c.text)+' <button type="button" data-reply="'+esc(c.id)+'">Répondre</button>'+p.comments.filter(x=>x.parent===c.id).map(x=>'<br>↳ <b>'+esc(x.pseudo)+'</b> '+esc(x.text)).join('')+'</p>').join('');
  const hasPhoto=photoList(p.image).length>0;
  return '<article class="feed-post" data-id="'+esc(p.id)+'"><div class="feed-media '+(hasPhoto?'has-photo':'text-only')+'">'+photosMarkup(p.image)+'<header class="feed-author"><span class="feed-avatar">'+(p.photo?'<img src="'+esc(p.photo)+'" alt="">':esc((p.pseudo||'?')[0]))+'</span><span class="feed-author-meta"><b>'+esc(p.pseudo)+'</b><small>'+esc(dt(p.created))+'</small></span></header>'+(p.canDelete?'<button type="button" class="feed-delete" data-delete="1" aria-label="Plus d’options" title="Plus d’options">⋯</button>':'')+'<div class="feed-glass">'+(p.content?'<p class="feed-caption">'+esc(p.content)+'</p>':'')+'<div class="feed-reactions"><button type="button" class="feed-icon-action" data-react="J\'aime" aria-label="J’aime" aria-pressed="'+liked+'">'+actionIcon('like')+'<small>'+likeCount+'</small></button><button type="button" class="feed-icon-action" data-comments="1" aria-label="Commentaires">'+actionIcon('comment')+'<small>'+commentCount+'</small></button><button type="button" class="feed-icon-action" data-share="1" aria-label="Partager">'+actionIcon('share')+'</button><button type="button" class="feed-icon-action" data-save="1" aria-label="Enregistrer" aria-pressed="'+saved+'">'+actionIcon('save')+'</button></div></div></div><div class="feed-comments" hidden>'+commentMarkup+'<form class="feed-comment-form"><input name="text" required maxlength="800" placeholder="Écrire un commentaire…"><button aria-label="Envoyer le commentaire">Envoyer</button></form></div></article>';
 }).join('')||'<p class="muted">Aucune publication pour le moment.</p>';
}
async function refresh(){try{posts=(await api()).posts||[];render();}catch(e){root.innerHTML='<p class="muted">'+esc(e.message)+'</p>';}}
function open(){if(!token()){alert('Connecte-toi pour publier.');return;}modal.hidden=false;document.body.style.overflow='hidden';}
function close(){modal.hidden=true;document.body.style.overflow='';}
$('#feedOpenComposer').onclick=open;$('#feedFloatingButton').onclick=open;document.getElementById('mouSocialCreate')?.addEventListener('click',open);modal.querySelectorAll('[data-close]').forEach(x=>x.onclick=close);

const photoInput=form.elements.image,preview=$('#feedPreview'),previewCount=$('#feedPhotoCount');
function previewPhotos(){const files=Array.from(photoInput.files||[]);preview.innerHTML='';preview.hidden=!files.length;previewCount.textContent=files.length+'/5 photo(s)';files.forEach(file=>{const tile=document.createElement('div');tile.className='feed-preview-tile';const img=document.createElement('img');img.alt=file.name;img.src=URL.createObjectURL(file);tile.appendChild(img);preview.appendChild(tile);});}
photoInput.addEventListener('change',()=>{const files=Array.from(photoInput.files||[]);if(files.length>5){alert('Tu peux ajouter 5 photos maximum.');photoInput.value='';previewPhotos();return;}const oversized=files.find(file=>file.size>8*1024*1024);if(oversized){alert('Chaque photo doit faire 8 Mo maximum.');photoInput.value='';previewPhotos();return;}previewPhotos();});


form.addEventListener('submit',async e=>{e.preventDefault();const msg=$('#feedMessage'),btn=form.querySelector('button[type=submit]');btn.disabled=true;try{const files=Array.from(photoInput.files||[]);if(files.length>5)throw Error('5 photos maximum.');let images=[];for(let i=0;i<files.length;i++){msg.textContent='Envoi de la photo '+(i+1)+'/'+files.length+'…';const fd=new FormData();fd.append('file',files[i]);fd.append('upload_preset','malawy_photos');const up=await fetch('https://api.cloudinary.com/v1_1/owc0mtlg/image/upload',{method:'POST',body:fd}),d=await up.json();if(!up.ok)throw Error(d.error?.message||'Échec de l’envoi de la photo '+(i+1));images.push(d.secure_url);}const image=images.length?JSON.stringify(images):'';await api('POST',{action:'publish',content:form.elements.content.value,image});form.reset();preview.innerHTML='';preview.hidden=true;previewCount.textContent='0/5 photo(s)';close();await refresh();}catch(err){msg.textContent=err.message;}finally{btn.disabled=false;}});

root.addEventListener('click',async e=>{const post=e.target.closest('[data-id]');if(!post)return;try{if(e.target.dataset.delete){if(!await confirmDelete())return;await api('POST',{action:'delete',postId:post.dataset.id});await refresh();return;}if(e.target.closest('[data-comments]')){const panel=post.querySelector('.feed-comments');panel.hidden=!panel.hidden;if(!panel.hidden)panel.querySelector('input[name=text]').focus();return;}if(e.target.closest('[data-share]')){const url=location.href.split('#')[0]+'#post-'+encodeURIComponent(post.dataset.id);if(navigator.share){await navigator.share({title:'MALAWY OPEN UP',text:'Découvre cette publication',url});}else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);alert('Lien de la publication copié.');}else{alert(url);}return;}if(e.target.closest('[data-save]')){const key='mou_saved_posts',saved=JSON.parse(localStorage.getItem(key)||'[]'),id=String(post.dataset.id),next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];localStorage.setItem(key,JSON.stringify(next));e.target.closest('[data-save]').setAttribute('aria-pressed',String(next.includes(id)));return;}const reactButton=e.target.closest('[data-react]');if(reactButton){await api('POST',{action:'react',postId:post.dataset.id,type:reactButton.dataset.react});await refresh();}const replyButton=e.target.closest('[data-reply]');if(replyButton){reply=replyButton.dataset.reply;const panel=post.querySelector('.feed-comments');panel.hidden=false;post.querySelector('input[name=text]').placeholder='Répondre au commentaire…';post.querySelector('input[name=text]').focus();}}catch(err){alert(err.message);}});
root.addEventListener('submit',async e=>{if(!e.target.matches('.feed-comment-form'))return;e.preventDefault();const post=e.target.closest('[data-id]');try{await api('POST',{action:'comment',postId:post.dataset.id,parentId:reply,text:e.target.elements.text.value});reply='';await refresh();}catch(err){alert(err.message);}});
const toast=document.createElement('div');toast.id='feedConnectivity';toast.hidden=true;document.body.appendChild(toast);
addEventListener('offline',()=>{toast.textContent='Vous n’êtes pas connecté à Internet.';toast.hidden=false;});
addEventListener('online',()=>{toast.textContent='Connexion Internet rétablie.';toast.className='online';toast.hidden=false;setTimeout(()=>toast.hidden=true,3500);refresh();});
if(!navigator.onLine){toast.textContent='Vous n’êtes pas connecté à Internet.';toast.hidden=false;}
addEventListener('mou:player-auth',refresh);if(token())refresh();
})();
