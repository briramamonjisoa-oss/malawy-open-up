(() => {
  'use strict';
  const API = 'https://malawy-open-up.briramamonjisoa.workers.dev';
  // Public VAPID key: add it after generating the VAPID key pair and configuring Cloudflare.
  const VAPID_PUBLIC_KEY = 'CONFIGURER_CLE_PUBLIQUE_VAPID';
  const $ = selector => document.querySelector(selector);
  let historyItems = [];

  function playerToken() { return localStorage.getItem('mou_player_token') || ''; }
  function adminToken() { return sessionStorage.getItem('mou_admin_token') || ''; }
  function auth(token) { return token ? { Authorization: 'Bearer ' + token } : {}; }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }
  function applicationKey() {
    const value = VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(value + '='.repeat((4 - value.length % 4) % 4));
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  function styles() {
    if ($('#pushNotificationStyles')) return;
    const style = document.createElement('style');
    style.id = 'pushNotificationStyles';
    style.textContent = `
      .mou-bell{position:relative;border:1px solid #30394b;background:#18202e;color:#f5f7fc;border-radius:13px;min-width:44px;height:44px;font-size:20px}
      .mou-bell-count{position:absolute;right:-5px;top:-5px;background:#c7ff32;color:#111827;border-radius:20px;min-width:18px;height:18px;padding:0 4px;font-size:11px;font-weight:900;display:grid;place-items:center}
      .mou-notice-panel{position:fixed;z-index:10000;right:12px;top:76px;width:min(390px,calc(100vw - 24px));max-height:75vh;overflow:auto;background:#171f2d;color:#f5f7fc;border:1px solid #354057;border-radius:18px;padding:16px;box-shadow:0 18px 55px #0009}
      .mou-notice-panel[hidden]{display:none}.mou-notice-head,.mou-notice-actions{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .mou-notice-panel h3{margin:0 0 12px}.mou-notice-actions{flex-wrap:wrap;margin:12px 0}
      .mou-notice-panel button,.mou-notice-admin button{cursor:pointer}
      .mou-notice-item{padding:12px 0;border-top:1px solid #30394b}.mou-notice-item.unread{border-left:3px solid #c7ff32;padding-left:10px}
      .mou-notice-item b{display:block}.mou-notice-item p{margin:5px 0;color:#aeb8ca;font-size:14px}
      .mou-notice-item small,.mou-notice-muted{color:#8c97aa;font-size:12px}
      .mou-notice-admin{margin:20px 0;padding:16px;border:1px solid #30394b;border-radius:16px;background:#151c29}
      .mou-notice-admin form{display:grid;gap:10px}.mou-notice-admin label{display:grid;gap:5px;font-size:13px;color:#b9c2d1}
      .mou-notice-admin input,.mou-notice-admin select,.mou-notice-admin textarea{width:100%;padding:11px;border-radius:9px;border:1px solid #3a455a;background:#0e1420;color:#fff}
      .mou-notice-admin textarea{min-height:80px;resize:vertical}
      .mou-notice-admin .mou-notice-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .mou-notice-status{min-height:18px;color:#c7ff32;font-size:13px}
      @media(max-width:520px){.mou-notice-admin .mou-notice-row{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function createPendingApprovalOptIn() {
    const form = $('#playerSignupForm');
    if (!form || $('#mouPendingApprovalPush')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'mouPendingApprovalPush';
    button.className = 'secondary';
    button.textContent = '🔔 Recevoir une notification quand mon inscription est acceptée';
    const note = document.createElement('p');
    note.id = 'mouPendingApprovalStatus';
    note.className = 'mou-notice-muted';
    note.textContent = 'Facultatif : autorise les notifications sur ce téléphone pour être prévenu dès la validation.';
    form.insertBefore(button, form.querySelector('button[type="submit"]'));
    form.insertBefore(note, button.nextSibling);
    button.addEventListener('click', async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        note.textContent = 'Les notifications push ne sont pas prises en charge par ce navigateur.';
        return;
      }
      if (VAPID_PUBLIC_KEY === 'CONFIGURER_CLE_PUBLIQUE_VAPID') {
        note.textContent = 'Le service de notification est en cours de configuration. Tu pourras activer cette option ensuite.';
        return;
      }
      button.disabled = true;
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Autorisation de notification refusée.');
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey()
        });
        localStorage.setItem('mou_pending_push_subscription', JSON.stringify(subscription.toJSON()));
        note.textContent = 'Notifications autorisées. Tu recevras un message lorsque ton inscription sera acceptée.';
        button.textContent = '✓ Notification de validation activée';
      } catch (error) {
        note.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  function createPlayerUI() {
    const header = $('.header-actions');
    if (!header || $('#mouNotificationBell')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'mouNotificationBell';
    button.className = 'mou-bell';
    button.setAttribute('aria-label', 'Notifications');
    button.innerHTML = '♢<span class="mou-bell-count" hidden>0</span>';
    const settings = $('#settingsToggle');
    header.insertBefore(button, settings || null);

    const panel = document.createElement('aside');
    panel.id = 'mouNotificationPanel';
    panel.className = 'mou-notice-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="mou-notice-head"><h3>NOTIFICATIONS</h3><button type="button" id="mouCloseNotifications" class="secondary">Fermer</button></div>
      <div class="mou-notice-actions">
        <button type="button" id="mouEnablePush" class="primary">Activer les notifications</button>
        <button type="button" id="mouRefreshNotifications" class="secondary">Actualiser</button>
      </div>
      <p id="mouPushStatus" class="mou-notice-muted">Connecte-toi pour consulter tes notifications.</p>
      <div id="mouNotificationList"></div>
    `;
    document.body.append(panel);
    button.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) loadHistory();
    });
    $('#mouCloseNotifications').addEventListener('click', () => { panel.hidden = true; });
    $('#mouRefreshNotifications').addEventListener('click', loadHistory);
    $('#mouEnablePush').addEventListener('click', enablePush);
  }

  async function request(path, options = {}, token = playerToken()) {
    const response = await fetch(API + '/.netlify/functions/notifications' + path, {
      ...options,
      headers: {
        ...auth(token),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Erreur de notification (' + response.status + ').');
    return data;
  }

  function updateBadge() {
    const badge = $('#mouNotificationBell .mou-bell-count');
    if (!badge) return;
    const unread = historyItems.filter(item => !item.readAt).length;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.hidden = unread === 0;
  }

  async function loadHistory() {
    const list = $('#mouNotificationList');
    const status = $('#mouPushStatus');
    if (!list || !status) return;
    if (!playerToken()) {
      status.textContent = 'Connecte-toi à ton compte joueur pour recevoir et consulter tes notifications.';
      list.innerHTML = '';
      return;
    }
    status.textContent = 'Chargement…';
    try {
      const data = await request('');
      historyItems = data.notifications || [];
      status.textContent = ('Notification' in window && Notification.permission === 'granted')
        ? 'Notifications activées sur cet appareil.'
        : 'Active les notifications pour recevoir les rappels même lorsque l’application est fermée.';
      list.innerHTML = historyItems.map(item => `
        <article class="mou-notice-item ${item.readAt ? '' : 'unread'}">
          <b>${escapeHtml(item.title)}</b>
          <p>${escapeHtml(item.message)}</p>
          <small>${item.createdAt ? escapeHtml(new Date(item.createdAt).toLocaleString('fr-FR')) : ''}</small>
          ${item.readAt ? '' : `<div><button type="button" class="secondary" data-notice-read="${escapeHtml(item.id)}">Marquer comme lu</button></div>`}
        </article>
      `).join('') || '<p class="mou-notice-muted">Aucune notification pour le moment.</p>';
      list.querySelectorAll('[data-notice-read]').forEach(button => {
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            await request('', { method: 'PATCH', body: JSON.stringify({ id: button.dataset.noticeRead }) });
            await loadHistory();
          } catch (error) {
            status.textContent = error.message;
            button.disabled = false;
          }
        });
      });
      updateBadge();
    } catch (error) {
      status.textContent = error.message;
    }
  }

  async function enablePush() {
    const status = $('#mouPushStatus');
    const button = $('#mouEnablePush');
    if (!playerToken()) {
      status.textContent = 'Connecte-toi à ton profil avant d’activer les notifications.';
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      status.textContent = 'Ce navigateur ne prend pas en charge les notifications push. Sur iPhone, installe d’abord l’application sur l’écran d’accueil.';
      return;
    }
    if (VAPID_PUBLIC_KEY === 'CONFIGURER_CLE_PUBLIQUE_VAPID') {
      status.textContent = 'La clé publique de notification doit encore être configurée avant l’activation.';
      return;
    }
    button.disabled = true;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Autorisation de notification refusée dans le téléphone.');
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey()
        });
      }
      await request('', { method: 'POST', body: JSON.stringify({ action: 'subscribe', subscription: subscription.toJSON() }) });
      status.textContent = 'Parfait ! Cet appareil est inscrit aux notifications MALAWY OPEN UP.';
    } catch (error) {
      status.textContent = error.message || 'Impossible d’activer les notifications.';
    } finally {
      button.disabled = false;
    }
  }

  function createAdminUI() {
    const root = $('#adminContent');
    if (!root || $('#mouNotificationAdmin')) return;
    const section = document.createElement('section');
    section.id = 'mouNotificationAdmin';
    section.className = 'mou-notice-admin';
    section.innerHTML = `
      <h3>🔔 ENVOYER UNE NOTIFICATION</h3>
      <p class="mou-notice-muted">Envoi immédiat ou programmé aux joueurs ciblés. Les rappels de tournoi seront automatiques.</p>
      <form id="mouNotificationForm">
        <label>Destinataires
          <select name="targetType">
            <option value="all">Tous les joueurs acceptés</option>
            <option value="tournament">Joueurs d’un tournoi</option>
            <option value="player">Un joueur précis</option>
          </select>
        </label>
        <label id="mouTargetWrap" hidden>Choisir le destinataire
          <select name="targetId"></select>
        </label>
        <label>Titre<input name="title" maxlength="80" required placeholder="Ex. Annonce importante"></label>
        <label>Message<textarea name="message" maxlength="500" required placeholder="Ton message…"></textarea></label>
        <div class="mou-notice-row">
          <label>Programmer pour (facultatif)<input name="scheduledAt" type="datetime-local"></label>
          <label>Ouvrir cette page<input name="url" value="/#home" placeholder="/#tournaments"></label>
        </div>
        <button type="submit" class="primary">Envoyer / programmer</button>
        <p id="mouNotificationAdminStatus" class="mou-notice-status" aria-live="polite"></p>
      </form>
    `;
    root.append(section);
    const form = $('#mouNotificationForm');
    const targetType = form.elements.targetType;
    const targetWrap = $('#mouTargetWrap');
    async function loadTargets() {
      targetWrap.hidden = targetType.value === 'all';
      if (targetWrap.hidden) return;
      const select = form.elements.targetId;
      select.innerHTML = '<option value="">Chargement…</option>';
      try {
        if (targetType.value === 'player') {
          const response = await fetch(API + '/.netlify/functions/players', { headers: auth(adminToken()), cache: 'no-store' });
          const players = await response.json();
          if (!response.ok || !Array.isArray(players)) throw new Error('Impossible de charger les joueurs.');
          select.innerHTML = '<option value="">Choisir un joueur</option>' + players
            .filter(p => String(p.status || '').toLowerCase().startsWith('accept'))
            .map(p => '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.pseudo) + '</option>').join('');
        } else {
          const response = await fetch(API + '/.netlify/functions/tournaments', { cache: 'no-store' });
          const data = await response.json();
          if (!response.ok) throw new Error('Impossible de charger les tournois.');
          select.innerHTML = '<option value="">Choisir un tournoi</option>' + (data.tournaments || [])
            .map(t => '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.name) + '</option>').join('');
        }
      } catch (error) {
        select.innerHTML = '<option value="">' + escapeHtml(error.message) + '</option>';
      }
    }
    targetType.addEventListener('change', loadTargets);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const status = $('#mouNotificationAdminStatus');
      const data = new FormData(form);
      const scheduled = String(data.get('scheduledAt') || '');
      button.disabled = true;
      status.textContent = 'Enregistrement…';
      try {
        const result = await request('', {
          method: 'POST',
          body: JSON.stringify({
            action: 'send',
            targetType: data.get('targetType'),
            targetId: data.get('targetId'),
            title: data.get('title'),
            message: data.get('message'),
            url: data.get('url'),
            scheduledAt: scheduled ? new Date(scheduled).toISOString() : ''
          })
        }, adminToken());
        status.textContent = result.message || 'Notification programmée.';
        form.reset();
        targetWrap.hidden = true;
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  function init() {
    styles();
    createPlayerUI();
    createPendingApprovalOptIn();
    createAdminUI();
    if (playerToken()) loadHistory();
    if (adminToken()) createAdminUI();
    window.addEventListener('mou:player-auth', loadHistory);
    window.addEventListener('mou:admin-auth', createAdminUI);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && playerToken()) loadHistory();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
