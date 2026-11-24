(() => {
  'use strict';
  function install() {
    if (document.getElementById('mouNavV2')) return;
    const nav = document.createElement('nav');
    nav.id = 'mouNavV2';
    nav.className = 'mou-nav-v2';
    nav.setAttribute('aria-label', 'Navigation principale');
    nav.innerHTML = `
      <div class="mou-nav-glow" aria-hidden="true"></div>
      <button type="button" class="mou-nav-item" data-tab="home" aria-label="Accueil">
        <span class="mou-nav-icon" aria-hidden="true">⌂</span><span>Accueil</span>
      </button>
      <div class="mou-nav-group">
        <button type="button" class="mou-nav-item" data-menu="arena" aria-expanded="false">
          <span class="mou-nav-icon" aria-hidden="true">⚔</span><span>Arène</span>
        </button>
        <div class="mou-nav-popover" data-popover="arena" hidden>
          <button type="button" data-tab="register">Inscriptions</button>
          <button type="button" data-tab="matches">Matchs</button>
          <button type="button" data-tab="ranking">Classement</button>
        </div>
      </div>
      <button type="button" class="mou-nav-item" data-tab="community">
        <span class="mou-nav-icon" aria-hidden="true">◎</span><span>Communauté</span>
      </button>
      <div class="mou-nav-group">
        <button type="button" class="mou-nav-item" data-menu="profile" aria-expanded="false">
          <span class="mou-nav-icon" aria-hidden="true">◉</span><span>Profil</span>
        </button>
        <div class="mou-nav-popover" data-popover="profile" hidden>
          <button type="button" data-tab="profile">Mon profil &amp; mes amis</button>
          ${sessionStorage.getItem('mou_admin_token') ? '<button type="button" data-tab="admin">Administration</button>' : ''}
        </div>
      </div>`;
    document.body.appendChild(nav);

    const closeMenus = () => {
      nav.querySelectorAll('[data-popover]').forEach(menu => menu.hidden = true);
      nav.querySelectorAll('[data-menu]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    };
    nav.addEventListener('click', event => {
      const menuButton = event.target.closest('[data-menu]');
      if (menuButton) {
        event.preventDefault();
        const name = menuButton.dataset.menu;
        const popover = nav.querySelector('[data-popover="' + name + '"]');
        const opening = popover.hidden;
        closeMenus();
        popover.hidden = !opening;
        menuButton.setAttribute('aria-expanded', String(opening));
        return;
      }
      if (event.target.closest('[data-tab]')) closeMenus();
    });
    // Fermer le menu avant que le gestionnaire de navigation change de page.
    // Le listener window en capture passe avant les handlers de navigation existants.
    window.addEventListener('click', event => {
      const target = event.target;
      if (target && typeof target.closest === 'function' && target.closest('[data-tab]')) {
        closeMenus();
      } else if (!nav.contains(target)) {
        closeMenus();
      }
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenus();
    });

    const sync = () => {
      const active = document.querySelector('main .page.active');
      const id = active && active.id;
      document.body.classList.toggle('mou-community-active', id === 'community');
      nav.querySelectorAll('.mou-nav-item[data-tab]').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === id);
      });
      nav.querySelectorAll('.mou-nav-item[data-menu]').forEach(button => {
        const group = button.dataset.menu;
        const ids = group === 'arena' ? ['register','matches','ranking'] : ['profile','admin'];
        button.classList.toggle('active', ids.includes(id));
      });
    };
    new MutationObserver(sync).observe(document.querySelector('main'), {subtree:true, attributes:true, attributeFilter:['class']});
    sync();
    window.addEventListener('mou:admin-authenticated', () => {
      const profileMenu = nav.querySelector('[data-popover="profile"]');
      if (profileMenu && !profileMenu.querySelector('[data-tab="admin"]')) {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.tab = 'admin'; button.textContent = 'Administration';
        profileMenu.appendChild(button);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();