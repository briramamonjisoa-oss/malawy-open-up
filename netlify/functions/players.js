
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  try {
    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!token || !baseId) {
      throw new Error('Configuration Airtable manquante');
    }

    let records = [];
    let offset = null;

    do {
      const params = new URLSearchParams({
        pageSize: '100'
      });

      if (offset) {
        params.set('offset', offset);
      }

      const url =
        `https://api.airtable.com/v0/${baseId}/Inscriptions?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Impossible de récupérer les joueurs'
        );
      }

      records = records.concat(result.records || []);
      offset = result.offset || null;

    } while (offset);

    const players = records.map(record => ({
      pseudo: record.fields['Pseudo Free Fire'] || 'Joueur',
      mode: record.fields['Mode de combat'] || 'Inscrit'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(players)
    };

  } catch (error) {
    console.error('Erreur chargement joueurs :', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
