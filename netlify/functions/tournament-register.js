
const { airtable } = require('./auth');

const T = 'Inscriptions tournois';
const U = 'Tournois';

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const R = (status, data) => ({
  statusCode: status,
  headers: H,
  body: JSON.stringify(data)
});

function clean(value) {
  return String(value || '').trim();
}

function escapeFormula(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

async function getTournamentSignups(tournamentId) {
  const formula = `{ID tournoi}='${escapeFormula(tournamentId)}'`;
  let records = [];
  let offset = '';

  do {
    const params = new URLSearchParams({
      filterByFormula: formula,
      pageSize: '100'
    });

    if (offset) params.set('offset', offset);

    const data = await airtable(
      encodeURIComponent(T) + '?' + params.toString()
    );

    records = records.concat(data.records || []);
    offset = data.offset || '';
  } while (offset);

  return records;
}

function getSignupUIDs(fields) {
  const ids = [];

  for (let i = 1; i <= 4; i++) {
    if (fields['ID joueur ' + i]) {
      ids.push(clean(fields['ID joueur ' + i]));
    }
  }

  for (let i = 1; i <= 2; i++) {
    if (fields['ID remplaçant ' + i]) {
      ids.push(clean(fields['ID remplaçant ' + i]));
    }
  }

  return ids;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return R(200, {});

  if (event.httpMethod !== 'POST') {
    return R(405, { error: 'Méthode invalide' });
  }

  try {
    const x = JSON.parse(event.body || '{}');

    if (!x.tournamentId) {
      throw Error('Identifiant du tournoi manquant');
    }

    const tournament = await airtable(
      encodeURIComponent(U) + '/' + encodeURIComponent(x.tournamentId)
    );

    const f = tournament.fields || {};

    if (f.Statut !== 'Inscriptions ouvertes') {
      throw Error('Les inscriptions sont fermées');
    }

    const format = f.Format;
    const game = f.Jeu;

    const formats = {
      'Clash Squad': ['1v1', '2v2', '3v3', '4v4'],
      'Battle Royale': ['1v1', '2v2', '3v3', '4v4', 'E_sport']
    };

    if (!formats[game] || !formats[game].includes(format)) {
      throw Error('Format de tournoi invalide');
    }

    // Vérification de la date limite
    if (f['Date limite inscription']) {
      const deadline = new Date(f['Date limite inscription']);

      if (Number.isNaN(deadline.getTime())) {
        throw Error("La date limite d'inscription est invalide");
      }

      if (Date.now() > deadline.getTime()) {
        throw Error("La date limite d'inscription est dépassée");
      }
    }

    const esport = format === 'E_sport';
    const numberOfPlayers = esport ? 4 : Number(format[0]);
    const p = x.players || {};

    const players = [];
    const submittedUIDs = new Set();

    // Vérification des titulaires
    for (let i = 1; i <= numberOfPlayers; i++) {
      const pseudo = clean(p['p' + i]);
      const uid = clean(p['id' + i]);

      if (!pseudo || !uid) {
        throw Error('Le pseudo et l’UID de chaque joueur sont obligatoires');
      }

      if (submittedUIDs.has(uid)) {
        throw Error('Un même UID ne peut pas être utilisé plusieurs fois');
      }

      submittedUIDs.add(uid);
      players.push({ pseudo, uid });
    }

    // Vérification du capitaine E_sport
    if (esport) {
      if (!clean(x.captain) || !clean(x.captainId)) {
        throw Error('Le capitaine est obligatoire');
      }

      if (
        clean(x.captain) !== players[0].pseudo ||
        clean(x.captainId) !== players[0].uid
      ) {
        throw Error('Le capitaine doit être le joueur 1');
      }

      // Vérification des deux remplaçants
      for (let i = 1; i <= 2; i++) {
        const pseudo = clean(p['s' + i]);
        const uid = clean(p['sid' + i]);

        if (!pseudo || !uid) {
          throw Error('Les deux remplaçants et leurs UID sont obligatoires');
        }

        if (submittedUIDs.has(uid)) {
          throw Error('Un même UID ne peut pas être utilisé plusieurs fois');
        }

        submittedUIDs.add(uid);
        players.push({ pseudo, uid, substitute: true });
      }
    }

    // Vérification des inscriptions existantes
    const existingSignups = await getTournamentSignups(x.tournamentId);

    // Aucune limite de nombre d'équipes : les inscriptions restent ouvertes
    // jusqu'à la date limite ou la fermeture du tournoi par l'administration.

    // Vérification des UID déjà inscrits à ce tournoi
    const existingUIDs = new Set();

    for (const record of activeSignups) {
      for (const uid of getSignupUIDs(record.fields || {})) {
        existingUIDs.add(uid);
      }
    }

    for (const player of players) {
      if (existingUIDs.has(player.uid)) {
        throw Error(
          'L’UID ' + player.uid + ' est déjà inscrit à ce tournoi'
        );
      }
    }

    // Préparation des données Airtable
    const fields = {
      'ID tournoi': x.tournamentId,
      'Nom tournoi': f['Nom du tournoi'] || '',
      'Jeu': game,
      'Format': format,
      'Statut': 'En attente',
      'Date inscription': new Date().toISOString()
    };

    if (esport) {
      fields['Nom équipe'] =
        clean(x.teamName) || 'E_sport - ' + players[0].pseudo;

      fields['Chef équipe'] = clean(x.captain);
      fields['ID Free Fire chef'] = clean(x.captainId);

      if (x.logo) {
        fields['Logo équipe'] = x.logo;
      }
    }

    for (let i = 1; i <= numberOfPlayers; i++) {
      fields['Joueur ' + i] = players[i - 1].pseudo;
      fields['ID joueur ' + i] = players[i - 1].uid;
    }

    if (esport) {
      for (let i = 1; i <= 2; i++) {
        const substitute = players[numberOfPlayers + i - 1];

        fields['Remplaçant ' + i] = substitute.pseudo;
        fields['ID remplaçant ' + i] = substitute.uid;
      }
    }

    const result = await airtable(encodeURIComponent(T), {
      method: 'POST',
      body: JSON.stringify({
        records: [{ fields }]
      })
    });

    return R(200, {
      success: true,
      id: result.records?.[0]?.id,
      message: 'Inscription envoyée avec succès'
    });

  } catch (error) {
    return R(400, {
      error: error.message || 'Erreur serveur'
    });
  }
};
