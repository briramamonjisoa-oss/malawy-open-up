(() => {
  'use strict';
  const API = window.location.origin;
  // Public VAPID key: add it after generating the VAPID key pair and configuring Cloudflare.
  const VAPID_PUBLIC_KEY = 'BBpVJbMZlNL6Zf9zNlaU7MuWUFqPKGJFEVmxCq9Oe86W1UpfoYo-Ql4YoyUt8P_RhLVGAiDtl1kXHisuyAGINwI';
  const $ = selector => document.querySelector(selector);
  let messageBadgeTimer = null;
  let messageUnreadCount = 0;
  let historyItems = [];
  let historyLoading = false;
  let badgeRefreshTimer = null;
  let activeActivityFilter = 'all';

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
      .mou-bell{position:relative;border:1px solid rgba(216,193,138,.35);background:#09090b;color:#d8c18a;border-radius:14px;min-width:44px;height:44px;font-size:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
      .mou-bell-count{position:absolute;right:-5px;top:-5px;background:linear-gradient(135deg,#e5d3a6,#bda66f);color:#100e09;border-radius:20px;min-width:18px;height:18px;padding:0 4px;font-size:11px;font-weight:900;display:grid;place-items:center}
      
      .mou-message-shortcut{position:relative;display:grid;place-items:center;width:44px;min-width:44px;height:44px;border:1px solid rgba(216,193,138,.35);border-radius:14px;background:#09090b;color:#d8c18a;font-size:21px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
      .mou-message-shortcut svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      .mou-message-shortcut-count{position:absolute;right:-5px;top:-5px;display:grid;min-width:18px;height:18px;place-items:center;padding:0 4px;border-radius:20px;background:#d8c18a;color:#100e09;font-size:11px;font-weight:900}
      .mou-message-shortcut-count[hidden]{display:none}
      body.mou-notice-open{overflow:hidden}
      body.mou-notice-open::before{content:'';position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.82);backdrop-filter:blur(9px)}
      .mou-notice-panel{position:fixed;z-index:9999;left:50%;top:50%;transform:translate(-50%,-50%);width:min( calc(100vw - 32px), 560px);max-height:min( calc(100dvh - 52px - env(safe-area-inset-top) - env(safe-area-inset-bottom)), 780px);overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:linear-gradient(155deg,rgba(22,21,18,.98),rgba(7,7,8,.99) 72%);color:#f3eee3;border:1px solid rgba(216,193,138,.48);border-radius:22px;padding:20px;box-shadow:0 26px 90px rgba(0,0,0,.78),inset 0 1px 0 rgba(255,255,255,.055)}
      .mou-notice-panel[hidden]{display:none}
      .mou-notice-head,.mou-notice-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .mou-notice-head{padding-bottom:14px;border-bottom:1px solid rgba(216,193,138,.2)}
      .mou-notice-panel h3{margin:0;color:#f3eee3;font-size:19px;letter-spacing:.12em;font-weight:750}
       .mou-notice-actions{flex-wrap:wrap;margin:16px 0}
      .mou-activity-filters{display:flex;gap:7px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:thin}
      .mou-activity-filters button{white-space:nowrap;padding:8px 11px;font-size:12px}
      .mou-activity-filters button[aria-pressed=true]{background:rgba(216,193,138,.18);border-color:#d8c18a;color:#f3dfb3}
      #mouMarkAllRead{font-size:12px;padding:8px 11px}
      .mou-notice-panel button,.mou-notice-admin button{cursor:pointer;font-family:inherit;transition:background .18s,border-color .18s,transform .18s}
      .mou-notice-panel button{border:1px solid rgba(216,193,138,.34);border-radius:11px;background:rgba(255,255,255,.025);color:#e9dfc9;padding:10px 14px;font-size:13px}
      .mou-notice-panel button:active{transform:scale(.98)}
      #mouEnablePush{background:linear-gradient(110deg,#bda66f,#e5d3a6);border-color:#d8c18a;color:#15120b;font-weight:800}
      #mouRefreshNotifications{background:transparent;color:#d8c18a}
      #mouCloseNotifications{background:rgba(255,255,255,.025);color:#d8c18a}
      .mou-notice-item{position:relative;padding:15px 12px;border-top:1px solid rgba(216,193,138,.16);background:transparent}
      .mou-notice-item:first-child{border-top:0}
      .mou-notice-item.unread{border-left:2px solid #d8c18a;padding-left:14px;background:linear-gradient(90deg,rgba(216,193,138,.075),transparent 75%)}
      .mou-notice-item b{display:block;color:#f3eee3;font-size:15px;line-height:1.4;font-weight:750}
      .mou-notice-item p{margin:6px 0 9px;color:#bcb3a2;font-size:13px;line-height:1.6}
      .mou-notice-item small,.mou-notice-muted{color:#918878;font-size:12px}
      .mou-notice-item button{margin-top:8px}
      .mou-notice-admin{margin:20px 0;padding:16px;border:1px solid rgba(216,193,138,.25);border-radius:16px;background:linear-gradient(145deg,#15130f,#09090a)}
      .mou-notice-admin h3{color:#d8c18a;letter-spacing:.1em}
      .mou-notice-admin form{display:grid;gap:10px}.mou-notice-admin label{display:grid;gap:5px;font-size:13px;color:#bcb3a2}
      .mou-notice-admin input,.mou-notice-admin select,.mou-notice-admin textarea{width:100%;box-sizing:border-box;padding:11px;border-radius:9px;border:1px solid rgba(216,193,138,.25);background:#080809;color:#f3eee3}
      .mou-notice-admin textarea{min-height:80px;resize:vertical}
      .mou-notice-admin .mou-notice-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .mou-notice-status{min-height:18px;color:#d8c18a;font-size:13px}
      @media(max-width:520px){.mou-notice-panel{padding:17px;border-radius:19px}.mou-notice-head{align-items:center}.mou-notice-panel h3{font-size:17px}.mou-notice-actions{gap:8px}.mou-notice-actions button{flex:1 1 42%;min-height:42px}.mou-notice-admin .mou-notice-row{grid-template-columns:1fr}}
      @media(prefers-reduced-motion:no-preference){.mou-notice-panel{animation:mouNoticeIn .2s ease-out}@keyframes mouNoticeIn{from{opacity:0;transform:translate(-50%,-48%) scale(.985)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}}
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
    const messageButton=document.createElement('button');
    messageButton.type='button';messageButton.id='mouMessageShortcut';messageButton.className='mou-message-shortcut';
    messageButton.setAttribute('aria-label','Messages');messageButton.title='Messages';
    messageButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 3 10.5l7.2 3.1L13.5 21 21 3Z"/><path d="m10.2 13.6 5-5"/></svg><span class="mou-message-shortcut-count" hidden>0</span>';
    header.insertBefore(messageButton,settings||null);
    messageButton.addEventListener('click',()=>{const tab=document.querySelector('[data-tab="messages"]');if(tab)tab.click();});
    updateMessageBadge();startMessageBadgeRefresh();

    const panel = document.createElement('aside');
    panel.id = 'mouNotificationPanel';
    panel.className = 'mou-notice-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="mou-notice-head"><h3>NOTIFICATIONS</h3><button type="button" id="mouCloseNotifications" class="secondary">Fermer</button></div>
      <div class="mou-notice-actions">
        <button type="button" id="mouEnablePush" class="primary">Activer les notifications</button>
        <button type="button" id="mouRefreshNotifications" class="secondary">Actualiser</button>
        <button type="button" id="mouMarkAllRead" class="secondary">Tout marquer comme lu</button>
      </div>
      <nav class="mou-activity-filters" aria-label="Filtrer les activités">
        <button type="button" data-activity-filter="all" aria-pressed="true">Toutes</button>
        <button type="button" data-activity-filter="unread" aria-pressed="false">Non lues</button>
        <button type="button" data-activity-filter="messages" aria-pressed="false">Messages</button>
        <button type="button" data-activity-filter="friends" aria-pressed="false">Amis</button>
        <button type="button" data-activity-filter="guilds" aria-pressed="false">Guildes</button>
      </nav>
      <p id="mouPushStatus" class="mou-notice-muted">Connecte-toi pour consulter tes notifications.</p>
      <div id="mouNotificationList"></div>
    `;
    document.body.append(panel);
    function setNotificationPanelOpen(open) {
      panel.hidden = !open;
      document.body.classList.toggle('mou-notice-open', open);
      if (open) loadHistory();
    }
    button.addEventListener('click', () => setNotificationPanelOpen(panel.hidden));
    $('#mouCloseNotifications').addEventListener('click', () => setNotificationPanelOpen(false));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) setNotificationPanelOpen(false);
    });
    $('#mouRefreshNotifications').addEventListener('click', loadHistory);
    panel.querySelectorAll('[data-activity-filter]').forEach(filterButton => {
      filterButton.addEventListener('click', () => {
        activeActivityFilter = filterButton.dataset.activityFilter;
        panel.querySelectorAll('[data-activity-filter]').forEach(button => {
          button.setAttribute('aria-pressed', String(button === filterButton));
        });
        renderHistoryList();
      });
    });
    $('#mouMarkAllRead').addEventListener('click', async () => {
      const markButton = $('#mouMarkAllRead');
      const status = $('#mouPushStatus');
      if (!historyItems.some(item => !item.readAt)) return;
      markButton.disabled = true;
      try {
        const result = await request('', { method: 'PATCH', body: JSON.stringify({ action: 'read-all' }) });
        status.textContent = result.updated
          ? result.updated + ' notification(s) marquée(s) comme lue(s).'
          : 'Aucune notification non lue.';
        await loadHistory({ silent: true, syncSubscription: false });
      } catch (error) {
        status.textContent = error.message;
      } finally {
        markButton.disabled = false;
      }
    });
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

  async function updateMessageBadge(){
    const badge=$('#mouMessageShortcut .mou-message-shortcut-count');
    if(!badge)return;
    if(!playerToken()){messageUnreadCount=0;badge.hidden=true;return;}
    try{
      const response=await fetch(API+'/.netlify/functions/messages',{headers:auth(playerToken()),cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Messages indisponibles');
      messageUnreadCount=(data.messages||[]).filter(item=>!item.mine&&!item.readAt).length;
      badge.textContent=messageUnreadCount>99?'99+':String(messageUnreadCount);
      badge.hidden=messageUnreadCount===0;
      const button=$('#mouMessageShortcut');if(button)button.setAttribute('aria-label',messageUnreadCount+' message(s) non lu(s)');
    }catch(error){console.warn('MALAWY message badge:',error.message);}
  }
  function startMessageBadgeRefresh(){
    if(messageBadgeTimer)clearInterval(messageBadgeTimer);
    messageBadgeTimer=setInterval(()=>{if(!document.hidden)updateMessageBadge();},12000);
    window.addEventListener('mou:messages-updated',updateMessageBadge);
    window.addEventListener('mou:player-auth',updateMessageBadge);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateMessageBadge();});
  }

  function updateBadge() {
    const badge = $('#mouNotificationBell .mou-bell-count');
    if (!badge) return;
    const unread = historyItems.filter(item => !item.readAt).length;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.hidden = unread === 0;
  }

  async function registerAndroidPush() {
    if (!window.MalawyAndroid || !playerToken()) return;
    if (window.__mouFcmTokenHandler) window.removeEventListener('mou:fcm-token', window.__mouFcmTokenHandler);
    window.__mouFcmTokenHandler = async event => {
      const token = String(event.detail || '').trim();
      if (!token) return;
      try {
        await request('', { method: 'POST', body: JSON.stringify({ action: 'subscribe-fcm', fcmToken: token }) });
        localStorage.setItem('mou_fcm_saved_token', token);
        const status = $('#mouPushStatus');
        if (status) status.textContent = 'Notifications Android activées sur cet appareil.';
      } catch (error) {
        const status = $('#mouPushStatus');
        if (status) status.textContent = 'Inscription des notifications Android impossible : ' + error.message;
      }
    };
    window.addEventListener('mou:fcm-token', window.__mouFcmTokenHandler, { once: true });
    try { window.MalawyAndroid.requestFcmToken(); }
    catch (error) { console.warn('FCM bridge unavailable', error); }
  }

  async function syncCurrentSubscription() {
    if (!playerToken() || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || Notification.permission !== 'granted') return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    // Re-sync on every refresh: the server upserts by endpoint, so this is safe and repairs missing Airtable rows.
    await request('', { method: 'POST', body: JSON.stringify({ action: 'subscribe', subscription: subscription.toJSON() }) });
    localStorage.setItem('mou_push_saved_endpoint', endpoint);
  }

  function notificationCategory(item) {
    const title = String(item.title || '').toLocaleLowerCase('fr');
    if (title.includes('guilde') || title.includes('clan')) return 'guilds';
    if (title.includes('ami') || title.includes('friend')) return 'friends';
    if (title.includes('message')) return 'messages';
    return 'other';
  }

  function renderHistoryList() {
    const list = $('#mouNotificationList');
    if (!list) return;
    const visibleItems = historyItems.filter(item => {
      if (activeActivityFilter === 'unread') return !item.readAt;
      if (['messages', 'friends', 'guilds'].includes(activeActivityFilter)) {
        return notificationCategory(item) === activeActivityFilter;
      }
      return true;
    });
    list.innerHTML = visibleItems.map(item => `
      <article class="mou-notice-item ${item.readAt ? '' : 'unread'}">
        <b>${escapeHtml(item.title)}</b>
        <p>${escapeHtml(item.message)}</p>
        <small>${item.createdAt ? escapeHtml(new Date(item.createdAt).toLocaleString('fr-FR')) : ''}</small>
        ${item.readAt ? '' : `<div><button type="button" class="secondary" data-notice-read="${escapeHtml(item.id)}">Marquer comme lu</button></div>`}
      </article>
    `).join('') || '<p class="mou-notice-muted">Aucune activité dans cette catégorie.</p>';
    list.querySelectorAll('[data-notice-read]').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await request('', { method: 'PATCH', body: JSON.stringify({ id: button.dataset.noticeRead }) });
          await loadHistory({ silent: true, syncSubscription: false });
        } catch (error) {
          const status = $('#mouPushStatus');
          if (status) status.textContent = error.message;
          button.disabled = false;
        }
      });
    });
    const markAll = $('#mouMarkAllRead');
    if (markAll) markAll.disabled = !historyItems.some(item => !item.readAt);
  }

  async function loadHistory(options = {}) {
    if (historyLoading) return;
    historyLoading = true;
    const list = $('#mouNotificationList');
    const status = $('#mouPushStatus');
    if (!list || !status) { historyLoading = false; return; }
    if (!playerToken()) {
      status.textContent = 'Connecte-toi à ton compte joueur pour recevoir et consulter tes notifications.';
      list.innerHTML = '';
      historyItems = [];
      renderHistoryList();
      updateBadge();
      historyLoading = false;
      return;
    }
    if (!options.silent) status.textContent = 'Chargement…';
    try {
      if (options.syncSubscription !== false) await syncCurrentSubscription();
      const data = await request('');
      historyItems = data.notifications || [];
      if (!options.silent) {
        status.textContent = window.MalawyAndroid
          ? 'Notifications Android prises en charge par Firebase.'
          : (('Notification' in window && Notification.permission === 'granted')
            ? 'Notifications activées sur cet appareil.'
            : 'Active les notifications pour recevoir les rappels même lorsque l’application est fermée.');
      }
      renderHistoryList();
      updateBadge();
    } catch (error) {
      if (!options.silent) status.textContent = error.message;
    } finally {
      historyLoading = false;
    }
  }

  function startBadgeAutoRefresh() {
    if (badgeRefreshTimer) clearInterval(badgeRefreshTimer);
    badgeRefreshTimer = setInterval(() => {
      if (!document.hidden && playerToken()) {
        loadHistory({ silent: true, syncSubscription: false });
      }
    }, 30000);
  }

  async function enablePush() {
    const status = $('#mouPushStatus');
    const button = $('#mouEnablePush');
    if (!playerToken()) {
      status.textContent = 'Connecte-toi à ton profil avant d’activer les notifications.';
      return;
    }
    if (!window.isSecureContext) {
      status.textContent = 'Les notifications exigent une connexion sécurisée HTTPS. Ouvre l’adresse officielle de MALAWY OPEN UP.';
      return;
    }
    if (window.MalawyAndroid) {
      registerAndroidPush();
      status.textContent = 'Activation des notifications Android…';
      return;
    }
    if (!('serviceWorker' in navigator)) {
      status.textContent = 'Ce navigateur ne prend pas en charge les applications installables. Ouvre MALAWY OPEN UP dans Google Chrome à jour.';
      return;
    }
    if (!('PushManager' in window) || !('Notification' in window)) {
      status.textContent = 'Ce navigateur intégré ne gère pas les notifications push. Ouvre le site directement dans Google Chrome, puis installe MALAWY OPEN UP depuis le menu ⋮ > Installer l’application.';
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
      if (!registration || !registration.pushManager) throw new Error('Service de notifications indisponible. Ferme puis rouvre l’application depuis son icône, ou utilise Chrome.');
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey()
        });
      }
      await request('', { method: 'POST', body: JSON.stringify({ action: 'subscribe', subscription: subscription.toJSON() }) });
      localStorage.setItem('mou_push_saved_endpoint', subscription.endpoint);
      status.textContent = 'Parfait ! Cet appareil est inscrit aux notifications MALAWY OPEN UP.';
    } catch (error) {
      status.textContent = error.message || 'Impossible d’activer les notifications. Vérifie les autorisations du site dans Chrome.';
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
    if (playerToken()) {
      loadHistory();
      registerAndroidPush();
    }
    window.addEventListener('mou:refresh-fcm-token', () => {
      if (playerToken()) registerAndroidPush();
    });
    if (adminToken()) createAdminUI();
    window.addEventListener('mou:player-auth', () => {
      loadHistory();
      registerAndroidPush();
    });
    window.addEventListener('mou:admin-auth', createAdminUI);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && playerToken()) loadHistory({ silent: true, syncSubscription: false });
    });
    startBadgeAutoRefresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
