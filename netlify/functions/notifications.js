const { verify, verifyPlayer, airtable } = require('./auth');
const { sendPush } = require('./push-crypto');

const SUBSCRIPTIONS = 'Push subscriptions';
const QUEUE = 'Notification queue';
const HISTORY = 'Notifications';
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
};
const response = (status, data) => ({ statusCode: status, headers, body: JSON.stringify(data) });
const clean = value => String(value || '').trim();

async function all(table) {
  let records = [], offset = '';
  do {
    const q = new URLSearchParams({ pageSize: '100' });
    if (offset) q.set('offset', offset);
    const data = await airtable(encodeURIComponent(table) + '?' + q);
    records.push(...(data.records || []));
    offset = data.offset || '';
  } while (offset);
  return records;
}

async function createBatch(table, records) {
  for (let i = 0; i < records.length; i += 10) {
    await airtable(encodeURIComponent(table), {
      method: 'POST',
      body: JSON.stringify({ records: records.slice(i, i + 10) })
    });
  }
}

async function updateRecord(table, id, fields) {
  return airtable(encodeURIComponent(table) + '/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify({ fields })
  });
}

async function queuePlayerApproval(player) {
  try {
    await airtable(encodeURIComponent(QUEUE), {
      method: 'POST',
      body: JSON.stringify({
        records: [{
          fields: {
            Title: 'Inscription acceptée !',
            Message: 'Bonne nouvelle ' + clean(player.pseudo) + ' ! Ton inscription à MALAWY OPEN UP a été acceptée. Tu peux maintenant accéder à ton profil.',
            URL: '/#profile',
            'Target type': 'player',
            'Target ID': player.id,
            'Scheduled At': new Date().toISOString(),
            Status: 'En attente',
            'Notification Key': 'player-approved:' + player.id
          }
        }]
      })
    });
  } catch (error) {
    console.error('Notification acceptation non planifiée:', error);
  }
}

function playerIdsFromSignup(fields) {
  const ids = [];
  for (let i = 1; i <= 4; i++) {
    const uid = clean(fields['ID joueur ' + i]);
    if (uid) ids.push(uid);
  }
  for (let i = 1; i <= 2; i++) {
    const uid = clean(fields['ID remplaçant ' + i]);
    if (uid) ids.push(uid);
  }
  return ids;
}

async function tournamentRecipients(tournamentId, players) {
  const signups = await all('Inscriptions tournois');
  const uids = new Set();
  for (const signup of signups) {
    const f = signup.fields || {};
    if (clean(f['ID tournoi']) !== tournamentId || f.Statut !== 'Acceptée') continue;
    for (const uid of playerIdsFromSignup(f)) uids.add(uid);
  }
  return players.filter(p => uids.has(clean(p.fields?.['ID Free Fire'])) && clean(p.fields?.['Statut inscription']).toLowerCase().startsWith('accept'));
}

async function dispatchQueueRecord(record, env, subscriptions, players) {
  const f = record.fields || {};
  const targetType = clean(f['Target type']);
  const targetId = clean(f['Target ID']);
  let recipients = [];

  if (targetType === 'player') {
    recipients = players.filter(p => p.id === targetId);
  } else if (targetType === 'tournament') {
    recipients = await tournamentRecipients(targetId, players);
  } else if (targetType === 'all') {
    recipients = players.filter(p => ['accepte', 'accepté', 'acceptee', 'acceptée', 'accepted'].includes(clean(p.fields?.['Statut inscription']).toLowerCase()));
  } else {
    throw new Error('Cible de notification inconnue.');
  }

  const recipientIds = new Set(recipients.map(p => p.id));
  const deliveries = subscriptions.filter(s => recipientIds.has(clean(s.fields?.['Player record ID'])) && s.fields?.Active !== false);
  const byPlayer = new Map();
  for (const sub of deliveries) {
    const id = clean(sub.fields?.['Player record ID']);
    if (!byPlayer.has(id)) byPlayer.set(id, []);
    byPlayer.get(id).push(sub);
  }

  const historyRows = [];
  let sent = 0, failed = 0;
  for (const player of recipients) {
    const playerSubscriptions = byPlayer.get(player.id) || [];
    if (!playerSubscriptions.length) continue;
    let delivered = false;
    for (const sub of playerSubscriptions) {
      const subscription = {
        endpoint: sub.fields.Endpoint,
        keys: { p256dh: sub.fields.P256dh, auth: sub.fields.Auth }
      };
      try {
        const result = await sendPush(subscription, {
          title: clean(f.Title) || 'MALAWY OPEN UP',
          body: clean(f.Message),
          url: clean(f.URL) || '/',
          tag: clean(f['Notification Key']) || record.id
        }, env);
        if (result.ok) {
          delivered = true;
          sent++;
        } else if (result.status === 404 || result.status === 410) {
          await airtable(encodeURIComponent(SUBSCRIPTIONS) + '/' + encodeURIComponent(sub.id), { method: 'DELETE' });
        } else {
          failed++;
          console.warn('Push provider returned', result.status);
        }
      } catch (error) {
        failed++;
        console.error('Push delivery failed:', error.message);
      }
    }
    if (delivered) {
      historyRows.push({
        fields: {
          'Player record ID': player.id,
          Title: clean(f.Title) || 'MALAWY OPEN UP',
          Message: clean(f.Message),
          URL: clean(f.URL) || '/',
          'Created At': new Date().toISOString(),
          'Notification Key': clean(f['Notification Key']) || record.id
        }
      });
    }
  }

  if (historyRows.length) await createBatch(HISTORY, historyRows);
  await updateRecord(QUEUE, record.id, {
    Status: failed && !sent ? 'Échec' : 'Envoyée',
    'Sent At': new Date().toISOString(),
    'Recipient Count': sent,
    Error: failed ? failed + ' appareil(s) non notifié(s).' : ''
  });
  return { sent, failed };
}

