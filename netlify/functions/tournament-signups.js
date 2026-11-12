
const { verify, airtable } = require('./auth');

const T = 'Inscriptions tournois';

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

const M = (r) => ({
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
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return R(200, {});
  }

  try {
    // Seul un administrateur connecté peut consulter les inscriptions.
    if (!verify(event)) {
      return R(401, { error: 'Accès administrateur requis' });
    }

    if (event.httpMethod === 'GET') {
      const data = await airtable(
        encodeURIComponent(T) + '?pageSize=100'
      );

      return R(200, {
        signups: (data.records || []).map(M)
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

      await airtable(T + '/' + x.id, {
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
