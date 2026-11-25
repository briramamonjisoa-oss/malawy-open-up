(() => {
  'use strict';
  const API = 'https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/friends';
  const token = () => localStorage.getItem('mou_player_token') || '';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let relations = [], timer, activeFilter = 'friends';
  const request = async (url, options = {}) => {
    const response = await fetch(API + url, { ...options, headers: { Authorization: 'Bearer ' + token(), ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) }, cache:'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Erreur du service amis.');
    return data;
  };
  function mount() {
    const profile = document.getElementById('playerProfile');
    if (!profile) return;
    if (document.getElementById('mouFriends')) return;
    const section = document.createElement('section');
    section.id = 'mouFriends';
    section.className = 'mou-friends';
    section.innerHTML = `
      <header class="mou-friends-head">
        <div><span class="mou-friends-kicker">MALAWY COMMUNITY</span><h3>Mon réseau</h3><p>Retrouve les joueurs et gère tes amitiés.</p></div>
        <span class="mou-friends-mark" aria-hidden="true">✦</span>
      </header>
      <div class="mou-friends-stats">
        <div><b id="mouFriendsCount">0</b><span>Amis</span></div>
        <div><b id="mouRequestsCount">0</b><span>Demandes</span></div>
      </div>
      <div class="mou-friends-tabs" role="tablist" aria-label="Gestion des amis">
        <button type="button" class="is-active" data-friend-view="friends" role="tab" aria-selected="true">Amis</button>
        <button type="button" data-friend-view="requests" role="tab" aria-selected="false">Demandes <i id="mouRequestsBadge">0</i></button>
        <button type="button" data-friend-view="suggestions" role="tab" aria-selected="false">Suggestions</button>\n        <button type="button" data-friend-view="search" role="tab" aria-selected="false">Rechercher</button>
      </div>
      <div class="mou-friends-content">
        <section class="mou-friend-pane" data-pane="friends">
          <div class="mou-friends-section-title"><b>Mes amis</b><small>Joueurs acceptés</small></div>
          <div id="mouFriendAccepted" class="mou-friends-list" aria-live="polite"><p class="mou-friend-empty">Chargement…</p></div>
        </section>
        <section class="mou-friend-pane" data-pane="requests" hidden>
          <div class="mou-friends-section-title"><b>Demandes reçues</b><small>À confirmer</small></div>
          <div id="mouFriendIncoming" class="mou-friends-list" aria-live="polite"><p class="mou-friend-empty">Chargement…</p></div>
        </section>
        <section class="mou-friend-pane" data-pane="suggestions" hidden>\n          <div class="mou-friends-section-title"><b>Joueurs à découvrir</b><small>Selon tes amis en commun</small></div>\n          <div id="mouFriendSuggestions" class="mou-friends-list" aria-live="polite"><p class="mou-friend-empty">Chargement des suggestions…</p></div>\n        </section>\n        <section class="mou-friend-pane" data-pane="search" hidden>
          <div class="mou-friends-section-title"><b>Découvrir des joueurs</b><small>Recherche par pseudo</small></div>
          <label class="mou-friend-search"><span aria-hidden="true">⌕</span><input id="mouFriendSearch" type="search" minlength="2" placeholder="Rechercher un joueur…" autocomplete="off"></label>
          <div id="mouFriendSearchResults" class="mou-friends-list" aria-live="polite"><p class="mou-friend-empty">Saisis au moins 2 lettres pour commencer.</p></div>
        </section>
      </div>
      <p id="mouFriendMessage" class="mou-friend-feedback" role="status" aria-live="polite"></p>`;
    const logout = document.getElementById('playerLogout');
    profile.insertBefore(section, logout || null);
    const style = document.createElement('style');
    style.id = 'mouFriendsStyles';
    style.textContent = `
      #mouFriends{display:block;box-sizing:border-box;width:100%;max-width:100%;min-width:0;margin:22px 0 18px;padding:clamp(14px,3.5vw,20px);overflow:hidden;border:1px solid rgba(216,193,138,.22);border-radius:22px;background:radial-gradient(ellipse at 100% 0,rgba(150,120,62,.13),transparent 45%),linear-gradient(145deg,rgba(24,23,21,.97),rgba(7,8,10,.98));box-shadow:0 16px 42px rgba(0,0,0,.22);color:#f0eadf}
      #mouFriends *{box-sizing:border-box;min-width:0}
      #mouFriends .mou-friends-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 15px}
      #mouFriends .mou-friends-kicker{color:#d8c18a;font-size:9px;font-weight:800;letter-spacing:.17em}
      #mouFriends .mou-friends-head h3{margin:5px 0 3px;color:#f5efe4;font-size:clamp(20px,5vw,25px);line-height:1.15}
      #mouFriends .mou-friends-head p{margin:0;color:#a8a092;font-size:12px;line-height:1.45}
      #mouFriends .mou-friends-mark{display:grid;flex:0 0 42px;width:42px;height:42px;place-items:center;border:1px solid rgba(216,193,138,.3);border-radius:14px;background:rgba(216,193,138,.08);color:#dfc98f;font-size:22px}
      #mouFriends .mou-friends-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:0 0 15px}
      #mouFriends .mou-friends-stats>div{display:flex;align-items:baseline;gap:8px;padding:10px 12px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.035)}
      #mouFriends .mou-friends-stats b{color:#e4cd94;font-size:19px;font-variant-numeric:tabular-nums}
      #mouFriends .mou-friends-stats span{color:#a9a193;font-size:11px}
      #mouFriends .mou-friends-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:5px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(0,0,0,.24)}
      #mouFriends .mou-friends-tabs button{display:flex;align-items:center;justify-content:center;gap:5px;min-height:38px;padding:7px 4px;border:1px solid transparent;border-radius:10px;background:transparent;color:#a9a193;font-family:inherit;font-size:11px;font-weight:600;line-height:1.2;white-space:nowrap}
      #mouFriends .mou-friends-tabs button.is-active{border-color:rgba(216,193,138,.25);background:linear-gradient(135deg,rgba(216,193,138,.18),rgba(216,193,138,.07));color:#f1dfb7}
      #mouFriends .mou-friends-tabs i{display:inline-grid;min-width:17px;height:17px;place-items:center;border-radius:20px;background:rgba(216,193,138,.17);font-size:9px;font-style:normal}
      #mouFriends .mou-friends-content{padding-top:15px}
      #mouFriends .mou-friends-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px}
      #mouFriends .mou-friends-section-title b{color:#eee7da;font-size:13px}
      #mouFriends .mou-friends-section-title small{color:#8f887b;font-size:10px}
      #mouFriends .mou-friends-list{display:grid;gap:8px}
      #mouFriends .mou-friend-row{display:flex;align-items:center;justify-content:space-between;gap:9px;width:100%;max-width:100%;padding:10px;border:1px solid rgba(216,193,138,.13);border-radius:14px;background:rgba(255,255,255,.035)}
      #mouFriends .mou-friend-row[data-public-player]{cursor:pointer;transition:border-color .18s,background .18s}#mouFriends .mou-friend-row[data-public-player]:hover{border-color:rgba(216,193,138,.4);background:rgba(216,193,138,.07)}#mouFriends .mou-friend-person{display:flex;align-items:center;gap:9px;flex:1 1 auto;min-width:0}
      #mouFriends .mou-friend-avatar{display:grid;flex:0 0 36px;width:36px;height:36px;place-items:center;border:1px solid rgba(216,193,138,.25);border-radius:50%;background:linear-gradient(145deg,#29251d,#101114);color:#e1c98f;font-size:13px;font-weight:800}
      #mouFriends .mou-friend-copy{min-width:0;overflow:hidden}
      #mouFriends .mou-friend-copy b{display:block;overflow:hidden;color:#eee8dc;font-size:12px;text-overflow:ellipsis;white-space:nowrap}
      #mouFriends .mou-friend-copy small{display:block;margin-top:3px;overflow:hidden;color:#9e978a;font-size:10px;text-overflow:ellipsis;white-space:nowrap}
      #mouFriends .mou-friend-actions{display:flex;flex:0 0 auto;align-items:center;justify-content:flex-end;gap:5px;max-width:48%;flex-wrap:wrap}
      #mouFriends .mou-friend-actions button{min-height:32px;padding:7px 9px;border:1px solid rgba(216,193,138,.25);border-radius:9px;background:rgba(216,193,138,.1);color:#e8d5a9;font-size:10px;font-weight:700;line-height:1.15;white-space:normal}
      #mouFriends .mou-friend-actions button[data-friend-refuse],#mouFriends .mou-friend-actions button[data-friend-remove]{border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#b9b2a6}
      #mouFriends .mou-friend-actions button:disabled{opacity:.5}
      #mouFriends .mou-friend-search{display:flex;align-items:center;gap:8px;width:100%;margin:0 0 10px;padding:0 12px;border:1px solid rgba(216,193,138,.2);border-radius:12px;background:rgba(255,255,255,.045);color:#d8c18a}
      #mouFriends .mou-friend-search span{font-size:20px}
      #mouFriends .mou-friend-search input{width:100%;min-width:0;height:42px;margin:0;padding:0;border:0;outline:0;background:transparent;color:#f3eee4;font-size:12px}
      #mouFriends .mou-friend-search input::placeholder{color:#777267}
      #mouFriends .mou-friend-empty{margin:0;padding:14px 11px;border:1px dashed rgba(216,193,138,.15);border-radius:12px;color:#999184;font-size:11px;line-height:1.5;text-align:center}
      #mouFriends .mou-friend-feedback{min-height:16px;margin:10px 2px 0;color:#d8c18a;font-size:10px;line-height:1.4;overflow-wrap:anywhere}
      @media(max-width:380px){#mouFriends{padding:12px;border-radius:18px}#mouFriends .mou-friend-row{align-items:flex-start}#mouFriends .mou-friend-actions{max-width:46%}#mouFriends .mou-friend-actions button{padding:7px 6px;font-size:9px}#mouFriends .mou-friends-tabs button{font-size:10px}}
    `;
    document.head.appendChild(style);
    section.addEventListener('click', event => {
      const tab = event.target.closest('[data-friend-view]');
      if (!tab) return;
      activeFilter = tab.dataset.friendView;
      section.querySelectorAll('[data-friend-view]').forEach(button => {
        const active = button === tab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
      });
      section.querySelectorAll('[data-pane]').forEach(pane => { pane.hidden = pane.dataset.pane !== activeFilter; });
      if (activeFilter === 'search') document.getElementById('mouFriendSearch').focus();\n      if (activeFilter === 'suggestions') loadSuggestions();
    });
    document.getElementById('mouFriendSearch').addEventListener('input', event => {
      clearTimeout(timer);
      const q = event.target.value.trim();
      const target = document.getElementById('mouFriendSearchResults');
      if (q.length < 2) { target.innerHTML = '<p class="mou-friend-empty">Saisis au moins 2 lettres pour commencer.</p>'; return; }
      target.innerHTML = '<p class="mou-friend-empty">Recherche en cours…</p>';
      timer = setTimeout(() => search(q), 300);
    });
    if (token()) load();
  }
  const empty = text => '<p class="mou-friend-empty">' + esc(text) + '</p>';
  function row(name, subtitle, actions, publicProfile = false) {
    const safeName = name || 'Joueur';
    const profileAttrs = publicProfile ? ' data-public-player="' + esc(safeName) + '" role="button" tabindex="0" aria-label="Voir le profil de ' + esc(safeName) + '"' : '';
    return '<article class="mou-friend-row"' + profileAttrs + '><div class="mou-friend-person"><span class="mou-friend-avatar">' + esc(String(safeName).slice(0,1).toUpperCase()) + '</span><span class="mou-friend-copy"><b>' + esc(safeName) + '</b><small>' + esc(subtitle || '') + '</small></span></div><div class="mou-friend-actions">' + actions + '</div></article>';
  }
  async function load() {
    if (!token()) return;
    const message = document.getElementById('mouFriendMessage');
    if (!message) return;
    message.textContent = '';
    try {
      const data = await request('');
      relations = data.relations || [];
      const incoming = relations.filter(x => x.direction === 'received' && x.status === 'En attente');
      const accepted = relations.filter(x => x.status === 'Acceptée');
      document.getElementById('mouFriendsCount').textContent = String(accepted.length);
      document.getElementById('mouRequestsCount').textContent = String(incoming.length);
      document.getElementById('mouRequestsBadge').textContent = String(incoming.length);
      document.getElementById('mouFriendIncoming').innerHTML = incoming.map(x => row(x.pseudo, 'Demande reçue', '<button data-friend-accept="' + esc(x.id) + '">Accepter</button><button data-friend-refuse="' + esc(x.id) + '">Refuser</button>')).join('') || empty('Aucune nouvelle demande pour le moment.');
      document.getElementById('mouFriendAccepted').innerHTML = accepted.map(x => row(x.pseudo, 'Ami MALAWY OPEN UP', '<button data-friend-remove="' + esc(x.id) + '">Retirer</button>')).join('') || empty('Ta liste est vide. Passe dans « Découvrir » pour rechercher des joueurs.');
    } catch (error) { if (message) message.textContent = error.message; }
  }
  async function loadSuggestions() {
    const target = document.getElementById('mouFriendSuggestions');
    if (!target || !token()) return;
    target.innerHTML = empty('Recherche de joueurs compatibles…');
    try {
      const data = await request('?action=suggestions');
      target.innerHTML = (data.players || []).map(p => {
        const action = '<button data-friend-add="' + esc(p.id) + '">Ajouter</button>';
        return row(p.pseudo, p.reason || 'Joueur à découvrir', action, true);
      }).join('') || empty('Pas encore de suggestion. Invite des joueurs à rejoindre MALAWY OPEN UP !');
    } catch (error) { target.innerHTML = empty(error.message); }
  }
  async function search(q) {
    const target = document.getElementById('mouFriendSearchResults');
    try {
      const data = await request('?action=search&q=' + encodeURIComponent(q));
      target.innerHTML = (data.players || []).map(p => {
        const relation = p.relation || 'Aucune';
        let action = relation === 'Acceptée' ? '<span class="mou-friend-copy"><small>Déjà ami</small></span>' : relation === 'En attente' ? '<span class="mou-friend-copy"><small>Demande en attente</small></span>' : relation === 'Bloquée' ? '<span class="mou-friend-copy"><small>Indisponible</small></span>' : '<button data-friend-add="' + esc(p.id) + '">Ajouter</button>';
        return row(p.pseudo, 'Joueur MALAWY OPEN UP', action);
      }).join('') || empty('Aucun joueur trouvé.');
    } catch (error) { target.innerHTML = empty(error.message); }
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-friend-add],[data-friend-accept],[data-friend-refuse],[data-friend-remove]');
    if (!button || !document.getElementById('mouFriends')?.contains(button) || !token()) return;
    const message = document.getElementById('mouFriendMessage');
    const action = button.hasAttribute('data-friend-add') ? 'request' : button.hasAttribute('data-friend-accept') || button.hasAttribute('data-friend-refuse') ? 'respond' : 'remove';
    const payload = action === 'request' ? {action, targetId:button.dataset.friendAdd} : action === 'respond' ? {action, relationId:button.dataset.friendAccept || button.dataset.friendRefuse, decision:button.hasAttribute('data-friend-accept') ? 'Acceptée' : 'Refusée'} : {action, relationId:button.dataset.friendRemove};
    button.disabled = true;
    try {
      await request('', {method:'POST', body:JSON.stringify(payload)});
      if (message) message.textContent = action === 'request' ? 'Demande envoyée.' : action === 'remove' ? 'Ami retiré de ta liste.' : 'Demande mise à jour.';
      await load();
      const q = document.getElementById('mouFriendSearch')?.value.trim();
      if (q && q.length >= 2 && activeFilter === 'search') await search(q);
    } catch (error) { if (message) message.textContent = error.message; button.disabled = false; }
  });
  document.addEventListener('mou:player-auth', () => { mount(); load(); });
  document.addEventListener('DOMContentLoaded', mount);
  const observer = new MutationObserver(mount);
  observer.observe(document.documentElement, {childList:true, subtree:true});
})();
