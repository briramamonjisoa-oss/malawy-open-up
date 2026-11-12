(() => {
  'use strict';
  const allowed = ['home','register','profile','players','matches','ranking','admin'];
  const saved = localStorage.getItem('mou_last_page') || 'home';
  let current = allowed.includes(saved) && (saved !== 'admin' || sessionStorage.getItem('mou_admin_token')) ? saved : 'home';
  const stack = [];
  const pages = () => Array.from(document.querySelectorAll('main .page'));
  function show(id, remember = true) {
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('page')) return;
    if (remember && current !== id) stack.push(current);
    current = id;
    try { localStorage.setItem('mou_last_page', id); } catch (_) {}
    pages().forEach(page => page.classList.toggle('active', page.id === id));
    document.querySelectorAll('[data-tab]').forEach(button =>
      button.classList.toggle('active', button.dataset.tab === id)
    );
    window.scrollTo(0, 0);
    if (id === 'profile') {
      const login = document.getElementById('playerLoginForm');
      const profile = document.getElementById('playerProfile');
      if (login && profile && !localStorage.getItem('mou_player_token')) {
        login.hidden = false;
        profile.hidden = true;
      }
    }
  }
  document.addEventListener('click', event => {
    const el = event.target instanceof Element ? event.target : event.target.parentElement;
    if (!el) return;
    const tab = el.closest('[data-tab]');
    const go = el.closest('[data-go]');
    const back = el.closest('[data-back]');
    if (tab && tab.dataset.tab === 'tournaments') return;
    if (tab || go || back) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (back) show(stack.pop() || 'home', false);
      else show(tab ? tab.dataset.tab : go.dataset.go);
    }
  }, true);
  window.addEventListener('popstate', () => show(stack.pop() || localStorage.getItem('mou_last_page') || 'home', false));
  show(current, false);
})();
