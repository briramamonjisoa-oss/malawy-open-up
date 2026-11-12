
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return R(200, {});
  if (event.httpMethod !== 'POST') return R(405, { error: 'Méthode invalide' });

  try {
    const x = JSON.parse(event.body || '{}');

    if (!x.tournamentId) {
      throw Error('Identifiant du tournoi manquant');
    }

    const tournament = await airtable(U + '/' + x.tournamentId);
    const f = tournament.fields || {};

    if (f.Statut !== 'Inscriptions ouvertes') {
      throw Error('Inscriptions fermées');
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

    const esport = format === 'E_sport';
    const numberOfPlayers = esport ? 4 : Number(format[0]);
    const p = x.players || {};

    for (let i = 1; i <= numberOfPlayers; i++) {
      if (!String(p['p' + i] || '').trim() ||
          !String(p['id' + i] || '').trim()) {
        throw Error('Le pseudo et l’UID de chaque joueur sont obligatoires');
      }
    }

    if (esport) {
      if (!x.captain || !x.captainId) {
        throw Error('Le capitaine est obligatoire');
      }

      if (String(x.captain).trim() !== String(p.p1).trim() ||
          String(x.captainId).trim() !== String(p.id1).trim()) {
        throw Error('Le capitaine doit être le joueur 1');
      }

      if (!p.s1 || !p.sid1 || !p.s2 || !p.sid2) {
        throw Error('Les deux remplaçants sont obligatoires');
      }
    }

    const fields = {
      'ID tournoi': x.tournamentId,
      'Nom tournoi': f['Nom du tournoi'] || '',
      'Jeu': game,
      'Format': format,
      'Statut': 'En attente',
      'Date inscription': new Date().toISOString()
    };

    if (esport) {
      fields['Nom équipe'] = x.teamName || 'E_sport - ' + p.p1;
      fields['Chef équipe'] = x.captain;
      fields['ID Free Fire chef'] = x.captainId;

      if (x.logo) fields['Logo équipe'] = x.logo;
    }

    for (let i = 1; i <= numberOfPlayers; i++) {
      fields['Joueur ' + i] = String(p['p' + i]).trim();
      fields['ID joueur ' + i] = String(p['id' + i]).trim();
    }

    if (esport) {
      for (let i = 1; i <= 2; i++) {
        fields['Remplaçant ' + i] = String(p['s' + i]).trim();
        fields['ID remplaçant ' + i] = String(p['sid' + i]).trim();
      }
    }

    const result = await airtable(T, {
      method: 'POST',
      body: JSON.stringify({
        records: [{ fields }]
      })
    });

    return R(200, {
      success: true,
      id: result.records?.[0]?.id
    });

  } catch (error) {
    return R(400, { error: error.message });
  }
};
