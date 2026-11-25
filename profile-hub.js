(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let built = false;
  function mount() {
    const profile = $('#playerProfile');
    if (!profile || built || !$('#profilePseudo').textContent.trim()) return;
    const friends = $('#mouFriends', profile);
    if (!friends) return;
    built = true;

    const freeFire = $('#freeFireProfileCard', profile);
    const stats = $('.stats', profile);
    const history = $('#profileMatches', profile);
    const photoLabel = $('#profilePhoto', profile)?.closest('label');
    const savePhoto = $('#saveProfilePhoto', profile);
    const photoMsg = $('#profileMsg', profile);
    const logout = $('#playerLogout', profile);
    const presence = $('#mouPresenceSettings', friends);

    const shell = document.createElement('div');
    shell.id = 'mouProfileHub';
    shell.innerHTML = `
      <div class="mou-profile-identity">
        <div class="mou-profile-avatar" id="mouProfileHubAvatar"></div>
        <div class="mou-profile-identity-copy"><span class="mou-profile-kicker">ESPACE PERSONNEL</span><h2 id="mouProfileHubName"></h2><p id="mouProfileHubUid"></p><span class="mou-profile-status" id="mouProfileHubStatus"></span></div>
      </div>
      <div class="mou-profile-score" id="mouProfileScore"></div>
      <div class="mou-profile-grid">
        <button type="button" data-profile-open="game"><span>◈</span><b>Profil Free Fire</b><small>Rangs, guilde et statistiques</small><i>›</i></button>
        <button type="button" data-profile-open="network"><span>♧</span><b>Mon réseau</b><small>Amis et demandes</small><i>›</i><em id="mouProfileFriendCount">0</em></button>
        <button type="button" data-profile-open="presence"><span>◉</span><b>Présence</b><small>Confidentialité et joueurs en ligne</small><i>›</i></button>
        <button type="button" data-profile-open="history"><span>⌁</span><b>Historique</b><small>Matchs et résultats</small><i>›</i></button>
        <button type="button" data-profile-open="photo"><span>◎</span><b>Photo de profil</b><small>Modifier mon image</small><i>›</i></button>
      </div>
      <div class="mou-profile-account"><div><b>Compte MALAWY</b><small>Session sécurisée avec ton PIN</small></div><button type="button" id="mouProfileLogout">Déconnexion</button></div>
      <div class="mou-profile-modal" id="mouProfileModal" hidden>
        <div class="mou-profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="mouProfileModalTitle">
          <header><button type="button" id="mouProfileBack" aria-label="Retour au profil">‹</button><div><span class="mou-profile-kicker">MALAWY OPEN UP</span><h2 id="mouProfileModalTitle">Mon espace</h2></div><button type="button" id="mouProfileClose" aria-label="Fermer">×</button></header>
          <div class="mou-profile-modal-content" id="mouProfileModalContent"></div>
        </div>
      </div>`;
    profile.insertBefore(shell, stats || profile.firstChild);

    const style = document.createElement('style');
    style.id = 'mouProfileHubStyles';
    style.textContent = `
      #playerProfile{display:block!important;min-width:0;overflow:visible;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
      #mouProfileHub{width:100%;min-width:0;display:grid;gap:15px;color:#f3eee5}
      #mouProfileHub *{box-sizing:border-box;min-width:0}
      #mouProfileHub .mou-profile-identity{display:flex;align-items:center;gap:14px;padding:18px;border:1px solid rgba(216,193,138,.25);border-radius:22px;background:radial-gradient(circle at 100% 0,rgba(216,193,138,.13),transparent 55%),linear-gradient(145deg,#171613,#08090b)}
      #mouProfileHub .mou-profile-avatar{width:68px;height:68px;flex:0 0 68px;display:grid;place-items:center;overflow:hidden;border:1px solid #9d8858;border-radius:20px;background:#090909;color:#ddc68e;font-size:26px;font-weight:900}
      #mouProfileHub .mou-profile-avatar img{width:100%;height:100%;object-fit:cover}
      #mouProfileHub .mou-profile-identity-copy{flex:1;overflow:hidden}
      #mouProfileHub .mou-profile-kicker{color:#d8c18a;font-size:9px;letter-spacing:.18em;font-weight:800}
      #mouProfileHub .mou-profile-identity h2{margin:4px 0;font-size:22px;line-height:1.15;overflow-wrap:anywhere}
      #mouProfileHub .mou-profile-identity p{margin:0;color:#aaa295;font-size:11px}
      #mouProfileHub .mou-profile-status{display:inline-block;margin-top:7px;padding:4px 8px;border:1px solid rgba(216,193,138,.22);border-radius:20px;color:#d8c18a;font-size:9px}
      #mouProfileHub .mou-profile-score{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #mouProfileHub .mou-profile-score article{display:grid;gap:4px;padding:12px 7px;text-align:center;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:rgba(255,255,255,.035)}
      #mouProfileHub .mou-profile-score strong{color:#e4cd94;font-size:21px}
      #mouProfileHub .mou-profile-score span{color:#a9a193;font-size:10px}
      #mouProfileHub .mou-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #mouProfileHub .mou-profile-grid button{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) 14px;grid-template-rows:auto auto;align-items:center;column-gap:9px;min-height:78px;padding:12px;text-align:left;border:1px solid rgba(216,193,138,.18);border-radius:16px;background:linear-gradient(145deg,rgba(30,28,23,.94),rgba(10,11,13,.98));color:#eee7da}
      #mouProfileHub .mou-profile-grid button>span{grid-row:1/3;display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(216,193,138,.22);border-radius:11px;color:#dfc98f;font-size:20px}
      #mouProfileHub .mou-profile-grid b{font-size:12px;line-height:1.25}
      #mouProfileHub .mou-profile-grid small{color:#969083;font-size:9px;line-height:1.3}
      #mouProfileHub .mou-profile-grid i{grid-column:3;grid-row:1/3;color:#d8c18a;font-size:21px;font-style:normal}
      #mouProfileHub .mou-profile-grid em{position:absolute;right:27px;top:8px;min-width:17px;padding:2px 5px;border-radius:20px;background:#d8c18a;color:#100f0c;font-size:9px;font-style:normal;text-align:center}
      #mouProfileHub .mou-profile-account{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.025)}
      #mouProfileHub .mou-profile-account b{display:block;font-size:11px}
      #mouProfileHub .mou-profile-account small{display:block;margin-top:3px;color:#928b7f;font-size:9px}
      #mouProfileHub .mou-profile-account button{padding:9px 12px;border:1px solid rgba(216,193,138,.25);border-radius:10px;background:transparent;color:#d8c18a;font-size:10px;font-weight:700}
      #mouProfileHub .mou-profile-modal{position:fixed;inset:0;z-index:12000;display:flex;align-items:stretch;justify-content:center;padding:calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));background:rgba(0,0,0,.86);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      #mouProfileHub .mou-profile-modal[hidden]{display:none!important}
      #mouProfileHub .mou-profile-modal-card{display:flex;flex-direction:column;width:min(100%,560px);max-height:100%;overflow:hidden;border:1px solid rgba(216,193,138,.34);border-radius:24px;background:linear-gradient(160deg,#171613,#070809);box-shadow:0 25px 90px #000}
      #mouProfileHub .mou-profile-modal-card>header{display:flex;align-items:center;gap:12px;padding:15px;border-bottom:1px solid rgba(255,255,255,.08)}
      #mouProfileHub .mou-profile-modal-card>header>div{flex:1}
      #mouProfileHub .mou-profile-modal-card>header h2{margin:3px 0 0;font-size:20px}
      #mouProfileHub .mou-profile-modal-card>header button{width:38px;height:38px;border:1px solid rgba(216,193,138,.24);border-radius:12px;background:rgba(255,255,255,.04);color:#e3cf9b;font-size:24px}
      #mouProfileHub .mou-profile-modal-content{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:15px}
      #mouProfileHub .mou-profile-modal-content #mouFriends{margin:0!important;max-width:100%}
      #mouProfileHub .mou-profile-modal-content .freefire-profile-card{margin:0}
      #mouProfileHub .mou-profile-modal-content #mouPresenceSettings{margin-top:12px}
      #mouProfileHub .mou-profile-modal-content #profilePhoto{max-width:100%;font-size:11px}
      #mouProfileHub .mou-profile-modal-content #profileMsg{overflow-wrap:anywhere}
      #mouProfileHub .mou-profile-modal-content .stack{min-width:0}
      #mouProfileHub .mou-profile-modal-content .item{max-width:100%;overflow-wrap:anywhere}
      @media(max-width:360px){#mouProfileHub .mou-profile-grid{grid-template-columns:1fr}#mouProfileHub .mou-profile-grid button{min-height:68px}}
    `;
    document.head.appendChild(style);

    const scoreHost = $('#mouProfileScore', shell);
    if (stats) { stats.querySelectorAll('article').forEach(card=>scoreHost.appendChild(card)); stats.remove(); }
    if (freeFire) $('#mouProfileModalContent', shell).appendChild(freeFire);
    const content = $('#mouProfileModalContent', shell);
    const modal = $('#mouProfileModal', shell);
    const title = $('#mouProfileModalTitle', shell);
    const sections = {
      game: {title:'Profil Free Fire', nodes:[freeFire]},
      network: {title:'Mon réseau', nodes:[friends]},
      presence: {title:'Présence en ligne', nodes:[presence]},
      history: {title:'Historique des matchs', nodes:[history]},
      photo: {title:'Photo de profil', nodes:[photoLabel,savePhoto,photoMsg]}
    };
    const anchors = new Map();
    Object.values(sections).forEach(s=>s.nodes.forEach(n=>{
      if(n && !anchors.has(n)){
        const marker=document.createComment('profile-panel-anchor');
        n.parentNode?.insertBefore(marker,n);
        anchors.set(n,marker);
      }
    }));
    function restoreNodes(){
      anchors.forEach((marker,node)=>{
        if(marker.parentNode) marker.parentNode.insertBefore(node,marker.nextSibling);
      });
    }
    function open(key){
      const section=sections[key]; if(!section)return;
      content.replaceChildren();
      section.nodes.forEach(node=>{if(node){node.hidden=false;content.appendChild(node);}});
      if(key==='presence'&&presence){presence.hidden=false;}
      title.textContent=section.title;
      modal.hidden=false;
      document.body.style.overflow='hidden';
      $('#mouProfileBack',shell).hidden=false;
    }
    function close(){
      modal.hidden=true;document.body.style.overflow='';
      content.replaceChildren();
      restoreNodes();
      Object.values(sections).forEach(s=>s.nodes.forEach(n=>{if(n)n.hidden=false;}));
    }
    shell.addEventListener('click',e=>{
      const button=e.target.closest('[data-profile-open]');
      if(button){open(button.dataset.profileOpen);return;}
      if(e.target.closest('#mouProfileClose')||e.target===modal)close();
      if(e.target.closest('#mouProfileBack'))close();
      if(e.target.closest('#mouProfileLogout'))logout?.click();
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
    $('#mouProfileHubAvatar',shell).innerHTML=$('#profileAvatar',profile)?.innerHTML||'M';
    $('#mouProfileHubName',shell).textContent=$('#profilePseudo',profile).textContent;
    $('#mouProfileHubUid',shell).textContent=$('#profileUid',profile).textContent;
    $('#mouProfileHubStatus',shell).textContent=$('#profileStatus',profile).textContent;
    $('#mouProfileFriendCount',shell).textContent=$('#mouFriendsCount',friends)?.textContent||'0';
    const scoreCards=[...scoreHost.children];
    scoreCards.forEach(card=>card.querySelector('strong')?.setAttribute('data-profile-score',''));
    const updateFriendCount=()=>{$('#mouProfileFriendCount',shell).textContent=$('#mouFriendsCount',friends)?.textContent||'0';};
    new MutationObserver(updateFriendCount).observe(friends,{childList:true,subtree:true,characterData:true});
    const updateIdentity=()=>{$('#mouProfileHubAvatar',shell).innerHTML=$('#profileAvatar',profile)?.innerHTML||'M';};
    new MutationObserver(updateIdentity).observe($('#profileAvatar',profile),{childList:true,subtree:true});
    if(logout)logout.hidden=true;
  }
  document.addEventListener('DOMContentLoaded',mount);
  window.addEventListener('mou:player-auth',()=>setTimeout(mount,80));
  const observer=new MutationObserver(mount);
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
