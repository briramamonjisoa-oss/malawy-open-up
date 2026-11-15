const crypto = require('crypto');

let cachedAccessToken = '';
let cachedAccessTokenExpiresAt = 0;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function accessToken(serviceAccount) {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - 60000) return cachedAccessToken;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsigned = header + '.' + claims;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  const assertion = unsigned + '.' + base64url(signature);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error('Authentification Firebase impossible : ' + (data.error_description || data.error || response.status));
  }
  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

async function sendFcm(subscription, payload, env) {
  const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Secret FIREBASE_SERVICE_ACCOUNT_JSON absent dans les variables du Worker Cloudflare.');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('Le secret FIREBASE_SERVICE_ACCOUNT_JSON ne contient pas un JSON valide.');
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Le compte de service Firebase doit contenir project_id, client_email et private_key.');
  }
  const token = await accessToken(serviceAccount);
  const response = await fetch(
    'https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(serviceAccount.project_id) + '/messages:send',
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: subscription.token,
          data: {
            title: String(payload.title || 'MALAWY OPEN UP').slice(0, 100),
            body: String(payload.body || '').slice(0, 1000),
            url: String(payload.url || '/#home').slice(0, 500),
            tag: String(payload.tag || 'malawy').slice(0, 100)
          },
          android: { priority: 'HIGH' }
        }
      })
    }
  );
  const data = await response.json().catch(() => ({}));
  const details = data.error?.details || [];
  const invalid = response.status === 404 ||
    details.some(item => item.errorCode === 'UNREGISTERED' || item.errorCode === 'INVALID_ARGUMENT');
  if (!response.ok) {
    console.error('FCM delivery error:', response.status, data.error?.message || 'Unknown error');
  }
  return { ok: response.ok, status: response.status, invalid };
}

module.exports = { sendFcm };
