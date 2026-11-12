(() => {
  'use strict';
  document.addEventListener('click', event => {
    const button = event.target.closest('#showSignup, #showLogin');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const signup = document.getElementById('playerSignupForm');
    const login = document.getElementById('playerLoginForm');
    if (!signup || !login) return;
    const creating = button.id === 'showSignup';
    signup.hidden = !creating;
    login.hidden = creating;
    document.getElementById('showSignup').classList.toggle('primary', creating);
    document.getElementById('showSignup').classList.toggle('secondary', !creating);
    document.getElementById('showLogin').classList.toggle('primary', !creating);
    document.getElementById('showLogin').classList.toggle('secondary', creating);
  }, true);
  window.addEventListener('load', () => {
    const signup = document.getElementById('playerSignupForm');
    const login = document.getElementById('playerLoginForm');
    if (signup && login) { signup.hidden = false; login.hidden = true; }
  });
})();