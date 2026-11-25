(() => {
  'use strict';
  const allowed = ['home','community','register','profile','players','messages','matches','ranking','admin'];
  const savedRaw = localStorage.getItem('mou_last_page') || 'home';
  let current = allowed.includes(savedRaw) && (savedRaw !== 'admin' || sessionStorage.getItem('mou_admin_token')) ? savedRaw : 'home';
  const stack = [];
  const pages = () => Array.from(document.querySelectorAll('main .page'));
  function show(id, remember = true) {
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('page')) return;
    if (remember && current !== id) {
      stack.push(current);
      history.pushState({ mouNavigationManaged: true, mouPage: id }, '', '#' + id);
    }
    current = id;
    try { localStorage.setItem('mou_last_page', id); } catch (_) {}
    pages().forEach(page => page.classList.toggle('active', page.id === id));
    document.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === id));
    window.dispatchEvent(new CustomEvent('mou:page-change', { detail: { page: id } }));
    window.scrollTo(0, 0);
    if (id === 'profile') {
      const login = document.getElementById('playerLoginForm');
      const profile = document.getElementById('playerProfile');
      if (login && profile && !localStorage.getItem('mou_player_token')) { login.hidden = false; profile.hidden = true; }
    }
  }
  document.addEventListener('click', event => {
    const el = event.target instanceof Element ? event.target : event.target.parentElement;
    if (!el) return;
    const tab = el.closest('[data-tab]'), go = el.closest('[data-go]'), back = el.closest('[data-back]');
    if (tab && tab.dataset.tab === 'tournaments') return;
    if (tab || go || back) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (back) {
        if (history.state && !history.state.mouBase && history.length > 1) history.back();
        else show(stack.pop() || 'home', false);
      } else show(tab ? tab.dataset.tab : go.dataset.go);
    }
  }, true);
  window.addEventListener('popstate', event => {
    if (event.state && event.state.mouBase) {
      history.pushState({ mouNavigationManaged: true, mouBackGuard: true, mouPage: current }, '', '#' + current);
      event.stopImmediatePropagation(); return;
    }
    const previous = stack.pop() || (event.state && allowed.includes(event.state.mouPage) ? event.state.mouPage : null) || 'home';
    show(previous, false);
    event.stopImmediatePropagation();
  });
  show(current, false);
})();