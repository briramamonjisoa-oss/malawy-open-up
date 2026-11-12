const crypto = require('crypto');
const config = () => globalThis.__MOU_ENV || process.env;

exports.verify = (event) => {
  const secret = config().ADMIN_CODE;
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const token = header.replace(/^Bearer\s+/i,'');
  if (!secret || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a=Buffer.from(signature||''), b=Buffer.from(expected);
  if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return false;
  try { const data=JSON.parse(Buffer.from(payload,'base64url').toString()); return data.role==='admin' && data.exp > Date.now(); } catch { return false; }
};
exports.airtable = async (path, options={}) => {
  const env=config();
  const token=env.AIRTABLE_TOKEN, base=env.AIRTABLE_BASE_ID;
  if(!token||!base) throw new Error('Configuration Airtable manquante : vérifie AIRTABLE_TOKEN et AIRTABLE_BASE_ID dans les paramètres du Worker Cloudflare.');
  const r=await fetch(`https://api.airtable.com/v0/${base}/${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
  const d=await r.json(); if(!r.ok) throw new Error(d.error?.message||'Erreur Airtable'); return d;
};

exports.verifyPlayer = (event) => {
  const secret=config().ADMIN_CODE;
  const header=event.headers?.authorization||event.headers?.Authorization||'';
  const token=header.replace(/^Bearer\s+/i,'');
  if(!secret||!token.includes('.'))return null;
  const [payload,signature]=token.split('.');
  const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  const a=Buffer.from(signature||''),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  try { const data=JSON.parse(Buffer.from(payload,'base64url').toString()); return data.role==='player'&&data.pinAuth===1&&data.exp>Date.now()?data:null; } catch { return null; }
};
