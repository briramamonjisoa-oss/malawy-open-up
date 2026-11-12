const crypto = require('crypto');
const { airtable } = require('./auth');

const hashPin = (pin, salt) => crypto.scryptSync(pin, salt, 64).toString('hex');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  try {
    const { pseudo, playerId, mode, pin, photo } = JSON.parse(event.body || '{}');
    const cleanPseudo = String(pseudo || '').trim();
    const cleanPlayerId = String(playerId || '').trim();
    const cleanPin = String(pin || '');

    if (!cleanPseudo || !cleanPlayerId || !['1 VS 1', '2 VS 1'].includes(mode)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Renseigne ton pseudo, ton UID et ton mode de combat.' }) };
    }
    if (!/^[0-9]{4,8}$/.test(cleanPin)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Le PIN doit contenir 4 à 8 chiffres.' }) };
    }
    if (photo !== undefined && photo !== '' && (typeof photo !== 'string' || !/^https:\/\//i.test(photo))) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Photo invalide.' }) };
    }

    let records = [];
    let offset;
    do {
      const query = new URLSearchParams({ pageSize: '100' });
      if (offset) query.set('offset', offset);
      const data = await airtable('Inscriptions?' + query);
      records.push(...(data.records || []));
      offset = data.offset;
    } while (offset);

    const duplicate = records.find(record => {
      const fields = record.fields || {};
      return String(fields['ID Free Fire'] || '').trim() === cleanPlayerId ||
        String(fields['Pseudo Free Fire'] || '').trim().toLowerCase() === cleanPseudo.toLowerCase();
    });

    if (duplicate) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Ce pseudo ou cet UID est déjà inscrit. Si tu as déjà un compte, utilise « Déjà inscrit ? Connexion ».' })
      };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const fields = {
      'Pseudo Free Fire': cleanPseudo,
      'ID Free Fire': cleanPlayerId,
      'Mode de combat': mode,
      'Statut inscription': 'En attente',
      'PIN hash': salt + '$' + hashPin(cleanPin, salt)
    };
    if (photo) fields.Photo = photo;

    const created = await airtable('Inscriptions', {
      method: 'POST',
      body: JSON.stringify({ records: [{ fields }] })
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Inscription envoyée',
        id: created.records?.[0]?.id
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Erreur lors de l’inscription.' })
    };
  }
};
