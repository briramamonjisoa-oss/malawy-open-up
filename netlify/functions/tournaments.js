const { verify, airtable } = require('./auth');

const T = 'Tournois';

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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return R(200, {});

  try {
    if (event.httpMethod === 'GET') {
      const data = await airtable(T);
      return R(200, { tournaments: data.records || [] });
    }

    if (event.httpMethod !== 'POST') {
      return R(405, { error: 'Méthode invalide' });
    }

    await verify(event);

    const x = JSON.parse(event.body || '{}');

    if (x.action === 'save') {
      if (!String(x.name || '').trim()) {
        throw Error('Nom du tournoi obligatoire');
      }

      const formats = {
        'Clash Squad': ['1v1', '2v2', '3v3', '4v4'],
        'Battle Royale': ['1v1', '2v2', '3v3', '4v4', 'E_sport']
      };

      if (!formats[x.game] || !formats[x.game].includes(x.format)) {
        throw Error('Format invalide pour ce jeu');
      }

      const fields = {
        'Nom du tournoi': String(x.name).trim(),
        'Jeu': x.game,
        'Format': x.format,
        'Statut': 'Inscriptions ouvertes',
        'Date': x.date || '',
        'Date limite': x.deadline || '',
        'Limite équipes': Number(x.limit || 0),
        'Règles': x.rules || ''
      };

      if (x.poster) fields['Affiche'] = x.poster;

      let result;

      if (x.id) {
        result = await airtable(T + '/' + x.id, {
          method: 'PATCH',
          body: JSON.stringify({ fields })
        });
      } else {
        result = await airtable(T, {
          method: 'POST',
          body: JSON.stringify({ records: [{ fields }] })
        });
      }

      return R(200, { success: true, tournament: result });
    }

    if (x.action === 'status') {
      if (!x.id || !['Inscriptions ouvertes', 'Inscriptions fermées'].includes(x.status)) {
        throw Error('Données de statut invalides');
      }

      await airtable(T + '/' + x.id, {
        method: 'PATCH',
        body: JSON.stringify({ fields: { 'Statut': x.status } })
      });

      return R(200, { success: true });
    }

    if (x.action === 'delete') {
      if (!x.id) throw Error('Identifiant manquant');

      await airtable(T + '/' + x.id, {
        method: 'DELETE'
      });

      return R(200, { success: true });
    }

    return R(400, { error: 'Action inconnue' });

  } catch (error) {
    return R(400, { error: error.message });
  }
};