async function processScheduledNotifications(env) {
  globalThis.__MOU_ENV = {
    ADMIN_CODE: env.ADMIN_CODE,
    AIRTABLE_TOKEN: env.AIRTABLE_TOKEN,
    AIRTABLE_BASE_ID: env.AIRTABLE_BASE_ID,
    VAPID_PRIVATE_KEY: env.VAPID_PRIVATE_KEY,
    VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY,
    VAPID_SUBJECT: env.VAPID_SUBJECT
  };
  const [tournaments, queue, subscriptions, players] = await Promise.all([
    all('Tournois'), all(QUEUE), all(SUBSCRIPTIONS), all('Inscriptions')
  ]);
  const now = Date.now();
  const existingKeys = new Set(queue.map(r => clean(r.fields?.['Notification Key'])));
  const reminders = [
    { key: '24h', offset: 24 * 60 * 60 * 1000, title: 'Ton tournoi approche !', message: 'Ton tournoi commence dans 24 heures. Prépare-toi !' },
    { key: '1h', offset: 60 * 60 * 1000, title: 'Plus qu’une heure !', message: 'Ton tournoi commence dans une heure. Prépare ton équipement !' },
    { key: '15m', offset: 15 * 60 * 1000, title: 'Le tournoi commence bientôt !', message: 'Plus que 15 minutes avant le début du tournoi. Rejoins l’arène !' },
    { key: 'start', offset: 0, title: 'C’est l’heure du tournoi !', message: 'Le tournoi commence maintenant. Bonne chance !' }
  ];
  const newRows = [];
  for (const tournament of tournaments) {
    const f = tournament.fields || {};
    const date = new Date(f['Date du tournoi'] || '').getTime();
    if (!Number.isFinite(date) || !clean(f['Nom du tournoi'])) continue;
    for (const reminder of reminders) {
      const due = date - reminder.offset;
      const key = 'tournament:' + tournament.id + ':' + reminder.key;
      if (now >= due && now < due + 16 * 60 * 1000 && !existingKeys.has(key)) {
        newRows.push({
          fields: {
            Title: reminder.title,
            Message: reminder.message + ' Tournoi : ' + clean(f['Nom du tournoi']) + '.',
            URL: '/#tournaments',
            'Target type': 'tournament',
            'Target ID': tournament.id,
            'Scheduled At': new Date(due).toISOString(),
            Status: 'En attente',
            'Notification Key': key
          }
        });
        existingKeys.add(key);
      }
    }
  }
  if (newRows.length) await createBatch(QUEUE, newRows);
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return;
  const currentQueue = newRows.length ? await all(QUEUE) : queue;

  const pending = currentQueue.filter(r =>
    r.id && clean(r.fields?.Status) === 'En attente' &&
    new Date(r.fields?.['Scheduled At'] || 0).getTime() <= now
  );
  for (const item of pending) {
    try {
      await dispatchQueueRecord(item, env, subscriptions, players);
    } catch (error) {
      console.error('Notification programmée en échec:', error);
      if (item.id) await updateRecord(QUEUE, item.id, { Status: 'Échec', Error: error.message });
    }
  }
}

