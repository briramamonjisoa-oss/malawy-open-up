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
let airtableQueue = Promise.resolve();
let lastAirtableRequest = 0;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
exports.airtable = async (path, options={}) => {
  const env=config();
  const token=env.AIRTABLE_TOKEN, base=env.AIRTABLE_BASE_ID;
  if(!token||!base) throw new Error('Configuration Airtable manquante : vérifie AIRTABLE_TOKEN et AIRTABLE_BASE_ID dans les paramètres du Worker Cloudflare.');
  const run = async () => {
    let attempt = 0;
    while (true) {
      const gap = 260 - (Date.now() - lastAirtableRequest);
      if (gap > 0) await wait(gap);
      lastAirtableRequest = Date.now();
      const r = await fetch(`https://api.airtable.com/v0/${base}/${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
      const raw=await r.text();let d={};try{d=JSON.parse(raw)}catch{}
      if (r.status === 429 && attempt < 4) {
        const retryAfter = Number(r.headers.get('retry-after')) || 0;
        await wait(Math.max(retryAfter * 1000, 700 * (2 ** attempt)));
        attempt++;
        continue;
      }
      if(!r.ok){const detail=d.error?.message||d.error?.type||raw.slice(0,180)||'Réponse vide';const error=new Error('Airtable HTTP '+r.status+' : '+detail);error.status=r.status;throw error;}
      return d;
    }
  };
  const task = airtableQueue.then(run, run);
  airtableQueue = task.then(()=>undefined,()=>undefined);
  return task;
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
