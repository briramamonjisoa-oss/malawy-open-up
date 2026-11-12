const { verify, airtable } = require('./auth');

const T = 'Inscriptions tournois';
const P = 'Inscriptions';

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const R = (status, data) => ({
  statusCode: status,
  headers: H,
  body: JSON.stringify(data)
});

async function addAcceptedPlayers(signup) {
  const f = signup.fields || {};
  const format = f.Format || '';
  const esport = format === 'E_sport';
  const count = esport ? 4 : Number(format[0]) || 1;
  const players = [];

  for (let i = 1; i <= count; i++) {
    const pseudo = f['Joueur ' + i] || '';
    const id = f['ID joueur ' + i] || '';

    if (pseudo && id) players.push({ pseudo, id });
  }

  if (esport) {
    for (let i = 1; i <= 2; i++) {
      const pseudo = f['Remplaçant ' + i];
      const id = f['ID remplaçant ' + i];
      if (pseudo && id) players.push({ pseudo, id });
    }
  }

  if (!players.length) {
    throw Error('Aucun joueur trouvé dans cette inscription.');
  }

  for (const player of players) {
    const safeId = String(player.id)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");

    const query = new URLSearchParams({
      filterByFormula: `{ID Free Fire}='${safeId}'`,
      maxRecords: '1'
    });

    const existing = await airtable(`${P}?${query}`);

    if (existing.records && existing.records.length) {
      const record = existing.records[0];

      await airtable(`${P}/${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fields: { 'Statut inscription': 'Accepté' }
        })
      });
    } else {
      await airtable(P, {
        method: 'POST',
        body: JSON.stringify({
          records: [{
            fields: {
              'Pseudo Free Fire': player.pseudo,
              'ID Free Fire': String(player.id),
              'Statut inscription': 'Accepté'
            }
          }]
        })
      });
    }
  }

  return players.length;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return R(200, {});

  try {
    if (!verify(event)) {
      return R(401, { error: 'Accès administrateur requis' });
    }

    if (event.httpMethod === 'GET') {
      const data = await airtable(
        encodeURIComponent(T) + '?pageSize=100'
      );

      return R(200, {
        signups: (data.records || []).map(r => ({
          id: r.id,
          teamName: r.fields['Nom équipe'] || '',
          tournamentName: r.fields['Nom tournoi'] || '',
          format: r.fields.Format || '',
          captain: r.fields['Chef équipe'] || '',
          player1: r.fields['Joueur 1'] || '',
          player2: r.fields['Joueur 2'] || '',
          player3: r.fields['Joueur 3'] || '',
          player4: r.fields['Joueur 4'] || '',
          sub1: r.fields['Remplaçant 1'] || '',
          sub2: r.fields['Remplaçant 2'] || '',
          logo: r.fields['Logo équipe'] || '',
          status: r.fields.Statut || 'En attente'
        }))
      });
    }

    if (event.httpMethod === 'POST') {
      const x = JSON.parse(event.body || '{}');

      if (!x.id) {
        return R(400, { error: 'Identifiant inscription manquant' });
      }

      if (!['Acceptée', 'Refusée'].includes(x.status)) {
        return R(400, { error: 'Statut invalide' });
      }

      const signup = await airtable(`${T}/${x.id}`);

      if (x.status === 'Acceptée' && signup.fields.Statut !== 'Acceptée') {
        const count = await addAcceptedPlayers(signup);

        await airtable(`${T}/${x.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            fields: { Statut: 'Acceptée' }
          })
        });

        return R(200, {
          success: true,
          message: `${count} joueur(s) ajouté(s) aux participants.`
        });
      }

      await airtable(`${T}/${x.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fields: { Statut: x.status }
        })
      });

      return R(200, { success: true });
    }

    return R(405, { error: 'Méthode invalide' });

  } catch (error) {
    return R(400, { error: error.message });
  }
};
