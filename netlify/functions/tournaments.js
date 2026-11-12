
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

function mapTournament(r) {
  const f = r.fields || {};

  return {
    id: r.id,
    name: f['Nom du tournoi'] || '',
    game: f.Jeu || '',
    format: f.Format || '',
    status: f.Statut || 'Brouillon',
    date: f['Date du tournoi'] || '',
    deadline: f['Date limite inscription'] || '',
    limit: f["Nombre maximum d'équipes"] || 0,
    rules: f['Description et règles'] || '',
    poster: f['Affiche du tournoi'] || ''
  };
}

// Récupérer tous les tournois, sans limite de 100
async function getAllRecords() {
  let records = [];
  let offset = '';

  do {
    const params = new URLSearchParams({
      pageSize: '100'
    });

    if (offset) {
      params.set('offset', offset);
    }

    const data = await airtable(
      encodeURIComponent(T) + '?' + params.toString()
    );

    records = records.concat(data.records || []);
    offset = data.offset || '';

  } while (offset);

  return records;
}

async function getTableRecords(table) {
  let records = [], offset = '';
  do {
    const params = new URLSearchParams({pageSize:'100'});
    if (offset) params.set('offset', offset);
    const data = await airtable(encodeURIComponent(table)+'?'+params.toString());
    records.push(...(data.records || []));
    offset = data.offset || '';
  } while (offset);
  return records;
}

async function deleteRecords(table, records) {
  for (let i=0;i<records.length;i+=10) {
    const batch=records.slice(i,i+10);
    for (const record of batch) {
      await airtable(encodeURIComponent(table)+'/'+encodeURIComponent(record.id),{method:'DELETE'});
    }
  }
}

async function cleanupExpiredTournaments() {
  const [tournaments, signups, teams] = await Promise.all([
    getAllRecords(),
    getTableRecords('Inscriptions tournois'),
    getTableRecords('Equipes')
  ]);
  const now=Date.now();
  const expired=tournaments.filter(r=>{
    const date=r.fields?.['Date du tournoi'];
    return date && !Number.isNaN(new Date(date).getTime()) && new Date(date).getTime() < now;
  });
  if (!expired.length) return tournaments;
  const expiredIds=new Set(expired.map(r=>r.id));
  const expiredSignups=signups.filter(s=>expiredIds.has(String(s.fields?.['ID tournoi']||'')));
  const signupIds=new Set(expiredSignups.map(s=>s.id));
  const expiredTeams=teams.filter(t=>signupIds.has(String(t.fields?.['ID inscription tournoi']||'')));
  await deleteRecords('Equipes',expiredTeams);
  await deleteRecords('Inscriptions tournois',expiredSignups);
  await deleteRecords(T,expired);
  return tournaments.filter(t=>!expiredIds.has(t.id));
}

// Vérifier et convertir une date
function parseDate(value, label) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw Error(label + ' invalide');
  }

  return date.toISOString();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return R(200, {});
  }

  try {

    // LISTE PUBLIQUE DES TOURNOIS
    if (event.httpMethod === 'GET') {
      const records = await cleanupExpiredTournaments();

      return R(200, {
        tournaments: records.map(mapTournament)
      });
    }

    if (event.httpMethod !== 'POST') {
      return R(405, {
        error: 'Méthode non autorisée'
      });
    }

    // SÉCURITÉ ADMINISTRATEUR
    if (!verify(event)) {
      return R(401, {
        error: 'Accès administrateur requis'
      });
    }

    const x = JSON.parse(event.body || '{}');

    // SUPPRIMER UN TOURNOI
    if (x.action === 'delete') {
      if (!x.id) {
        throw Error('Identifiant manquant');
      }

      await airtable(
        encodeURIComponent(T) + '/' + encodeURIComponent(x.id),
        {
          method: 'DELETE'
        }
      );

      return R(200, {
        success: true
      });
    }

    // OUVRIR OU FERMER LES INSCRIPTIONS
    if (x.action === 'status') {
      if (!x.id) {
        throw Error('Identifiant manquant');
      }

      if (![
        'Inscriptions ouvertes',
        'Inscriptions fermées'
      ].includes(x.status)) {
        throw Error('Statut invalide');
      }

      await airtable(
        encodeURIComponent(T) + '/' + encodeURIComponent(x.id),
        {
          method: 'PATCH',
          body: JSON.stringify({
            fields: {
              Statut: x.status
            }
          })
        }
      );

      return R(200, {
        success: true
      });
    }

    // CRÉATION OU MODIFICATION
    if (x.action !== 'save') {
      throw Error('Action inconnue');
    }

    const name = String(x.name || '').trim();

    if (!name) {
      throw Error('Le nom du tournoi est obligatoire');
    }

    // FORMATS AUTORISÉS
    const formats = {
      'Clash Squad': [
        '1v1',
        '2v2',
        '3v3',
        '4v4'
      ],
      'Battle Royale': [
        '1v1',
        '2v2',
        '3v3',
        '4v4',
        'E_sport'
      ]
    };

    if (
      !formats[x.game] ||
      !formats[x.game].includes(x.format)
    ) {
      throw Error('Format invalide pour ce jeu');
    }

    // DATES
    const tournamentDate = parseDate(
      x.date,
      'Date du tournoi'
    );

    const deadlineDate = parseDate(
      x.deadline,
      "Date limite d'inscription"
    );

    if (
      tournamentDate &&
      deadlineDate &&
      new Date(deadlineDate) > new Date(tournamentDate)
    ) {
      throw Error(
        "La date limite d'inscription doit être avant le tournoi."
      );
    }

    // DONNÉES À ENREGISTRER
    const fields = {
      'Nom du tournoi': name,
      'Jeu': x.game,
      'Format': x.format,
      'Statut': 'Inscriptions ouvertes',
      "Nombre maximum d'équipes": Math.max(
        0,
        Number(x.limit) || 0
      ),
      'Description et règles': String(x.rules || '').trim(),

      // null permet d'effacer une ancienne date
      'Date du tournoi': tournamentDate,
      'Date limite inscription': deadlineDate
    };

    // NOUVELLE AFFICHE
    if (x.poster) {
      fields['Affiche du tournoi'] = x.poster;
    }

    // EFFACER EXPLICITEMENT L'AFFICHE
    else if (x.clearPoster === true) {
      fields['Affiche du tournoi'] = null;
    }

    let result;

    // MODIFICATION
    if (x.id) {
      result = await airtable(
        encodeURIComponent(T) + '/' + encodeURIComponent(x.id),
        {
          method: 'PATCH',
          body: JSON.stringify({
            fields
          })
        }
      );
    }

    // CRÉATION
    else {
      result = await airtable(
        encodeURIComponent(T),
        {
          method: 'POST',
          body: JSON.stringify({
            records: [
              {
                fields
              }
            ]
          })
        }
      );
    }

    return R(200, {
      success: true,
      id: result.id || result.records?.[0]?.id
    });

  } catch (error) {

    return R(400, {
      error: error.message || 'Erreur serveur'
    });

  }
};
