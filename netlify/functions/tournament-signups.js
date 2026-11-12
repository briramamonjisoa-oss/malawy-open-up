
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

function clean(value) {
  return String(value || '').trim();
}

function escapeFormula(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function getAllRecords(table, extraParams = {}) {
  let records = [];
  let offset = '';

  do {
    const params = new URLSearchParams({
      ...extraParams,
      pageSize: '100'
    });

    if (offset) params.set('offset', offset);

    const data = await airtable(
      encodeURIComponent(table) + '?' + params.toString()
    );

    records = records.concat(data.records || []);
    offset = data.offset || '';
  } while (offset);

  return records;
}


async function createAcceptedTeam(signup) {
  const f = signup.fields || {};
  const signupId = signup.id;
  const existing = await getAllRecords('Equipes', {
    filterByFormula: `{ID inscription tournoi}='${escapeFormula(signupId)}'`,
    maxRecords: '1'
  });
  if (existing.length) return existing[0];

  const format = clean(f.Format);
  const count = format === 'E_sport' ? 4 : Number(format[0]);
  const starters = [];
  for (let i = 1; i <= count; i++) {
    const pseudo = clean(f['Joueur ' + i]);
    if (pseudo) starters.push(pseudo);
  }
  const substitutes = format === 'E_sport'
    ? [clean(f['Remplaçant 1']), clean(f['Remplaçant 2'])].filter(Boolean)
    : [];
  const roster = [...starters, ...substitutes];
  const teamName = clean(f['Nom équipe']) || starters.join(' + ') || 'Équipe';
  const fields = {
    'Nom équipe': teamName,
    'Points': 0,
    'Victoires': 0,
    'Défaites': 0,
    'ID inscription tournoi': signupId,
    'Nom tournoi': clean(f['Nom tournoi']),
    'Format': format,
    'Joueurs': roster.join(', ')
  };
  return airtable('Equipes', {
    method: 'POST',
    body: JSON.stringify({ records: [{ fields }] })
  });
}

async function addAcceptedPlayers(signup) {
  const f = signup.fields || {};
  const format = f.Format || '';
  const esport = format === 'E_sport';

  const count = esport ? 4 : Number(format[0]);

  if (![1, 2, 3, 4].includes(count)) {
    throw Error('Format d’inscription invalide.');
  }

  const players = [];
  const usedUIDs = new Set();

  // Vérification de tous les titulaires
  for (let i = 1; i <= count; i++) {
    const pseudo = clean(f['Joueur ' + i]);
    const id = clean(f['ID joueur ' + i]);

    if (!pseudo || !id) {
      throw Error('Joueur ' + i + ' : pseudo ou UID manquant.');
    }

    if (usedUIDs.has(id)) {
      throw Error('Un UID est utilisé plusieurs fois dans cette équipe.');
    }

    usedUIDs.add(id);
    players.push({ pseudo, id });
  }

  // Vérification des deux remplaçants E_sport
  if (esport) {
    for (let i = 1; i <= 2; i++) {
      const pseudo = clean(f['Remplaçant ' + i]);
      const id = clean(f['ID remplaçant ' + i]);

      if (!pseudo || !id) {
        throw Error('Remplaçant ' + i + ' : pseudo ou UID manquant.');
      }

      if (usedUIDs.has(id)) {
        throw Error('Un UID est utilisé plusieurs fois dans cette équipe.');
      }

      usedUIDs.add(id);
      players.push({ pseudo, id });
    }
  }

  // Ajouter ou actualiser chaque participant
  for (const player of players) {
    const formula = `{ID Free Fire}='${escapeFormula(player.id)}'`;

    const existing = await getAllRecords(P, {
      filterByFormula: formula,
      maxRecords: '1'
    });

    if (existing.length) {
      await airtable(`${P}/${existing[0].id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fields: {
            'Statut inscription': 'Accepté'
          }
        })
      });
    } else {
      await airtable(encodeURIComponent(P), {
        method: 'POST',
        body: JSON.stringify({
          records: [{
            fields: {
              'Pseudo Free Fire': player.pseudo,
              'ID Free Fire': player.id,
              'Statut inscription': 'Accepté'
            }
          }]
        })
      });
    }
  }

  return players.length;
}

async function removeAcceptedTeam(signupId) {
  const formula = "{ID inscription tournoi}='" + escapeFormula(signupId) + "'";
  const teams = await getAllRecords('Equipes', { filterByFormula: formula });
  for (const team of teams) await airtable('Equipes/' + encodeURIComponent(team.id), { method: 'DELETE' });
}
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return R(200, {});

  try {
    if (!verify(event)) {
      return R(401, { error: 'Accès administrateur requis' });
    }

    // Récupération de toutes les demandes
    if (event.httpMethod === 'GET') {
      const records = await getAllRecords(T);
      for (const record of records) {
        if (record.fields?.Statut === 'Acceptée') {
          await createAcceptedTeam(record);
        }
      }

      return R(200, {
        signups: records.map(r => ({
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

    if (event.httpMethod !== 'POST') {
      return R(405, { error: 'Méthode invalide' });
    }

    const x = JSON.parse(event.body || '{}');

    if (!x.id) {
      return R(400, { error: 'Identifiant inscription manquant' });
    }

    if (x.action !== 'delete' && !['Acceptée', 'Refusée', 'Annulée'].includes(x.status)) {
      return R(400, { error: 'Statut invalide' });
    }

    const signup = await airtable(
      encodeURIComponent(T) + '/' + encodeURIComponent(x.id)
    );

    const currentStatus = signup.fields?.Statut || 'En attente';

    if (x.action === 'delete') {
      await removeAcceptedTeam(x.id);
      await airtable(encodeURIComponent(T) + '/' + encodeURIComponent(x.id), { method: 'DELETE' });
      return R(200, { success: true, message: 'Inscription supprimée définitivement.' });
    }

    if (x.status === 'Annulée') {
      await removeAcceptedTeam(x.id);
      await airtable(encodeURIComponent(T) + '/' + encodeURIComponent(x.id), { method: 'PATCH', body: JSON.stringify({ fields: { Statut: 'Annulée' } }) });
      return R(200, { success: true, message: 'Inscription annulée.' });
    }

    if (x.status === 'Acceptée' && currentStatus !== 'Acceptée') {
      const count = await addAcceptedPlayers(signup);
      await createAcceptedTeam(signup);

      await airtable(encodeURIComponent(T) + '/' + encodeURIComponent(x.id),
        {
          method: 'PATCH',
          body: JSON.stringify({
            fields: { Statut: 'Acceptée' }
          })
        }
      );

      return R(200, {
        success: true,
        message: `${count} joueur(s) ajouté(s) aux participants et équipe créée.`
      });
    }

    await airtable(
      encodeURIComponent(T) + '/' + encodeURIComponent(x.id),
      {
        method: 'PATCH',
        body: JSON.stringify({
          fields: { Statut: x.status }
        })
      }
    );

    return R(200, { success: true });

  } catch (error) {
    return R(400, {
      error: error.message || 'Erreur serveur'
    });
  }
};
