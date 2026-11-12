
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

    if (!x.tournamentId || !x.teamName || !x.captain || !x.captainId) {
      throw Error('Informations équipe incomplètes');
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
      'Battle Royale': ['1v1', '2v2', '3v3', '4v4', 'Mode Espoir']
    };

    if (!formats[game] || !formats[game].includes(format)) {
      throw Error('Format de tournoi invalide');
    }

    const espoir = format === 'Mode Espoir';
    const numberOfPlayers = espoir ? 4 : Number(format[0]);
    const p = x.players || {};

    for (let i = 2; i <= numberOfPlayers; i++) {
      if (!p['p' + i] || !p['id' + i]) {
        throw Error('Tous les titulaires doivent être renseignés');
      }
    }

    if (espoir && (!p.s1 || !p.sid1 || !p.s2 || !p.sid2)) {
      throw Error('Les deux remplaçants sont obligatoires');
    }

    const fields = {
      'Nom équipe': x.teamName,
      'ID tournoi': x.tournamentId,
      'Nom tournoi': f['Nom du tournoi'],
      'Jeu': game,
      'Format': format,
      'Chef équipe': x.captain,
      'ID Free Fire chef': x.captainId,
      'Joueur 1': x.captain,
      'ID joueur 1': x.captainId,
      'Statut': 'En attente',
      'Date inscription': new Date().toISOString()
    };

    if (x.logo) fields['Logo équipe'] = x.logo;

    for (let i = 2; i <= numberOfPlayers; i++) {
      fields['Joueur ' + i] = p['p' + i];
      fields['ID joueur ' + i] = p['id' + i];
    }

    if (espoir) {
      for (let i = 1; i <= 2; i++) {
        fields['Remplaçant ' + i] = p['s' + i];
        fields['ID remplaçant ' + i] = p['sid' + i];
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
