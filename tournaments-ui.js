
/* MALAWY OPEN UP - TOURNOIS */
(() => {
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const CLOUD = 'owc0mtlg';
const PRESET = 'malawy_photos';

let tournaments = [];
let signups = [];
let registeredPlayers = [];
let currentPlayer = null;
let busy = false;

const token = () => sessionStorage.getItem('mou_admin_token') || '';
const playerToken = () => localStorage.getItem('mou_player_token') || '';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;',
  '"':'&quot;', "'":'&#39;'
}[c]));

async function call(path, body) {
  const headers = {};
  if (token()) headers.Authorization = 'Bearer ' + token();
  if (body) headers['Content-Type'] = 'application/json';

  const r = await fetch('/.netlify/functions/' + path, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = {};
  try { data = await r.json(); } catch(e) {}

  if (!r.ok) throw Error(data.error || 'Erreur serveur');
  return data;
}

async function uploadPhoto(file) {
  if (!file || !file.size) return '';

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', PRESET);

  const r = await fetch(
    'https://api.cloudinary.com/v1_1/' + CLOUD + '/image/upload',
    { method:'POST', body:fd }
  );

  const data = await r.json();
  if (!r.ok) throw Error(data.error?.message || 'Envoi de la photo impossible');

  return data.secure_url || '';
}

function styles() {
  if ($('#tourStyles')) return;

  const s = document.createElement('style');
  s.id = 'tourStyles';
  s.textContent = `
    #tournaments.page{display:none}
    #tournaments.page.active{display:block}
    .tour-card,.tour-form,.signup-card{
      background:#171e2c;border:1px solid #2b3448;
      border-radius:15px;padding:15px;margin:12px 0
    }
    .tour-card{display:flex;justify-content:space-between;
      align-items:center;gap:12px;flex-wrap:wrap}
    .tour-form{display:grid;gap:12px}
    .tour-form label{display:grid;gap:6px;font-size:13px;font-weight:700}
    .tour-form input,.tour-form select,.tour-form textarea{
      box-sizing:border-box;width:100%;padding:12px;
      border-radius:9px;background:#0f1420;color:white;
      border:1px solid #394258
    }
    .tour-admin{margin-top:24px;border-top:1px solid #394258;padding-top:18px}
    .tour-muted,.tour-card small,.signup-card small{
      color:#a1abc0;font-size:13px
    }
    .tour-card small,.signup-card small{display:block;margin-top:5px}
    .tour-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    .tour-actions button{padding:9px 12px;border-radius:8px}
    .tour-logo{width:48px;height:48px;object-fit:cover;border-radius:8px}
    .tour-poster{width:100%;max-height:190px;object-fit:cover;border-radius:10px;margin-bottom:8px}
    .tour-message{color:#c9ff38;font-size:13px;min-height:18px}
  `;
  document.head.append(s);
}

function ensureUI() {
  const tabs = $('.tabs');
  if (tabs && !tabs.querySelector('[data-tab="tournaments"]')) {
    const b = document.createElement('button');
    b.className = 'tab';
    b.dataset.tab = 'tournaments';
    b.textContent = 'Tournois';
    tabs.insertBefore(b, tabs.children[1] || null);
  }

  const bottom = $('.bottom');
  if (bottom && !bottom.querySelector('[data-tab="tournaments"]')) {
    const b = document.createElement('button');
    b.dataset.tab = 'tournaments';
    b.innerHTML = '🏆<small>Tournois</small>';
    bottom.insertBefore(b, bottom.children[1] || null);
  }

  if (!$('#tournaments')) {
    const main = $('main');
    if (!main) return;

    const section = document.createElement('section');
    section.id = 'tournaments';
    section.className = 'page';

    section.innerHTML = `
      <div class="eyebrow">MALAWY OPEN UP</div>
      <h2>TOURNOIS</h2>
      <p class="tour-muted">Choisis une compétition et inscris-toi.</p>

      <div id="publicTournaments">Chargement des tournois...</div>
      <div id="teamSignup" hidden></div>

      <div id="tournamentAdmin" class="tour-admin" hidden>
        <h3>ADMINISTRATION DES TOURNOIS</h3>

        <form id="createTournament" class="tour-form">
          <h3>Créer / modifier un tournoi</h3>
          <input name="id" type="hidden">

          <label>Nom du tournoi
            <input name="name" required maxlength="100">
          </label>

          <label>Jeu
            <select name="game">
              <option>Clash Squad</option>
              <option>Battle Royale</option>
            </select>
          </label>

          <label>Format
            <select name="format">
              <option>1v1</option><option>2v2</option>
              <option>3v3</option><option>4v4</option>
            </select>
          </label>

          <label>Date du tournoi
            <input name="date" type="datetime-local">
          </label>

          <label>Date limite d'inscription
            <input name="deadline" type="datetime-local">
          </label>

          <label>Nombre maximum d'équipes (0 = illimité)
            <input name="limit" type="number" min="0" value="0">
          </label>

          <label>Affiche du tournoi (facultatif)
            <input name="poster" type="file" accept="image/*">
          </label>

          <label>Règles / description
            <textarea name="rules" rows="3"></textarea>
          </label>

          <div class="tour-actions">
            <button class="primary" type="button" id="saveTournament">
              Enregistrer le tournoi
            </button>
            <button class="secondary" type="button" id="resetTournament">
              Nouveau
            </button>
          </div>
          <p class="tour-message" id="createMsg"></p>
        </form>

        <h3>Tournois existants</h3>
        <div id="adminTournaments"></div>

        <h3>Demandes d'inscription</h3>
        <div id="adminSignups"></div>
      </div>
    `;
    main.append(section);
  }
}

function updateAdmin() {
  const box = $('#tournamentAdmin');
  if (box) box.hidden = !token();
}

function show() {
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'tournaments'));
  $$('[data-tab]').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === 'tournaments')
  );
  window.scrollTo(0, 0);
  updateAdmin();
  refresh();
}

