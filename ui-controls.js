(() => {
 'use strict';
 const $ = (s) => document.querySelector(s);
 const menu = $('#settingsMenu');
 const toggle = $('#settingsToggle');
 const close = () => { if(menu) menu.hidden = true; if(toggle) toggle.setAttribute('aria-expanded','false'); };
 const open = () => { if(menu) menu.hidden = false; if(toggle) toggle.setAttribute('aria-expanded','true'); };
 document.addEventListener('click', (event) => {
  const el = event.target instanceof Element ? event.target : event.target?.parentElement;
  if(!el) return;
  if(el.closest('#settingsToggle')) {
   event.preventDefault(); event.stopImmediatePropagation();
   if(menu?.hidden) open(); else close();
   const reset = $('#pinResetWrap'); if(reset) reset.hidden = !localStorage.getItem('mou_player_token');
   return;
  }
  if(el.closest('#themeToggle')) {
   event.preventDefault(); event.stopImmediatePropagation();
   const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
   document.body.dataset.theme = next;
   try { localStorage.setItem('mou_theme', next); } catch (_) {}
   const b = $('#themeToggle'); if(b) b.textContent = next === 'light' ? '🌙 Mode sombre' : '☀️ Mode clair';
   return;
  }
  if(el.closest('#settingsLogout') || el.closest('#logout')) {
   event.preventDefault(); event.stopImmediatePropagation();
   try { sessionStorage.removeItem('mou_admin_token'); localStorage.removeItem('mou_player_token'); localStorage.removeItem('mou_last_page'); } catch (_) {}
   close();
   location.reload();
   return;
  }
  if(menu && !el.closest('#settingsMenu')) close();
 }, true);
 const saved = (() => { try { return localStorage.getItem('mou_theme') || 'dark'; } catch (_) { return 'dark'; }})();
 document.body.dataset.theme = saved;
 if(toggle) toggle.setAttribute('aria-expanded','false');
})();