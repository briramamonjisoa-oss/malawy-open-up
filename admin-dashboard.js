(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const definitions = [
    { key: 'requests', icon: '👥', title: 'Demandes joueurs', subtitle: 'Valider ou refuser les inscriptions' },
    { key: 'points', icon: '🏆', title: 'Attribuer des points', subtitle: 'Joueurs et équipes' },
    { key: 'playerStats', icon: '📊', title: 'Statistiques des joueurs', subtitle: 'Matchs joués, victoires et défaites' },
    { key: 'matches', icon: '⚔️', title: 'Résultats des matchs', subtitle: 'Ajouter ou modifier les scores' },
    { key: 'notifications', icon: '🔔', title: 'Notifications', subtitle: 'Envoyer ou programmer un message' },
    { key: 'tournamentSignups', icon: '📥', title: 'Demandes des tournois', subtitle: 'Valider les inscriptions aux compétitions' }
  ];

  function makePanel(element, key, root) {
    if (!element || element.dataset.adminAccordion === '1') return null;
    const definition = definitions.find(item => item.key === key);
    if (!definition) return null;

    const details = document.createElement('details');
    details.className = 'admin-accordion';
    details.dataset.adminPanel = key;

    const summary = document.createElement('summary');
    summary.innerHTML = '<span class="shortcut-icon">' + definition.icon + '</span><span>' + definition.title + '</span>';

    const body = document.createElement('div');
    body.className = 'admin-accordion-body';

    element.dataset.adminAccordion = '1';
    element.parentNode.insertBefore(details, element);
    details.append(summary, body);
    body.append(element);

    if (key === 'requests') {
      const updateCount = () => {
        const heading = $('#pendingRequestsTitle', root);
        const match = (heading?.textContent || '').match(/\((\d+)\)/);
        let badge = $('.admin-shortcut-count', summary);
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'admin-shortcut-count';
          summary.append(badge);
        }
        badge.textContent = match ? match[1] : '0';
      };
      updateCount();
      const heading = $('#pendingRequestsTitle', root);
      if (heading) new MutationObserver(updateCount).observe(heading, { childList: true, subtree: true, characterData: true });
    }
    return details;
  }

  function setup(root) {
    const toolbar = $('.admin-toolbar', root);
    if (!toolbar) return;

    let grid = $('#adminShortcuts', root);
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'adminShortcuts';
      grid.className = 'admin-shortcuts';
      toolbar.after(grid);

      definitions.forEach(definition => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'admin-shortcut';
        button.dataset.openAdminPanel = definition.key;
        button.innerHTML =
          '<span class="shortcut-icon">' + definition.icon + '</span>' +
          '<span>' + definition.title + '<small>' + definition.subtitle + '</small></span>';
        button.addEventListener('click', () => {
          if (definition.key === 'tournamentSignups') {
            const tournamentTab = $('[data-tab="tournaments"]');
            if (tournamentTab) tournamentTab.click();
            window.setTimeout(() => {
              const target = document.querySelector('#adminSignups');
              (target || document.querySelector('#tournamentAdmin'))?.scrollIntoView({behavior:'smooth',block:'start'});
            }, 450);
            return;
          }
          const panel = $('[data-admin-panel="' + definition.key + '"]', root);
          if (panel) panel.open = true;
        });
        grid.append(button);
      });
    }

    [...root.querySelectorAll(':scope > .admin-block')].forEach(block => {
      const heading = $('h3', block)?.textContent?.trim() || '';
      let key = '';
      if (heading.startsWith('Demandes en attente')) key = 'requests';
      else if (heading === 'Attribuer des points') key = 'points';
      else if (heading.toLowerCase().includes('statistiques manuelles des joueurs')) key = 'playerStats';
      else if (heading.toLowerCase().includes('résultat')) key = 'matches';
      if (key) makePanel(block, key, root);
    });

    const notificationSection = $('#mouNotificationAdmin', root);
    if (notificationSection) makePanel(notificationSection, 'notifications', root);
    installModalBehavior(root);
  }


  function installModalBehavior(root) {
    root.querySelectorAll('.admin-accordion').forEach(panel => {
      if (panel.dataset.modalReady === '1') return;
      panel.dataset.modalReady = '1';
      const placeholder = document.createComment('admin-panel-position');
      panel.parentNode.insertBefore(placeholder, panel);

      panel.addEventListener('toggle', () => {
        if (panel.open) {
          document.querySelectorAll('.admin-accordion[open]').forEach(other => {
            if (other !== panel) other.open = false;
          });
          if (!panel.dataset.inModal) {
            document.body.appendChild(panel);
            panel.dataset.inModal = '1';
          }
          let backdrop = document.querySelector('.admin-modal-backdrop');
          if (!backdrop) {
            backdrop = document.createElement('button');
            backdrop.type = 'button';
            backdrop.className = 'admin-modal-backdrop';
            backdrop.setAttribute('aria-label', 'Fermer le panneau');
            document.body.appendChild(backdrop);
            backdrop.addEventListener('click', () => {
              document.querySelectorAll('.admin-accordion[open]').forEach(item => { item.open = false; });
            });
          }
          document.body.classList.add('admin-modal-active');
          panel.scrollTop = 0;
        } else {
          if (panel.dataset.inModal) {
            if (placeholder.parentNode) placeholder.parentNode.insertBefore(panel, placeholder.nextSibling);
            delete panel.dataset.inModal;
          }
          if (!document.querySelector('.admin-accordion[open]')) {
            document.querySelector('.admin-modal-backdrop')?.remove();
            document.body.classList.remove('admin-modal-active');
          }
        }
      });
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.admin-accordion[open]').forEach(panel => { panel.open = false; });
    }
  });

  function init() {
    const root = $('#adminContent');
    if (!root) return;
    const observer = new MutationObserver(() => setup(root));
    observer.observe(root, { childList: true, subtree: true });
    setup(root);
    installModalBehavior(root);
    window.addEventListener('mou:admin-auth', () => { setup(root); installModalBehavior(root); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();