exports.queuePlayerApproval = queuePlayerApproval;
exports.processScheduledNotifications = processScheduledNotifications;

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  try {
    if (event.httpMethod === 'GET') {
      const session = verifyPlayer(event);
      if (!session) return response(401, { error: 'Session joueur requise.' });
      const records = await all(HISTORY);
      return response(200, {
        notifications: records
          .filter(r => clean(r.fields?.['Player record ID']) === session.id)
          .sort((a, b) => new Date(b.fields?.['Created At'] || 0) - new Date(a.fields?.['Created At'] || 0))
          .slice(0, 100)
          .map(r => ({
            id: r.id,
            title: clean(r.fields?.Title),
            message: clean(r.fields?.Message),
            url: clean(r.fields?.URL) || '/',
            createdAt: r.fields?.['Created At'] || '',
            readAt: r.fields?.['Read At'] || ''
          }))
      });
    }

    if (event.httpMethod === 'PATCH') {
      const session = verifyPlayer(event);
      if (!session) return response(401, { error: 'Session joueur requise.' });
      const x = JSON.parse(event.body || '{}');
      if (!x.id) return response(400, { error: 'Notification manquante.' });
      const record = await airtable(encodeURIComponent(HISTORY) + '/' + encodeURIComponent(x.id));
      if (clean(record.fields?.['Player record ID']) !== session.id) return response(403, { error: 'Accès refusé.' });
      await updateRecord(HISTORY, x.id, { 'Read At': new Date().toISOString() });
      return response(200, { success: true });
    }

    if (event.httpMethod === 'POST') {
      const x = JSON.parse(event.body || '{}');
      if (x.action === 'subscribe' || x.action === 'unsubscribe') {
        const session = verifyPlayer(event);
        if (!session) return response(401, { error: 'Connecte-toi pour activer les notifications.' });
        const player = await airtable('Inscriptions/' + encodeURIComponent(session.id));
        const records = await all(SUBSCRIPTIONS);
        const endpoint = clean(x.subscription?.endpoint || x.endpoint);
        if (!endpoint.startsWith('https://')) return response(400, { error: 'Abonnement push invalide.' });
        const existing = records.find(r => clean(r.fields?.Endpoint) === endpoint);
        if (x.action === 'unsubscribe') {
          if (existing && clean(existing.fields?.['Player record ID']) === session.id) {
            await airtable(encodeURIComponent(SUBSCRIPTIONS) + '/' + encodeURIComponent(existing.id), { method: 'DELETE' });
          }
          return response(200, { success: true });
        }
        const keys = x.subscription?.keys || {};
        if (!keys.p256dh || !keys.auth) return response(400, { error: 'Clés push manquantes.' });
        const fields = {
          Endpoint: endpoint,
          P256dh: clean(keys.p256dh),
          Auth: clean(keys.auth),
          'Player record ID': session.id,
          Pseudo: clean(player.fields?.['Pseudo Free Fire']),
          UID: clean(player.fields?.['ID Free Fire']),
          Active: true,
          'Created At': new Date().toISOString()
        };
        if (existing) await updateRecord(SUBSCRIPTIONS, existing.id, fields);
        else await airtable(encodeURIComponent(SUBSCRIPTIONS), { method: 'POST', body: JSON.stringify({ records: [{ fields }] }) });
        return response(200, { success: true });
      }

      if (!verify(event)) return response(401, { error: 'Accès administrateur requis.' });
      if (x.action !== 'send') return response(400, { error: 'Action inconnue.' });
      const title = clean(x.title), message = clean(x.message);
      const targetType = clean(x.targetType || 'all');
      const targetId = clean(x.targetId);
      if (!title || !message) return response(400, { error: 'Le titre et le message sont obligatoires.' });
      if (!['all', 'player', 'tournament'].includes(targetType)) return response(400, { error: 'Cible invalide.' });
      if (targetType !== 'all' && !targetId) return response(400, { error: 'Choisis un joueur ou un tournoi.' });
      const scheduledAt = x.scheduledAt ? new Date(x.scheduledAt) : new Date();
      if (Number.isNaN(scheduledAt.getTime())) return response(400, { error: 'Date de programmation invalide.' });
      const created = await airtable(encodeURIComponent(QUEUE), {
        method: 'POST',
        body: JSON.stringify({ records: [{ fields: {
          Title: title,
          Message: message,
          URL: clean(x.url) || '/',
          'Target type': targetType,
          'Target ID': targetId,
          'Scheduled At': scheduledAt.toISOString(),
          Status: 'En attente',
          'Notification Key': 'manual:' + Date.now() + ':' + Math.random().toString(36).slice(2, 8)
        } }] })
      });
      if (scheduledAt.getTime() <= Date.now()) {
        try { await processScheduledNotifications(globalThis.__MOU_ENV || process.env); }
        catch (dispatchError) { console.error('Envoi immédiat différé:', dispatchError); }
      }
      return response(200, { success: true, id: created.records?.[0]?.id, message: scheduledAt.getTime() <= Date.now() ? 'Notification ajoutée à la file d’envoi.' : 'Notification programmée.' });
    }

    return response(405, { error: 'Méthode non autorisée.' });
  } catch (error) {
    console.error('Notifications API:', error);
    return response(500, { error: error.message || 'Erreur de notification.' });
  }
};