function playerCount(format) {
  return format === 'E_sport' ? 4 : Number(format[0]) || 1;
}

function fillFormats(form) {
  const select = form.elements.format;
  const old = select.value;
  const formats = form.elements.game.value === 'Battle Royale'
    ? ['1v1','2v2','3v3','4v4','E_sport']
    : ['1v1','2v2','3v3','4v4'];

  select.innerHTML = formats.map(x => `<option>${esc(x)}</option>`).join('');
  if (formats.includes(old)) select.value = old;
}

function roster(format) {
  let html = '<datalist id="registeredPlayerNames">' +
    registeredPlayers.map(p => `<option value="${esc(p.pseudo)}" data-uid="${esc(p.playerId)}"></option>`).join('') +
    '</datalist>';
  const row = (label, pseudoName, uidName, player) => `
    <label>${label}
      <input name="${pseudoName}" data-player-pseudo="${pseudoName}" list="registeredPlayerNames" required maxlength="32" value="${esc(player?.pseudo || '')}" autocomplete="off">
    </label>
    <label>UID Free Fire
      <input name="${uidName}" data-player-uid-for="${pseudoName}" required maxlength="40" value="${esc(player?.playerId || '')}">
    </label>`;
  if (format === 'E_sport') html += row('Capitaine / Joueur 1','p1','id1',currentPlayer);
  const start = format === 'E_sport' ? 2 : 1;
  for (let i = start; i <= playerCount(format); i++) {
    html += row('Pseudo joueur '+i,'p'+i,'id'+i,i===1?currentPlayer:null);
  }
  if (format === 'E_sport') {
    for (let i = 1; i <= 2; i++) html += row('Remplaçant '+i,'s'+i,'sid'+i,null);
  }
  return html;
}

async function refresh() {
  const box = $('#publicTournaments');
  if (!box) return;

  try {
    const d = await call('tournaments');
    tournaments = d.tournaments || [];

    const playerResponse = await fetch('/.netlify/functions/players', {cache:'no-store'});
    registeredPlayers = playerResponse.ok ? (await playerResponse.json()).filter(p => p.status === 'Accepté') : [];
    currentPlayer = null;
    if (playerToken()) {
      try {
        const me = await fetch('/.netlify/functions/player-account', {headers:{Authorization:'Bearer '+playerToken()},cache:'no-store'});
        if (me.ok) currentPlayer = await me.json();
      } catch(e) { currentPlayer = null; }
    }

    if (token()) {
      const s = await call('tournament-signups');
      signups = s.signups || [];
    } else signups = [];

    renderPublic();
    renderAdmin();
    updateAdmin();
  } catch (e) {
    box.textContent = 'Erreur de chargement : ' + e.message;
  }
}

function renderPublic() {
  const box = $('#publicTournaments');
  if (!box) return;

  const open = tournaments.filter(t => t.status === 'Inscriptions ouvertes');

  box.innerHTML = open.map(t => `
    <article class="tour-card">
      <div>
        ${t.poster ? `<img class="tour-poster" src="${esc(t.poster)}" alt="Affiche">` : ''}
        <b>${esc(t.name)}</b>
        <small>${esc(t.game)} · ${esc(t.format)}</small>
        <small>${t.date ? esc(new Date(t.date).toLocaleString('fr-FR')) : 'Date à confirmer'}</small>
        <small>${esc(t.rules || '')}</small>
      </div>
      <button class="primary" type="button" data-enter="${esc(t.id)}">Participer</button>
    </article>
  `).join('') || '<p class="tour-muted">Aucun tournoi ouvert pour le moment.</p>';
}

