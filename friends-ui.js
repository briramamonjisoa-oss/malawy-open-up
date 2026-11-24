(() => {
  'use strict';
  const API = 'https://malawy-open-up.briramonjisoa.workers.dev/.netlify/functions/friends';
  const token = () => localStorage.getItem('mou_player_token') || '';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let relations = [];
  let timer;
  const request = async (url, options = {}) => {
    const response = await fetch(API + url, { ...options, headers: { Authorization: 'Bearer ' + token(), ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) }, cache:'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Erreur du service amis.');
    return data;
  };
  function mount() {
    const profile = document.getElementById('playerProfile');
    if (!profile || document.getElementById('mouFriends')) return;
    const section = document.createElement('section');
    section.id = 'mouFriends';
    section.className = 'mou-friends panel';
    section.innerHTML = '<div class="section-head"><span class="eyebrow">MALAWY COMMUNITY</span><h3>MES AMIS</h3></div><p class="muted">Retrouve les joueurs et construis ton réseau dans MALAWY OPEN UP.</p><label>Rechercher un joueur<input id="mouFriendSearch" type="search" minlength="2" placeholder="Saisis au moins 2 lettres d’un pseudo"></label><div id="mouFriendSearchResults" class="stack" aria-live="polite"></div><h4>DEMANDES REÇUES</h4><div id="mouFriendIncoming" class="stack"></div><h4>MES AMIS</h4><div id="mouFriendAccepted" class="stack"></div><div id="mouFriendMessage" class="message" role="status"></div>';
    profile.insertBefore(section, document.getElementById('playerLogout'));
    const style = document.createElement('style');
    style.textContent = '.mou-friends{margin-top:22px}.mou-friends h4{margin:22px 0 10px;color:#d8bd7a;font-size:11px;letter-spacing:.12em}.mou-friends input{width:100%;margin-top:8px}.mou-friend-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid rgba(216,189,122,.2);border-radius:13px;background:rgba(255,255,255,.025)}.mou-friend-row b{display:block}.mou-friend-row small{display:block;color:#aaa;margin-top:4px}.mou-friend-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.mou-friend-actions button{font-size:11px;padding:9px 11px}.mou-friend-empty{color:#aaa;font-size:13px;padding:10px 0}';
    document.head.appendChild(style);
    document.getElementById('mouFriendSearch').addEventListener('input', event => {
      clearTimeout(timer);
      const q = event.target.value.trim();
      const target = document.getElementById('mouFriendSearchResults');
      if (q.length < 2) { target.innerHTML = ''; return; }
      timer = setTimeout(() => search(q), 300);
    });
    load();
  }
  const empty = text => '<p class="mou-friend-empty">' + esc(text) + '</p>';
  function row(name, subtitle, actions) {
    return '<article class="mou-friend-row"><div><b>' + esc(name || 'Joueur') + '</b><small>' + esc(subtitle || '') + '</small></div><div class="mou-friend-actions">' + actions + '</div></article>';
  }
  async function load() {
    if (!token()) return;
    const message = document.getElementById('mouFriendMessage');
    try {
      const data = await request('');
      relations = data.relations || [];
      const incoming = relations.filter(x => x.direction === 'received' && x.status === 'En attente');
      const accepted = relations.filter(x => x.status === 'Acceptée');
      document.getElementById('mouFriendIncoming').innerHTML = incoming.map(x => row(x.pseudo, 'Demande reçue', '<button class="primary" data-friend-accept="' + esc(x.id) + '">Accepter</button><button class="secondary" data-friend-refuse="' + esc(x.id) + '">Refuser</button>')).join('') || empty('Aucune demande reçue pour le moment.');
      document.getElementById('mouFriendAccepted').innerHTML = accepted.map(x => row(x.pseudo, 'Ami', '<button class="secondary" data-friend-remove="' + esc(x.id) + '">Retirer</button>')).join('') || empty('Ta liste d’amis est encore vide.');
    } catch (error) { if (message) message.textContent = error.message; }
  }
  async function search(q) {
    const target = document.getElementById('mouFriendSearchResults');
    try {
      const data = await request('?action=search&q=' + encodeURIComponent(q));
      target.innerHTML = (data.players || []).map(p => {
        const relation = p.relation || 'Aucune';
        let action = relation === 'Acceptée' ? '<span class="muted">Déjà ami</span>' : relation === 'En attente' ? '<span class="muted">Demande en attente</span>' : relation === 'Bloquée' ? '<span class="muted">Indisponible</span>' : '<button class="primary" data-friend-add="' + esc(p.id) + '">Ajouter</button>';
        return row(p.pseudo, 'Joueur MALAWY OPEN UP', action);
      }).join('') || empty('Aucun joueur trouvé.');
    } catch (error) { target.innerHTML = empty(error.message); }
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-friend-add],[data-friend-accept],[data-friend-refuse],[data-friend-remove]');
    if (!button || !token()) return;
    const message = document.getElementById('mouFriendMessage');
    const action = button.hasAttribute('data-friend-add') ? 'request' : button.hasAttribute('data-friend-accept') ? 'respond' : button.hasAttribute('data-friend-refuse') ? 'respond' : 'remove';
    const payload = action === 'request' ? {action, targetId:button.dataset.friendAdd} : action === 'respond' ? {action, relationId:button.dataset.friendAccept || button.dataset.friendRefuse, decision:button.hasAttribute('data-friend-accept') ? 'Acceptée' : 'Refusée'} : {action, relationId:button.dataset.friendRemove};
    button.disabled = true;
    try {
      await request('', {method:'POST', body:JSON.stringify(payload)});
      if (message) message.textContent = action === 'request' ? 'Demande envoyée.' : action === 'remove' ? 'Ami retiré de ta liste.' : 'Demande mise à jour.';
      await load();
      const q = document.getElementById('mouFriendSearch')?.value.trim();
      if (q && q.length >= 2) await search(q);
    } catch (error) { if (message) message.textContent = error.message; button.disabled = false; }
  });
  document.addEventListener('mou:player-auth', mount);
  document.addEventListener('DOMContentLoaded', mount);
  const observer = new MutationObserver(mount);
  observer.observe(document.documentElement, {childList:true, subtree:true});
})();