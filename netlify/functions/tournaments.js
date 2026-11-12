
const {verify, airtable} = require('./auth');

const T = 'Tournois';

const H = {
  'Content-Type':'application/json',
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'Content-Type, Authorization',
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS'
};

const R = (status, data) => ({
  statusCode:status,
  headers:H,
  body:JSON.stringify(data)
});

function mapTournament(r) {
  const f = r.fields || {};
  return {
    id:r.id,
    name:f['Nom du tournoi'] || '',
    game:f.Jeu || '',
    format:f.Format || '',
    status:f.Statut || 'Brouillon',
    date:f['Date du tournoi'] || '',
    deadline:f['Date limite inscription'] || '',
    limit:f["Nombre maximum d'équipes"] || 0,
    rules:f['Description et règles'] || '',
    poster:f['Affiche du tournoi'] || ''
  };
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return R(200, {});

  try {
    if (event.httpMethod === 'GET') {
      const data = await airtable(
        encodeURIComponent(T) + '?pageSize=100'
      );

      return R(200, {
        tournaments:(data.records || []).map(mapTournament)
      });
    }

    if (event.httpMethod !== 'POST') {
      return R(405, {error:'Méthode non autorisée'});
    }

    if (!verify(event)) {
      return R(401, {error:'Accès administrateur requis'});
    }

    const x = JSON.parse(event.body || '{}');

    if (x.action === 'delete') {
      if (!x.id) throw Error('Identifiant manquant');

      await airtable(T + '/' + encodeURIComponent(x.id), {
        method:'DELETE'
      });

      return R(200, {success:true});
    }

    if (x.action === 'status') {
      if (!x.id) throw Error('Identifiant manquant');

      if (!['Inscriptions ouvertes','Inscriptions fermées'].includes(x.status)) {
        throw Error('Statut invalide');
      }

      await airtable(T + '/' + encodeURIComponent(x.id), {
        method:'PATCH',
        body:JSON.stringify({
          fields:{Statut:x.status}
        })
      });

      return R(200, {success:true});
    }

    if (x.action !== 'save') {
      throw Error('Action inconnue');
    }

    if (!x.name || !String(x.name).trim()) {
      throw Error('Le nom du tournoi est obligatoire');
    }

    if (!['Clash Squad','Battle Royale'].includes(x.game)) {
      throw Error('Jeu invalide');
    }

    if (!['1v1','2v2','3v3','4v4','E_sport'].includes(x.format)) {
      throw Error('Format invalide');
    }

    if (x.format === 'E_sport' && x.game !== 'Battle Royale') {
      throw Error('E_sport disponible uniquement en Battle Royale');
    }

    const fields = {
      'Nom du tournoi':String(x.name).trim(),
      'Jeu':x.game,
      'Format':x.format,
      'Statut':'Inscriptions ouvertes',
      "Nombre maximum d'équipes":Math.max(0, Number(x.limit) || 0),
      'Description et règles':x.rules || ''
    };

    if (x.date) {
      fields['Date du tournoi'] = new Date(x.date).toISOString();
    }

    if (x.deadline) {
      fields['Date limite inscription'] = new Date(x.deadline).toISOString();
    }

    if (x.poster) {
      fields['Affiche du tournoi'] = x.poster;
    }

    let result;

    if (x.id) {
      result = await airtable(
        T + '/' + encodeURIComponent(x.id),
        {
          method:'PATCH',
          body:JSON.stringify({fields})
        }
      );
    } else {
      result = await airtable(T, {
        method:'POST',
        body:JSON.stringify({
          records:[{fields}]
        })
      });
    }

    return R(200, {
      success:true,
      id:result.id
    });

  } catch (error) {
    return R(400, {
      error:error.message || 'Erreur serveur'
    });
  }
};
