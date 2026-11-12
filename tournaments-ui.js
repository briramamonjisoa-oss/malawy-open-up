
/* MALAWY OPEN UP — Interface tournois corrigée */
(()=>{
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

const CLOUD = 'owc0mtlg';
const PRESET = 'malawy_photos';

let tournaments = [];
let signups = [];
let busy = false;

const token = () => sessionStorage.getItem('mou_admin_token') || '';

async function call(path, body) {
  const headers = {};

  if(token()) headers.Authorization = 'Bearer ' + token();
  if(body) headers['Content-Type'] = 'application/json';

  const response = await fetch(
    '/.netlify/functions/' + path,
    {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined
    }
  );

  let data = {};
  try {
    data = await response.json();
  } catch(e) {}

  if(!response.ok) {
    throw Error(data.error || 'Erreur serveur');
  }

  return data;
}

async function photo(file) {
  if(!file || !file.size) return '';

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', PRESET);

  const response = await fetch(
    'https://api.cloudinary.com/v1_1/' +
    CLOUD +
    '/image/upload',
    {
      method: 'POST',
      body: form
    }
  );

  const data = await response.json();

  if(!response.ok) {
    throw Error(data.error?.message || 'Envoi du logo impossible');
  }

  return data.secure_url || '';
}

function addStyles() {
  if($('#tourStyles')) return;

  const style = document.createElement('style');
  style.id = 'tourStyles';

  style.textContent = `
  #tournaments.page {display:none}
  #tournaments.page.active {display:block}

  .tour-card,
  .tour-form {
    background:#171e2c;
    border:1px solid #2b3448;
    border-radius:15px;
    padding:15px;
    margin:12px 0;
  }

  .tour-card {
    display:flex;
    justify-content:space-between;
    gap:12px;
    align-items:center;
    flex-wrap:wrap;
  }

  .tour-card small,
  .signup-card small {
    display:block;
    color:#a1abc0;
    font-size:12px;
    margin-top:5px;
  }

  .tour-form {
    display:grid;
    gap:12px;
  }

  .tour-form label {
    display:grid;
    gap:6px;
    font-size:13px;
    font-weight:700;
  }

  .tour-form input,
  .tour-form select,
  .tour-form textarea {
    box-sizing:border-box;
    width:100%;
    padding:12px;
    border-radius:9px;
    background:#0f1420;
    color:white;
    border:1px solid #394258;
  }

  .tour-admin {
    margin-top:24px;
    border-top:1px solid #394258;
    padding-top:18px;
  }

  .signup-card {
    background:#171e2c;
    border:1px solid #2b3448;
    border-radius:12px;
    padding:13px;
    margin:8px 0;
  }

  .tour-logo {
    width:45px;
    height:45px;
    object-fit:cover;
    border-radius:8px;
    float:left;
    margin-right:10px;
  }

  .tour-message {
    color:#c9ff38;
    font-size:13px;
    min-height:18px;
  }

  .tour-actions {
    display:flex;
    gap:7px;
    flex-wrap:wrap;
    margin-top:8px;
  }

  .tour-actions button {
    padding:9px 12px;
    border-radius:8px;
  }

  .tour-muted {
    color:#a1abc0;
    font-size:13px;
  }

  @media(max-width:520px) {
    .tour-card {align-items:flex-start}
  }
  `;

  document.head.append(style);
}

function ensureUI() {
  const tabs = $('.tabs');

  if(tabs && !tabs.querySelector('[data-tab="tournaments"]')) {
    const button = document.createElement('button');
    button.className = 'tab';
    button.dataset.tab = 'tournaments';
    button.textContent = 'Tournois';

    tabs.insertBefore(button, tabs.children[1] || null);
  }

  const bottom = $('.bottom');

  if(bottom && !bottom.querySelector('[data-tab="tournaments"]')) {
    const button = document.createElement('button');
    button.dataset.tab = 'tournaments';
    button.innerHTML = '🏆<small>Tournois</small>';

    bottom.insertBefore(button, bottom.children[1] || null);
  }

  if(!$('#tournaments')) {
    const main = $('main');
    if(!main) return;

    const section = document.createElement('section');
    section.id = 'tournaments';
    section.className = 'page';

    section.innerHTML = `
      <div class="eyebrow">MALAWY OPEN UP</div>
      <h2>TOURNOIS</h2>

      <p class="tour-muted">
        Choisis une compétition et inscris ta squad.
      </p>

      <div id="publicTournaments">
        <p class="tour-muted">Chargement des tournois...</p>
      </div>

      <div id="teamSignup" hidden></div>

      <div id="tournamentAdmin" class="tour-admin" hidden>
        <h3>ADMINISTRATION DES TOURNOIS</h3>

        <form id="createTournament" class="tour-form">

          <h3>Créer / modifier un tournoi</h3>

          <input name="id" type="hidden">

          <label>
            Nom du tournoi
            <input name="name" required maxlength="100">
          </label>

          <label>
            Jeu
            <select name="game">
              <option>Clash Squad</option>
              <option>Battle Royale</option>
            </select>
          </label>

          <label>
            Format
            <select name="format">
              <option>1v1</option>
              <option>2v2</option>
              <option>3v3</option>
              <option>4v4</option>
            </select>
          </label>

          <label>
            Date du tournoi
            <input name="date" type="datetime-local">
          </label>

          <label>
            Date limite d'inscription
            <input name="deadline" type="datetime-local">
          </label>

          <label>
            Nombre maximum d'équipes (0 = illimité)
            <input name="limit" type="number" min="0" value="0">
          </label>

          <label>
            Règles / description
            <textarea name="rules" rows="3"></textarea>
          </label>

          <div class="tour-actions">
            <button class="primary" type="submit">
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
  if(box) box.hidden = !token();
}

function show() {
  $$('.page').forEach(page => {
    page.classList.toggle('active', page.id === 'tournaments');
  });

  $$('[data-tab]').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.tab === 'tournaments'
    );
  });

  window.scrollTo(0, 0);
  updateAdmin();
  refresh();
}

function count(format) {
  return format === 'Mode Espoir'
    ? 4
    : Number(format[0]) || 1;
}

function fillFormats(form) {
  const select = form.elements.format;
  const old = select.value;

  const formats =
    form.elements.game.value === 'Battle Royale'
      ? ['1v1','2v2','3v3','4v4','Mode Espoir']
      : ['1v1','2v2','3v3','4v4'];

  select.innerHTML = formats
    .map(format => `<option>${esc(format)}</option>`)
    .join('');

  if(formats.includes(old)) {
    select.value = old;
  }
}

function roster(format) {
  let html = '';

  for(let i = 2; i <= count(format); i++) {
    html += `
      <label>
        Joueur ${i}
        <input name="p${i}" required maxlength="32">
      </label>

      <label>
        ID Free Fire joueur ${i}
        <input name="id${i}" required maxlength="40">
      </label>
    `;
  }

  if(format === 'Mode Espoir') {
    for(let i = 1; i <= 2; i++) {
      html += `
        <label>
          Remplaçant ${i}
          <input name="s${i}" required maxlength="32">
        </label>

        <label>
          ID Free Fire remplaçant ${i}
          <input name="sid${i}" required maxlength="40">
        </label>
      `;
    }
  }

  return html;
}

async function refresh() {
  const publicBox = $('#publicTournaments');
  if(!publicBox) return;

  try {
    const tournamentData = await call('tournaments');

    tournaments = tournamentData.tournaments || [];

    if(token()) {
      const signupData = await call('tournament-signups');
      signups = signupData.signups || [];
    } else {
      signups = [];
    }

    renderPublic();
    renderAdmin();
    updateAdmin();

  } catch(error) {
    publicBox.innerHTML =
      '<p class="tour-muted">Impossible de charger les tournois : ' +
      esc(error.message) +
      '</p>';
  }
}

function renderPublic() {
  const box = $('#publicTournaments');
  if(!box) return;

  const open = tournaments.filter(
    tournament => tournament.status === 'Inscriptions ouvertes'
  );

  box.innerHTML = open.map(t => `
    <article class="tour-card">
      <div>
        <b>${esc(t.name)}</b>

        <small>
          ${esc(t.game)} · ${esc(t.format)}
          · ${t.date ? esc(new Date(t.date).toLocaleString('fr-FR')) : 'Date à confirmer'}
        </small>

        <small>${esc(t.rules || '')}</small>
      </div>

      <button class="primary" type="button"
        data-enter="${esc(t.id)}">
        Participer
      </button>
    </article>
  `).join('') || `
    <p class="tour-muted">
      Aucun tournoi ouvert pour le moment.
    </p>
  `;
}

function renderAdmin() {
  const box = $('#tournamentAdmin');
  if(!box) return;

  updateAdmin();

  const adminTournaments = $('#adminTournaments');
  const adminSignups = $('#adminSignups');

  if(!adminTournaments || !adminSignups) return;

  adminTournaments.innerHTML = tournaments.map(t => `
    <div class="signup-card">
      <b>${esc(t.name)}</b>

      <small>
        ${esc(t.game)} · ${esc(t.format)} · ${esc(t.status)}
      </small>

      <div class="tour-actions">
        <button class="secondary" type="button"
          data-edit="${esc(t.id)}">
          Modifier
        </button>

        <button class="secondary" type="button"
          data-toggle="${esc(t.id)}">
          ${t.status === 'Inscriptions ouvertes'
            ? 'Fermer les inscriptions'
            : 'Ouvrir les inscriptions'}
        </button>

        <button class="danger" type="button"
          data-delete="${esc(t.id)}">
          Supprimer
        </button>
      </div>
    </div>
  `).join('') || '<p class="tour-muted">Aucun tournoi.</p>';

  adminSignups.innerHTML = signups.map(s => `
    <div class="signup-card">

      ${s.logo
        ? `<img class="tour-logo" src="${esc(s.logo)}" alt="Logo équipe">`
        : ''}

      <b>${esc(s.teamName)}</b>

      <small>
        ${esc(s.tournamentName)} · ${esc(s.format)}
        · Chef : ${esc(s.captain)}
      </small>

      <small>
        Titulaires :
        ${esc([
          s.player1 || s.captain,
          s.player2,
          s.player3,
          s.player4
        ].filter(Boolean).join(', '))}
      </small>

      <small>
        Remplaçants :
        ${esc([s.sub1,s.sub2].filter(Boolean).join(', ') || '—')}
        · ${esc(s.status)}
      </small>

      <div class="tour-actions">
        <button class="secondary" type="button"
          data-approve="${esc(s.id)}">
          Valider
        </button>

        <button class="danger" type="button"
          data-refuse="${esc(s.id)}">
          Refuser
        </button>
      </div>
    </div>
  `).join('') || '<p class="tour-muted">Aucune inscription reçue.</p>';
}

function signupForm(tournament) {
  const box = $('#teamSignup');
  if(!box) return;

  box.hidden = false;

  box.innerHTML = `
    <form id="joinForm" class="tour-form">

      <h3>Inscription — ${esc(tournament.name)}</h3>

      <input type="hidden" name="tid" value="${esc(tournament.id)}">

      <label>
        Nom de la squad
        <input name="team" required maxlength="80">
      </label>

      <label>
        Chef d'équipe / Joueur 1
        <input name="captain" required maxlength="32">
      </label>

      <label>
        ID Free Fire du chef
        <input name="captainId" required maxlength="40">
      </label>

      ${roster(tournament.format)}

      <label>
        Logo de l'équipe (facultatif)
        <input type="file" name="logo" accept="image/*">
      </label>

      <button class="primary" type="submit">
        Envoyer l'inscription
      </button>

      <p class="tour-message" id="joinMsg"></p>
    </form>
  `;

  box.scrollIntoView({behavior:'auto',block:'start'});
}

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if(!button) return;

  if(button.dataset.tab === 'tournaments') {
    show();
    return;
  }

  try {
    if(button.dataset.enter) {
      const tournament = tournaments.find(
        t => t.id === button.dataset.enter
      );

      if(tournament) signupForm(tournament);
    }

    else if(button.dataset.toggle) {
      const tournament = tournaments.find(
        t => t.id === button.dataset.toggle
      );

      if(tournament) {
        button.disabled = true;

        await call('tournaments', {
          action:'status',
          id:tournament.id,
          status:tournament.status === 'Inscriptions ouvertes'
            ? 'Inscriptions fermées'
            : 'Inscriptions ouvertes'
        });

        await refresh();
      }
    }

    else if(button.dataset.delete) {
      if(confirm('Supprimer définitivement ce tournoi ?')) {
        button.disabled = true;

        await call('tournaments', {
          action:'delete',
          id:button.dataset.delete
        });

        await refresh();
      }
    }

    else if(button.dataset.edit) {
      const tournament = tournaments.find(
        t => t.id === button.dataset.edit
      );

      const form = $('#createTournament');

      if(tournament && form) {
        form.elements.id.value = tournament.id;
        form.elements.name.value = tournament.name;
        form.elements.game.value = tournament.game;

        fillFormats(form);

        form.elements.format.value = tournament.format;
        form.elements.date.value = tournament.date
          ? new Date(tournament.date).toISOString().slice(0,16)
          : '';

        form.elements.deadline.value = tournament.deadline
          ? new Date(tournament.deadline).toISOString().slice(0,16)
          : '';

        form.elements.limit.value = tournament.limit || 0;
        form.elements.rules.value = tournament.rules || '';

        form.scrollIntoView({behavior:'auto',block:'start'});
      }
    }

    else if(button.dataset.approve || button.dataset.refuse) {
      button.disabled = true;

      await call('tournament-signups', {
        id:button.dataset.approve || button.dataset.refuse,
        status:button.dataset.approve ? 'Acceptée' : 'Refusée'
      });

      await refresh();
    }

    else if(button.id === 'resetTournament') {
      const form = $('#createTournament');

      form.reset();
      form.elements.id.value = '';
      fillFormats(form);

      $('#createMsg').textContent = '';
    }

  } catch(error) {
    alert(error.message);
    button.disabled = false;
  }
});

document.addEventListener('change', event => {
  if(
    event.target.name === 'game' &&
    event.target.closest('#createTournament')
  ) {
    fillFormats(event.target.form);
  }
});

document.addEventListener('submit', async event => {

  if(event.target.id === 'joinForm') {
    event.preventDefault();

    if(busy) return;
    busy = true;

    const form = new FormData(event.target);
    const message = $('#joinMsg');

    const tournament = tournaments.find(
      t => t.id === form.get('tid')
    );

    try {
      if(!tournament) {
        throw Error('Ce tournoi n’est plus disponible.');
      }

      message.textContent = 'Envoi en cours...';

      const logoFile = form.get('logo');
      const logo = logoFile && logoFile.size
        ? await photo(logoFile)
        : '';

      const players = {};

      for(let i = 2; i <= count(tournament.format); i++) {
        players['p' + i] = String(form.get('p' + i) || '').trim();
        players['id' + i] = String(form.get('id' + i) || '').trim();
      }

      if(tournament.format === 'Mode Espoir') {
        for(let i = 1; i <= 2; i++) {
          players['s' + i] = String(form.get('s' + i) || '').trim();
          players['sid' + i] = String(form.get('sid' + i) || '').trim();
        }
      }

      await call('tournament-register', {
        tournamentId:tournament.id,
        teamName:String(form.get('team')).trim(),
        captain:String(form.get('captain')).trim(),
        captainId:String(form.get('captainId')).trim(),
        logo,
        players
      });

      message.textContent =
        'Inscription envoyée, en attente de validation.';

      event.target.reset();

    } catch(error) {
      message.textContent = 'Erreur : ' + error.message;
    } finally {
      busy = false;
    }
  }

  if(event.target.id === 'createTournament') {
    event.preventDefault();

    if(busy) return;
    busy = true;

    const form = new FormData(event.target);
    const message = $('#createMsg');

    try {
      message.textContent = 'Enregistrement...';

      await call('tournaments', {
        action:'save',
        id:form.get('id'),
        name:String(form.get('name')).trim(),
        game:form.get('game'),
        format:form.get('format'),
        date:form.get('date'),
        deadline:form.get('deadline'),
        limit:form.get('limit'),
        rules:form.get('rules')
      });

      message.textContent = 'Tournoi enregistré.';

      event.target.reset();
      event.target.elements.id.value = '';

      fillFormats(event.target);
      await refresh();

    } catch(error) {
      message.textContent = 'Erreur : ' + error.message;
    } finally {
      busy = false;
    }
  }
});

function init() {
  addStyles();
  ensureUI();

  const form = $('#createTournament');

if(form) {
  fillFormats(form);
  form.addEventListener('submit', event => {
    event.preventDefault();
  });
}
  updateAdmin();
  refresh();

  window.addEventListener('mou:admin-auth', () => {
    updateAdmin();
    refresh();
  });
}

if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, {once:true});
} else {
  init();
}

})();
