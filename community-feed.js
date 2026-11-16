(()=>{
const API='https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/community-feed', $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=$('#feedPosts'),modal=$('#feedComposer'),form=$('#feedComposerForm');if(!root||!modal||!form)return;
let posts=[],reply='';
const token=()=>localStorage.getItem('mou_player_token')||'';
async function api(method='GET',data){if(!navigator.onLine)throw Error('Vous n’êtes pas connecté à Internet.');const r=await fetch(API,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},...(data?{body:JSON.stringify(data)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Action impossible');return d;}
const dt=s=>s?new Date(s).toLocaleString('fr-FR'):'À l’instant';
function render(){ $('#feedCount').textContent=posts.length+' publication(s)';root.innerHTML=posts.map(p=>{
const count=t=>p.reactions.filter(r=>r.type===t).length;
const comments=p.comments.filter(c=>!c.parent);
return '<article class="feed-post" data-id="'+esc(p.id)+'"><header class="feed-author"><span class="feed-avatar">'+(p.photo?'<img src="'+esc(p.photo)+'" alt="">':esc((p.pseudo||'?')[0]))+'</span><span><b>'+esc(p.pseudo)+'</b><small>'+esc(dt(p.created))+'</small></span></header>'+(p.content?'<p class="feed-content">'+esc(p.content)+'</p>':'')+(p.image?'<img class="feed-image" src="'+esc(p.image)+'" alt="Photo de publication">':'')+'<div class="feed-reactions">'+[['J\'aime','👍'],['J\'adore','❤️'],['Haha','😂']].map(([t,e])=>'<button type="button" data-react="'+t+'" aria-pressed="'+p.reactions.some(r=>r.mine&&r.type===t)+'">'+e+' '+t+' '+count(t)+'</button>').join('')+'</div><div class="feed-comments">'+comments.map(c=>'<p><b>'+esc(c.pseudo)+'</b> '+esc(c.text)+' <button type="button" data-reply="'+esc(c.id)+'">Répondre</button>'+p.comments.filter(x=>x.parent===c.id).map(x=>'<br>↳ <b>'+esc(x.pseudo)+'</b> '+esc(x.text)).join('')+'</p>').join('')+'<form class="feed-comment-form"><input name="text" required maxlength="800" placeholder="Écrire un commentaire…"><button>Envoyer</button></form></div></article>';
}).join('')||'<p class="muted">Aucune publication pour le moment.</p>';}
async function refresh(){try{posts=(await api()).posts||[];render();}catch(e){root.innerHTML='<p class="muted">'+esc(e.message)+'</p>';}}
function open(){if(!token()){alert('Connecte-toi pour publier.');return;}modal.hidden=false;document.body.style.overflow='hidden';}
function close(){modal.hidden=true;document.body.style.overflow='';}
$('#feedOpenComposer').onclick=open;$('#feedFloatingButton').onclick=open;modal.querySelectorAll('[data-close]').forEach(x=>x.onclick=close);
form.elements.image.addEventListener('change',()=>{const f=form.elements.image.files[0],img=$('#feedPreview');if(!f){img.hidden=true;return;}if(f.size>8*1024*1024){form.elements.image.value='';alert('Photo limitée à 8 Mo.');return;}img.src=URL.createObjectURL(f);img.hidden=false;});
form.addEventListener('submit',async e=>{e.preventDefault();const msg=$('#feedMessage'),btn=form.querySelector('button[type=submit]');btn.disabled=true;try{let image='';const file=form.elements.image.files[0];if(file){msg.textContent='Envoi de la photo…';const fd=new FormData();fd.append('file',file);fd.append('upload_preset','malawy_photos');const up=await fetch('https://api.cloudinary.com/v1_1/owc0mtlg/image/upload',{method:'POST',body:fd}),d=await up.json();if(!up.ok)throw Error(d.error?.message||'Échec photo');image=d.secure_url;}await api('POST',{action:'publish',content:form.elements.content.value,image});form.reset();$('#feedPreview').hidden=true;close();await refresh();}catch(err){msg.textContent=err.message;}finally{btn.disabled=false;}});
root.addEventListener('click',async e=>{const post=e.target.closest('[data-id]');if(!post)return;try{if(e.target.dataset.react){await api('POST',{action:'react',postId:post.dataset.id,type:e.target.dataset.react});await refresh();}if(e.target.dataset.reply){reply=e.target.dataset.reply;post.querySelector('input[name=text]').placeholder='Répondre au commentaire…';post.querySelector('input[name=text]').focus();}}catch(err){alert(err.message);}});
root.addEventListener('submit',async e=>{if(!e.target.matches('.feed-comment-form'))return;e.preventDefault();const post=e.target.closest('[data-id]');try{await api('POST',{action:'comment',postId:post.dataset.id,parentId:reply,text:e.target.elements.text.value});reply='';await refresh();}catch(err){alert(err.message);}});
const toast=document.createElement('div');toast.id='feedConnectivity';toast.hidden=true;document.body.appendChild(toast);
addEventListener('offline',()=>{toast.textContent='Vous n’êtes pas connecté à Internet.';toast.hidden=false;});
addEventListener('online',()=>{toast.textContent='Connexion Internet rétablie.';toast.className='online';toast.hidden=false;setTimeout(()=>toast.hidden=true,3500);refresh();});
if(!navigator.onLine){toast.textContent='Vous n’êtes pas connecté à Internet.';toast.hidden=false;}
addEventListener('mou:player-auth',refresh);if(token())refresh();
})();