function renderAdmin() {
  const box = $('#tournamentAdmin');
  if (!box || !token()) return;

  $('#adminTournaments').innerHTML = tournaments.map(t => `
    <div class="signup-card">
      <b>${esc(t.name)}</b>
      <small>${esc(t.game)} · ${esc(t.format)} · ${esc(t.status)}</small>
      <div class="tour-actions">
        <button class="secondary" type="button" data-edit="${esc(t.id)}">Modifier</button>
        <button class="secondary" type="button" data-toggle="${esc(t.id)}">
          ${t.status === 'Inscriptions ouvertes' ? 'Fermer' : 'Ouvrir'}
        </button>
        <button class="danger" type="button" data-delete="${esc(t.id)}">Supprimer</button>
      </div>
    </div>
  `).join('') || '<p class="tour-muted">Aucun tournoi.</p>';

  $('#adminSignups').innerHTML = signups.map(s => {
    const players = [s.player1,s.player2,s.player3,s.player4].filter(Boolean).join(', ');
    const esport = s.format === 'E_sport';

    return `
      <div class="signup-card">
        ${s.logo ? `<img class="tour-logo" src="${esc(s.logo)}" alt="Logo">` : ''}
        <b>${esc(esport ? (s.teamName || 'Équipe E_sport') : (s.player1 || 'Inscription'))}</b>
        <small>${esc(s.tournamentName)} · ${esc(s.format)}</small>
        ${esport ? `<small>Capitaine : ${esc(s.captain)}</small>` : ''}
        <small>Joueurs : ${esc(players || '—')}</small>
        ${esport ? `<small>Remplaçants : ${esc([s.sub1,s.sub2].filter(Boolean).join(', ') || '—')}</small>` : ''}
        <small>Statut : ${esc(s.status)}</small>
        ${s.status === 'En attente' ? `
          <div class="tour-actions">
            <button class="secondary" type="button" data-approve="${esc(s.id)}">Valider</button>
            <button class="danger" type="button" data-refuse="${esc(s.id)}">Refuser</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('') || '<p class="tour-muted">Aucune inscription reçue.</p>';
}

function signupForm(t) {
  const box = $('#teamSignup');
  box.hidden = false;
  box.innerHTML = `
    <form id="joinForm" class="tour-form">
      <h3>Inscription — ${esc(t.name)}</h3>
      <p class="tour-muted">Format : ${esc(t.format)}</p>
      <input type="hidden" name="tid" value="${esc(t.id)}">

      ${roster(t.format)}

      <p class="tour-muted">Tes informations sont préremplies si tu es connecté. Pour les autres joueurs, choisis leur pseudo : leur UID sera complété automatiquement. Vérifie les informations avant de confirmer.</p>
      ${t.format === 'E_sport' ? `
        <label>Logo de l'équipe (facultatif)
          <input type="file" name="logo" accept="image/*">
        </label>
      ` : ''}

      <label class="tour-confirm"><input type="checkbox" name="confirmInfo" required style="width:auto"> Je vérifie et confirme que tous les pseudos et UID sont corrects.</label>
      <button class="primary" type="submit">Confirmer mon inscription</button>
      <p class="tour-message" id="joinMsg"></p>
    </form>
  `;
  box.scrollIntoView({behavior:'smooth',block:'start'});
}

async function saveTournament() {
  const form = $('#createTournament');
  const button = $('#saveTournament');
  const message = $('#createMsg');

  if (!form.reportValidity() || busy) return;

  busy = true;
  button.disabled = true;

  try {
    message.textContent = 'Enregistrement en cours...';

    const data = new FormData(form);
    const file = data.get('poster');
    const poster = file && file.size ? await uploadPhoto(file) : '';

    const result = await call('tournaments', {
      action:'save',
      id:data.get('id'),
      name:String(data.get('name') || '').trim(),
      game:data.get('game'),
      format:data.get('format'),
      date:data.get('date'),
      deadline:data.get('deadline'),
      limit:data.get('limit'),
      rules:data.get('rules'),
      poster
    });

    if (!result.success) throw Error('Le serveur n’a pas confirmé l’enregistrement.');

    message.textContent = 'Tournoi enregistré avec succès !';
    form.reset();
    form.elements.id.value = '';
    fillFormats(form);
    await refresh();

  } catch (e) {
    message.textContent = 'Erreur : ' + e.message;
  } finally {
    busy = false;
    button.disabled = false;
  }
}

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.tab === 'tournaments') {
    show();
    return;
  }

  if (button.id === 'saveTournament') {
    await saveTournament();
    return;
  }

  if (button.id === 'resetTournament') {
    const form = $('#createTournament');
    form.reset();
    form.elements.id.value = '';
    fillFormats(form);
    $('#createMsg').textContent = '';
    return;
  }

  try {
    if (button.dataset.enter) {
      const t = tournaments.find(x => x.id === button.dataset.enter);
      if (t) signupForm(t);
    }

    if (button.dataset.toggle) {
      const t = tournaments.find(x => x.id === button.dataset.toggle);
      if (!t) return;
      button.disabled = true;
      await call('tournaments', {
        action:'status', id:t.id,
        status:t.status === 'Inscriptions ouvertes'
          ? 'Inscriptions fermées' : 'Inscriptions ouvertes'
      });
      await refresh();
    }

    if (button.dataset.delete) {
      if (!confirm('Supprimer définitivement ce tournoi ?')) return;
      button.disabled = true;
      await call('tournaments', {action:'delete',id:button.dataset.delete});
      await refresh();
    }

    if (button.dataset.edit) {
      const t = tournaments.find(x => x.id === button.dataset.edit);
      const form = $('#createTournament');
      if (!t || !form) return;

      form.elements.id.value = t.id;
      form.elements.name.value = t.name;
      form.elements.game.value = t.game;
      fillFormats(form);
      form.elements.format.value = t.format;
      form.elements.date.value = t.date ? new Date(t.date).toISOString().slice(0,16) : '';
      form.elements.deadline.value = t.deadline ? new Date(t.deadline).toISOString().slice(0,16) : '';
      form.elements.limit.value = t.limit || 0;
      form.elements.rules.value = t.rules || '';
      form.scrollIntoView({behavior:'smooth',block:'start'});
    }

    if (button.dataset.approve || button.dataset.refuse) {
      button.disabled = true;
      await call('tournament-signups', {
        id:button.dataset.approve || button.dataset.refuse,
        status:button.dataset.approve ? 'Acceptée' : 'Refusée'
      });
      await refresh();
    }
  } catch (e) {
    alert(e.message);
    button.disabled = false;
  }
});

