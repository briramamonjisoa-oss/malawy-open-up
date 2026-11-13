const crypto = require('crypto');

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodeKey(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function hkdfExpand(prk, info, length) {
  let output = Buffer.alloc(0);
  let previous = Buffer.alloc(0);
  let counter = 1;
  while (output.length < length) {
    previous = hmac(prk, Buffer.concat([previous, Buffer.from(info), Buffer.from([counter])]));
    output = Buffer.concat([output, previous]);
    counter++;
  }
  return output.subarray(0, length);
}

function vapidAuthorization(endpoint, env) {
  const privateValue = env.VAPID_PRIVATE_KEY;
  const publicValue = env.VAPID_PUBLIC_KEY;
  const subject = env.VAPID_SUBJECT || 'mailto:admin@malawy-open-up.app';
  if (!privateValue || !publicValue) {
    throw new Error('Clés VAPID manquantes dans les secrets Cloudflare.');
  }

  const audience = new URL(endpoint).origin;
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64url(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject
  }));
  const input = header + '.' + payload;
  const publicBytes = decodeKey(publicValue);
  if (publicBytes.length !== 65 || !privateValue) throw new Error('Clé VAPID invalide.');
  const privateKey = crypto.createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: b64url(publicBytes.subarray(1, 33)),
      y: b64url(publicBytes.subarray(33, 65)),
      d: privateValue
    },
    format: 'jwk'
  });
  const signature = crypto.sign('sha256', Buffer.from(input), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
  });
  return 'vapid t=' + input + '.' + b64url(signature) + ', k=' + publicValue;
}

function encryptPayload(subscription, payload) {
  const receiverPublic = decodeKey(subscription.keys?.p256dh);
  const authSecret = decodeKey(subscription.keys?.auth);
  if (receiverPublic.length !== 65 || authSecret.length < 16) {
    throw new Error('Clés de notification invalides.');
  }

  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const serverPublic = ecdh.getPublicKey(null, 'uncompressed');
  const sharedSecret = ecdh.computeSecret(receiverPublic);

  const prkKey = hmac(authSecret, sharedSecret);
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'utf8'),
    receiverPublic,
    serverPublic
  ]);
  const inputKeyMaterial = hkdfExpand(prkKey, keyInfo, 32);

  const salt = crypto.randomBytes(16);
  const prk = hmac(salt, inputKeyMaterial);
  const cek = hkdfExpand(prk, 'Content-Encoding: aes128gcm\0', 16);
  const nonce = hkdfExpand(prk, 'Content-Encoding: nonce\0', 12);

  const plaintext = Buffer.concat([Buffer.from(JSON.stringify(payload)), Buffer.from([2])]);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  return Buffer.concat([
    salt,
    recordSize,
    Buffer.from([serverPublic.length]),
    serverPublic,
    ciphertext
  ]);
}

async function sendPush(subscription, payload, env) {
  const endpoint = subscription.endpoint;
  const body = encryptPayload(subscription, payload);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidAuthorization(endpoint, env),
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '86400',
      Urgency: 'high'
    },
    body
  });
  return { ok: response.ok, status: response.status };
}

module.exports = { sendPush };
