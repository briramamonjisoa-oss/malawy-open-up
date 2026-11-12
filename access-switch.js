(() => {
  'use strict';
  const signup = document.getElementById('playerSignupForm');
  const login = document.getElementById('playerLoginForm');
  const signupButton = document.getElementById('showSignup');
  const loginButton = document.getElementById('showLogin');
  if (!signup || !login || !signupButton || !loginButton) return;
  function show(mode) {
    const creating = mode === 'signup';
    signup.hidden = !creating;
    login.hidden = creating;
    signupButton.classList.toggle('primary', creating);
    signupButton.classList.toggle('secondary', !creating);
    loginButton.classList.toggle('primary', !creating);
    loginButton.classList.toggle('secondary', creating);
  }
  signupButton.addEventListener('click', event => { event.preventDefault(); show('signup'); });
  loginButton.addEventListener('click', event => { event.preventDefault(); show('login'); });
  show('signup');
})();