document.addEventListener('input', event => {
  const pseudoInput = event.target.closest('[data-player-pseudo]');
  if (!pseudoInput) return;
  const selected = registeredPlayers.find(p => String(p.pseudo).toLowerCase() === pseudoInput.value.trim().toLowerCase());
  const uidInput = pseudoInput.form?.querySelector('[data-player-uid-for="'+pseudoInput.name+'"]');
  if (uidInput && selected) uidInput.value = selected.playerId || '';
});

document.addEventListener('change', event => {
  if (event.target.name === 'game' && event.target.closest('#createTournament')) {
    fillFormats(event.target.form);
  }
});

document.addEventListener('submit', async event => {
  if (event.target.id !== 'joinForm') return;
  event.preventDefault();

  if (busy) return;
  busy = true;

  const form = new FormData(event.target);
  const message = $('#joinMsg');

  try {
    message.textContent = 'Envoi en cours...';

    const t = tournaments.find(x => x.id === form.get('tid'));
    if (!t) throw Error('Ce tournoi n’est plus disponible.');

    const file = form.get('logo');
    const logo = file && file.size ? await uploadPhoto(file) : '';
    const players = {};

    for (let i = 1; i <= playerCount(t.format); i++) {
      players['p' + i] = String(form.get('p' + i) || '').trim();
      players['id' + i] = String(form.get('id' + i) || '').trim();
    }

    if (t.format === 'E_sport') {
      for (let i = 1; i <= 2; i++) {
        players['s' + i] = String(form.get('s' + i) || '').trim();
        players['sid' + i] = String(form.get('sid' + i) || '').trim();
      }
    }

    await call('tournament-register', {
      tournamentId:t.id,
      captain:t.format === 'E_sport' ? players.p1 : '',
      captainId:t.format === 'E_sport' ? players.id1 : '',
      teamName:t.format === 'E_sport' ? 'E_sport - ' + players.p1 : '',
      logo,
      players
    });

    event.target.reset();
    await refresh();
    message.textContent = 'Inscription envoyée, en attente de validation.';

  } catch (e) {
    message.textContent = 'Erreur : ' + e.message;
  } finally {
    busy = false;
  }
});

function init() {
  styles();
  ensureUI();

  const form = $('#createTournament');
  if (form) fillFormats(form);

  updateAdmin();
  refresh();

  window.addEventListener('mou:admin-auth', () => {
    updateAdmin();
    refresh();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();
