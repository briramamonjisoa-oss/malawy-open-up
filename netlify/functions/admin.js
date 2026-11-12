const crypto = require('crypto');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ success:false, error:'Méthode non autorisée' }) };
  try {
    const { code } = JSON.parse(event.body || '{}');
    const secret = (globalThis.__MOU_ENV || process.env).ADMIN_CODE;
    if (!secret) return { statusCode:500, body:JSON.stringify({success:false,error:'ADMIN_CODE absent des variables et secrets du Worker Cloudflare'}) };
    if (typeof code !== 'string' || code !== secret) return { statusCode:401, body:JSON.stringify({success:false,error:'Code administrateur incorrect'}) };
    const payload = Buffer.from(JSON.stringify({ role:'admin', exp: Date.now() + 12*60*60*1000 })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify({success:true,token:`${payload}.${signature}`}) };
  } catch { return { statusCode:400, body:JSON.stringify({success:false,error:'Requête invalide'}) }; }
};
