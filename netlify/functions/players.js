const TABLE_ID = 'tblz0rJpaQBpafBN2';
const APPROVED=['accepte','acceptee','accepted','valide','validee','approved'];
const normalizeStatus=v=>String(v||'').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
const syncRank=async record=>{const f=record.fields||{},uid=String(f['ID Free Fire']||'').trim(),at=f['Profil Free Fire synchronisé le'];if(!uid)return false;if(at&&Date.now()-new Date(at).getTime()<86400000&&f['Profil Free Fire JSON'])return true;const env=globalThis.__MOU_ENV||process.env,key=env.FREE_FIRE_API_KEY;if(!key)return false;const u=new URL('https://siambhau69.eu.cc/freefireinfo/bhau');u.searchParams.set('uid',uid);u.searchParams.set('region','ME');u.searchParams.set('key',key);try{const r=await fetch(u.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(6000)}),d=await r.json().catch(()=>({}));if(!r.ok||d.error||String(d.basicInfo?.accountId||'')!==uid)return false;const syncedAt=new Date().toISOString();const saved=await fetch('https://api.airtable.com/v0/'+env.AIRTABLE_BASE_ID+'/'+TABLE_ID+'/'+encodeURIComponent(record.id),{method:'PATCH',headers:{Authorization:'Bearer '+env.AIRTABLE_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({fields:{'Profil Free Fire JSON':JSON.stringify(d),'Profil Free Fire synchronisé le':syncedAt}})});if(!saved.ok){console.warn('Airtable profile save failed:',uid,saved.status);return false;}f['Profil Free Fire JSON']=JSON.stringify(d);f['Profil Free Fire synchronisé le']=syncedAt;return true;}catch(e){console.warn('Free Fire rank sync:',uid,e.message);return false;}};

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  try {
    const env = globalThis.__MOU_ENV || process.env;
    const token = env.AIRTABLE_TOKEN;
    const baseId = env.AIRTABLE_BASE_ID;
    if (!baseId) throw new Error('AIRTABLE_BASE_ID absent du Worker Cloudflare.');
    if (!token) throw new Error('AIRTABLE_TOKEN absent du Worker Cloudflare.');

    const records = [];
    let offset = '';
    do {
      const query = new URLSearchParams({ pageSize: '100' });
      if (offset) query.set('offset', offset);
      const response = await fetch(
        'https://api.airtable.com/v0/' + baseId + '/' + TABLE_ID + '?' + query.toString(),
        { headers: { Authorization: 'Bearer ' + token } }
      );
      const data = await response.json();
      if (!response.ok) {
        const detail = data?.error?.message || data?.error?.type || ('HTTP ' + response.status);
        throw new Error('Airtable (' + response.status + ') : ' + detail);
      }
      records.push(...(data.records || []));
      offset = data.offset || '';
    } while (offset);

    // Tous les inscrits avec UID sont éligibles, pas seulement les inscriptions déjà acceptées.
    const registered=records.filter(r=>String(r.fields?.['ID Free Fire']||'').trim());
    const stale=registered.filter(r=>{const f=r.fields||{};const age=f['Profil Free Fire synchronisé le']?Date.now()-new Date(f['Profil Free Fire synchronisé le']).getTime():Infinity;return !f['Profil Free Fire JSON']||!Number.isFinite(age)||age>=86400000;});
    // Décalage temporel : un joueur dont l'API échoue ne bloque pas toujours les mêmes suivants.
    const rotation=stale.length?Math.floor(Date.now()/900000)%stale.length:0;
    const ordered=stale.slice(rotation).concat(stale.slice(0,rotation));
    // Maximum 6 tentatives par appel, deux en parallèle pour respecter les limites de l'API.
    for(let i=0;i<Math.min(ordered.length,6);i+=2){await Promise.allSettled(ordered.slice(i,i+2).map(syncRank));}

    const players = records.map(record => {
      const fields = record.fields || {};
      const rawStatus = String(fields['Statut inscription'] || 'En attente').trim();
      const normalized = rawStatus.toLocaleLowerCase('fr').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      const status = ['accepte', 'acceptee', 'accepted', 'valide', 'validee', 'approved'].includes(normalized)
        ? 'Accepté'
        : rawStatus;

      return {
        id: record.id,
        pseudo: fields['Pseudo Free Fire'] || 'Joueur',
        playerId: fields['ID Free Fire'] || '',
        mode: fields['Mode de combat'] || 'Inscrit',
        status,
        points: Number(fields.Points) || 0,
        wins: Number(fields.Victoires) || 0,
        losses: Number(fields.Défaites) || 0,
        matchesPlayed: (Number(fields.Victoires) || 0) + (Number(fields.Défaites) || 0),
        photo: fields.Photo || '',
        freeFireProfile: (()=>{try{return fields['Profil Free Fire JSON']?JSON.parse(fields['Profil Free Fire JSON']):null;}catch{return null;}})(),
        freeFireSyncedAt: fields['Profil Free Fire synchronisé le'] || null,
        participant: false
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(players)
    };
  } catch (error) {
    console.error('Erreur chargement inscriptions Airtable:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Impossible de lire les inscriptions Airtable.' })
    };
  }
};
