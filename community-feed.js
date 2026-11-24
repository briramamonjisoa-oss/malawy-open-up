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

const actionIcon=(name)=>({
like:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 5.1-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.7a4.5 4.5 0 0 1 8.8-1.2 4.5 4.5 0 0 1 8.8 1.2Z"/></svg>',
love:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-8.5-5-8.5-11a4.7 4.7 0 0 1 8.5-2.7A4.7 4.7 0 0 1 20.5 9c0 6-8.5 11-8.5 11Z"/><path d="M8.5 11.5h7"/></svg>',
laugh:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.2 3 4 3 4-3 4-3M8.5 9.5h.01M15.5 9.5h.01"/></svg>'
}[name]||'');
function render(){
 $('#feedCount').textContent=posts.length+' publication(s)';
 root.innerHTML=posts.map(p=>{
  const count=t=>p.reactions.filter(r=>r.type===t).length;
  const comments=p.comments.filter(c=>!c.parent);
  return '<article class="feed-post" data-id="'+esc(p.id)+'"><header class="feed-author"><span class="feed-avatar">'+(p.photo?'<img src="'+esc(p.photo)+'" alt="">':esc((p.pseudo||'?')[0]))+'</span><span class="feed-author-meta"><b>'+esc(p.pseudo)+'</b><small>'+esc(dt(p.created))+'</small></span>'+(p.canDelete?'<button type="button" class="feed-delete" data-delete="1" aria-label="Supprimer cette publication" title="Supprimer">⋯</button>':'')+'</header>'+(p.content?'<p class="feed-content">'+esc(p.content)+'</p>':'')+photosMarkup(p.image)+'<div class="feed-reactions">'+[['J\\'aime','like'],['J\\'adore','love'],['Haha','laugh']].map(([t,icon])=>'<button type="button" class="feed-reaction" data-react="'+t+'" aria-pressed="'+p.reactions.some(r=>r.mine&&r.type===t)+'">'+actionIcon(icon)+'<span>'+t+'</span><small>'+count(t)+'</small></button>').join('')+'</div><div class="feed-comments">'+comments.map(c=>'<p><b>'+esc(c.pseudo)+'</b> '+esc(c.text)+' <button type="button" data-reply="'+esc(c.id)+'">Répondre</button>'+p.comments.filter(x=>x.parent===c.id).map(x=>'<br>↳ <b>'+esc(x.pseudo)+'</b> '+esc(x.text)).join('')+'</p>').join('')+'<form class="feed-comment-form"><input name="text" required maxlength="800" placeholder="Écrire un commentaire…"><button aria-label="Envoyer le commentaire">Envoyer</button></form></div></article>';
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

root.addEventListener('click',async e=>{const post=e.target.closest('[data-id]');if(!post)return;try{if(e.target.dataset.delete){if(!await confirmDelete())return;await api('POST',{action:'delete',postId:post.dataset.id});await refresh();return;}if(e.target.dataset.react){await api('POST',{action:'react',postId:post.dataset.id,type:e.target.dataset.react});await refresh();}if(e.target.dataset.reply){reply=e.target.dataset.reply;post.querySelector('input[name=text]').placeholder='Répondre au commentaire…';post.querySelector('input[name=text]').focus();}}catch(err){alert(err.message);}});
root.addEventListener('submit',async e=>{if(!e.target.matches('.feed-comment-form'))return;e.preventDefault();const post=e.target.closest('[data-id]');try{await api('POST',{action:'comment',postId:post.dataset.id,parentId:reply,text:e.target.elements.text.value});reply='';await refresh();}catch(err){alert(err.message);}});
const toast=document.createElement('div');toast.id='feedConnectivity';toast.hidden=true;document.body.appendChild(toast);
addEventListener('offline',()=>{toast.textContent='Vous n’êtes pas connecté à Internet.';toast.hidden=false;});
addEventListener('online',()=>{toast.textContent='Connexion Internet rétablie.';toast.className='online';toast.hidden=false;setTimeout(()=>toast.hidden=true,3500);refresh();});
if(!navigator.onLine){toast.textContent='Vous n’êtes pas connecté à Internet.';toast.hidden=false;}
addEventListener('mou:player-auth',refresh);if(token())refresh();
})();
