(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
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

  document.addEventListener('click', (event) => {
    const button = event.target.closest('#showSignup, #showLogin');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showMode(button.id === 'showSignup' ? 'signup' : 'login');
  }, true);

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (form !== signup && form !== login) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const isSignup = form === signup;
    const message = $(isSignup ? '#signupMsg' : '#gateMsg');
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    if (button) button.disabled = true;
    message.textContent = isSignup ? 'Envoi de ta demande…' : 'Vérification de tes identifiants…';

    try {
      const payload = {
        pseudo: String(data.get('pseudo') || '').trim(),
        playerId: String(data.get('playerId') || '').trim(),
        pin: String(data.get('pin') || '')
      };
      let endpoint;
      if (isSignup) {
        payload.mode = String(data.get('mode') || '');
        const file = data.get('photo');
        if (file && file.size) {
          message.textContent = 'Envoi de la photo…';
          const fd = new FormData();
          fd.append('file', file);
          fd.append('upload_preset', 'malawy_photos');
          try {
            const upload = await fetch('https://api.cloudinary.com/v1_1/owc0mtlg/image/upload', { method: 'POST', body: fd });
            const photoData = await upload.json();
            if (upload.ok && photoData.secure_url) payload.photo = photoData.secure_url;
            else console.warn('Photo non envoyée:', photoData.error?.message || 'Erreur Cloudinary');
          } catch (photoError) {
            console.warn('Photo non envoyée:', photoError);
          }
        }
        endpoint = '/.netlify/functions/register';
      } else {
        endpoint = '/.netlify/functions/player-account';
      }

      message.textContent = isSignup ? 'Enregistrement de la demande…' : 'Connexion en cours…';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Une erreur est survenue. Réessaie.');

      if (isSignup) {
        message.textContent = 'Demande envoyée ! Attends la validation de l’administration. Tu pourras ensuite te connecter avec ton pseudo, UID et PIN.';
        form.reset();
      } else {
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

  showMode('signup');
})();