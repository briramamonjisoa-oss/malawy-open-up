(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const API = 'https://malawy-open-up.briramamonjisoa.workers.dev';
  const signup = $('#playerSignupForm');
  const login = $('#playerLoginForm');
  if (!signup || !login) return;

  function showMode(mode) {
    const creating = mode === 'signup';
    signup.hidden = !creating;
    login.hidden = creating;
    $('#showSignup')?.classList.toggle('primary', creating);
    $('#showSignup')?.classList.toggle('secondary', !creating);
    $('#showLogin')?.classList.toggle('primary', !creating);
    $('#showLogin')?.classList.toggle('secondary', creating);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#showSignup, #showLogin');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showMode(button.id === 'showSignup' ? 'signup' : 'login');
  }, true);

  function waitForFcmToken(timeout = 15000) {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (error, token) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        window.removeEventListener('mou:fcm-token', onToken);
        error ? reject(error) : resolve(token);
      };
      const onToken = event => {
        const token = String(event.detail || '').trim();
        if (token.length >= 40) finish(null, token);
      };
      const timer = setTimeout(() => finish(new Error(
        'Aucune autorisation de notification détectée. Autorise les notifications de MALAWY OPEN UP dans les paramètres Android, puis réessaie.'
      )), timeout);
      window.addEventListener('mou:fcm-token', onToken);
      try {
        if (window.MalawyAndroid?.requestNotificationPermission) {
          window.MalawyAndroid.requestNotificationPermission();
        }
        if (!window.MalawyAndroid?.requestFcmToken) {
          finish(new Error('Ouvre MALAWY OPEN UP depuis son application Android officielle pour activer les notifications.'));
          return;
        }
        window.MalawyAndroid.requestFcmToken();
      } catch (error) {
        finish(new Error('Impossible de demander les notifications Android. Vérifie les autorisations de l’application.'));
      }
    });
  }

  function applicationKey() {
    const key = 'BBpVJbMZlNL6Zf9zNlaU7MuWUFqPKGJFEVmxCq9Oe86W1UpfoYo-Ql4YoyUt8P_RhLVGAiDtl1kXHisuyAGINwI';
    const value = key.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(value + '='.repeat((4 - value.length % 4) % 4));
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  async function prepareBrowserNotifications() {
    if (!window.isSecureContext || !('Notification' in window) ||
        !('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Les notifications ne sont pas prises en charge ici. Ouvre MALAWY OPEN UP dans Chrome ou dans son application Android.');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Autorisation refusée. Dans les paramètres du téléphone, autorise les notifications pour MALAWY OPEN UP, puis réessaie.');
    }
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationKey()
    });
    return { subscription: subscription.toJSON() };
  }

  async function prepareSignupNotifications() {
    if (window.MalawyAndroid?.requestFcmToken) {
      return { fcmToken: await waitForFcmToken() };
    }
    return prepareBrowserNotifications();
  }

  async function uploadProfilePhoto(file, message) {
    if (!file || !file.size) throw new Error('Ajoute une photo de profil pour continuer.');
    message.textContent = 'Envoi de ta photo…';
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', 'malawy_photos');
    const response = await fetch('https://api.cloudinary.com/v1_1/owc0mtlg/image/upload', {
      method: 'POST', body: fd
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.secure_url) {
      throw new Error('La photo n’a pas pu être envoyée. Vérifie ta connexion et réessaie.');
    }
    return result.secure_url;
  }

  document.addEventListener('submit', async event => {
    const form = event.target;
    if (form !== signup && form !== login) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const isSignup = form === signup;
    const message = $(isSignup ? '#signupMsg' : '#gateMsg');
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    if (button) button.disabled = true;
    try {
      if (isSignup) {
        message.textContent = 'Activation des notifications…';
        const notification = await prepareSignupNotifications();
        const photo = await uploadProfilePhoto(data.get('photo'), message);
        message.textContent = 'Vérification de ton UID Free Fire…';
        const payload = {
          playerId: String(data.get('playerId') || '').trim(),
          pin: String(data.get('pin') || ''),
          photo,
          ...notification
        };
        const response = await fetch(API + '/.netlify/functions/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store'
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Impossible de créer ton compte. Réessaie.');
        if (!result.token) throw new Error('Le serveur n’a pas renvoyé de session. Réessaie.');
        localStorage.setItem('mou_player_token', result.token);
        message.textContent = result.message || 'Profil vérifié ! Bienvenue sur MALAWY OPEN UP.';
        window.dispatchEvent(new Event('mou:player-auth'));
        window.dispatchEvent(new Event('mou:signup-success'));
        form.reset();
      } else {
        message.textContent = 'Connexion en cours…';
        const payload = {
          playerId: String(data.get('playerId') || '').trim(),
          pin: String(data.get('pin') || '')
        };
        const response = await fetch(API + '/.netlify/functions/player-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store'
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Identifiants incorrects.');
        if (!result.token) throw new Error('Le serveur n’a pas renvoyé de session. Réessaie.');
        localStorage.setItem('mou_player_token', result.token);
        message.textContent = 'Connexion réussie. Ouverture de ton profil…';
        window.dispatchEvent(new Event('mou:player-auth'));
      }
    } catch (error) {
      message.textContent = error.message || 'Erreur réseau. Vérifie ta connexion et réessaie.';
    } finally {
      if (button) button.disabled = false;
    }
  }, true);

  showMode('login');
  $('#mouAdminToggle')?.addEventListener('click', () => {
    const panel = $('#mouAdminPanel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
  });
  $('#mouTogglePin')?.addEventListener('click', () => {
    const pin = $('#mouLoginPin');
    if (pin) pin.type = pin.type === 'password' ? 'text' : 'password';
  });
})();