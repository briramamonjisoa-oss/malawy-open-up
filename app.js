
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const state = {
  players: [],
  matches: JSON.parse(localStorage.getItem('mou_matches') || '[]'),
  admin: false
};

// Navigation
function tab(name) {
  $$('.page').forEach(x =>
    x.classList.toggle('active', x.id === name)
  );

  $$('[data-tab]').forEach(x =>
    x.classList.toggle('active', x.dataset.tab === name)
  );

  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

$$('[data-tab]').forEach(b =>
  b.addEventListener('click', () => tab(b.dataset.tab))
);

$$('[data-go]').forEach(b =>
  b.addEventListener('click', () => tab(b.dataset.go))
);

if ($('#year')) {
  $('#year').textContent = new Date().getFullYear();
}

// Charger les joueurs depuis Airtable via Netlify
async function loadPlayers() {
  try {
    const response = await fetch('/.netlify/functions/players');

    if (!response.ok) {
      throw new Error('Impossible de charger les joueurs');
    }

    state.players = await response.json();
    render();

  } catch (error) {
    console.error(error);
    state.players = [];
    render();
  }
}

// Sécuriser le texte affiché
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

// Afficher les informations
function render() {
  const wins = state.matches.filter(m => m.sa !== m.sb).length;

  if ($('#statPlayers')) {
    $('#statPlayers').textContent = state.players.length;
  }

  if ($('#statMatches')) {
    $('#statMatches').textContent = state.matches.length;
  }

  if ($('#statWins')) {
    $('#statWins').textContent = wins;
  }

  if ($('#playersList')) {
    $('#playersList').innerHTML = state.players.length
      ? state.players.map(p => `
          <div class="item">
            <div>
              <b>${esc(p.pseudo || 'Joueur')}</b>
              <small>${esc(p.mode || 'Inscrit')}</small>
            </div>
            <span class="pill">PARTICIPANT</span>
          </div>
        `).join('')
      : '<p class="muted">Aucun joueur inscrit pour le moment.</p>';
  }

  if ($('#matchList')) {
    $('#matchList').innerHTML = state.matches.length
      ? state.matches.map(m => `
          <div class="item">
            <div>
              <b>${esc(m.a)} <span class="muted">vs</span> ${esc(m.b)}</b>
              <small>${esc(m.mode)}</small>
            </div>
            <span class="score">${m.sa} – ${m.sb}</span>
          </div>
        `).join('')
      : '<p class="muted">Aucun résultat enregistré.</p>';
  }

  const scores = {};

  state.matches.forEach(m => {
    scores[m.a] = (scores[m.a] || 0) +
      (m.sa > m.sb ? 3 : m.sa === m.sb ? 1 : 0);

    scores[m.b] = (scores[m.b] || 0) +
      (m.sb > m.sa ? 3 : m.sb === m.sa ? 1 : 0);
  });

  const ranking = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  if ($('#rankingList')) {
    $('#rankingList').innerHTML = ranking.length
      ? ranking.map(([name, score], index) => `
          <div class="item">
            <b>#${index + 1} ${esc(name)}</b>
            <span class="score">${score} pts</span>
          </div>
        `).join('')
      : '<p class="muted">Le classement apparaîtra après les premiers résultats.</p>';
  }
}

// Inscription joueur
if ($('#regForm')) {
  $('#regForm').addEventListener('submit', async event => {
    event.preventDefault();

    const form = new FormData(event.target);

    const player = {
      pseudo: String(form.get('pseudo') || '').trim(),
      playerId: String(form.get('ffid') || '').trim(),
      mode: String(form.get('mode') || '')
    };

    const message = $('#regMsg');

    if (!player.pseudo || !player.playerId ||
        !['1 VS 1', '2 VS 1'].includes(player.mode)) {
      message.textContent = 'Vérifie les informations saisies.';
      return;
    }

    message.textContent = 'Envoi de ton inscription…';

    try {
      const response = await fetch('/.netlify/functions/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(player)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Échec de l’inscription');
      }

      message.textContent =
        'Inscription réussie ! Bienvenue dans l’arène.';

      event.target.reset();
      await loadPlayers();

    } catch (error) {
      console.error(error);
      message.textContent =
        'Erreur : ' + error.message +
        '. Ton inscription n’a pas été enregistrée.';
    }
  });
}

// Enregistrer les résultats des matchs
if ($('#matchForm')) {
  $('#matchForm').addEventListener('submit', event => {
    event.preventDefault();

    if (!state.admin) {
      alert('Accès administrateur nécessaire.');
      return;
    }

    const form = new FormData(event.target);

    state.matches.unshift({
      a: String(form.get('a') || '').trim(),
      b: String(form.get('b') || '').trim(),
      sa: Number(form.get('sa')),
      sb: Number(form.get('sb')),
      mode: String(form.get('mode') || ''),
      date: new Date().toISOString()
    });

    localStorage.setItem(
      'mou_matches',
      JSON.stringify(state.matches)
    );

    event.target.reset();
    render();
  });
}

// Actualiser les joueurs
if ($('#refresh')) {
  $('#refresh').onclick = loadPlayers;
}

// Administration : vérification côté serveur
if ($('#adminForm')) {
  $('#adminForm').addEventListener('submit', async event => {
    event.preventDefault();

    const message = $('#adminMsg');
    const input = event.target.querySelector('input');
    const code = input ? input.value : '';

    message.textContent = 'Vérification du code…';

    try {
      const response = await fetch('/.netlify/functions/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Code incorrect');
      }

      state.admin = true;
      event.target.hidden = true;

      if ($('#adminContent')) {
        $('#adminContent').hidden = false;
      }

      message.textContent =
        'Bienvenue dans l’espace administrateur !';

    } catch (error) {
      state.admin = false;
      message.textContent = error.message;
    }
  });
}

// Déconnexion administrateur
if ($('#logout')) {
  $('#logout').onclick = () => {
    state.admin = false;

    if ($('#adminContent')) {
      $('#adminContent').hidden = true;
    }

    if ($('#adminForm')) {
      $('#adminForm').hidden = false;
      $('#adminForm').reset();
    }

    if ($('#adminMsg')) {
      $('#adminMsg').textContent = '';
    }
  };
}

// Exporter les matchs
if ($('#export')) {
  $('#export').onclick = () => {
    if (!state.admin) {
      alert('Accès administrateur nécessaire.');
      return;
    }

    const blob = new Blob(
      [JSON.stringify(state.matches, null, 2)],
      { type: 'application/json' }
    );

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'malawy-matchs.json';
    link.click();

    URL.revokeObjectURL(link.href);
  };
}

// Installation PWA
let deferred;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferred = event;

  if ($('#install')) {
    $('#install').hidden = false;
  }
});

if ($('#install')) {
  $('#install').onclick = async () => {
    if (deferred) {
      deferred.prompt();
      deferred = null;
    } else {
      alert(
        'Sur Android : menu Chrome ⋮ puis Installer l’application ou Ajouter à l’écran d’accueil.'
      );
    }
  };
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(error =>
        console.error('Service Worker :', error)
      );
  });
}

// Démarrage
loadPlayers();
