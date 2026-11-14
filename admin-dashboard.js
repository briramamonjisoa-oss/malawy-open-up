(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const definitions = [
    { key: 'requests', icon: '👥', title: 'Demandes joueurs', subtitle: 'Valider ou refuser les inscriptions' },
    { key: 'points', icon: '🏆', title: 'Attribuer des points', subtitle: 'Joueurs et équipes' },
    { key: 'matches', icon: '⚔️', title: 'Résultats des matchs', subtitle: 'Ajouter ou modifier les scores' },
    { key: 'inbox', icon: '📥', title: 'Boîte des demandes', subtitle: 'Consulter toutes les inscriptions' },
    { key: 'notifications', icon: '🔔', title: 'Notifications', subtitle: 'Envoyer ou programmer un message' },
    { key: 'photos', icon: '🖼️', title: 'Configuration des photos', subtitle: 'Paramètres des images' }
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
          const panel = $('[data-admin-panel="' + definition.key + '"]', root);
          if (!panel) return;
          panel.open = true;
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        grid.append(button);
      });
    }

    [...root.querySelectorAll(':scope > .admin-block')].forEach(block => {
      const heading = $('h3', block)?.textContent?.trim() || '';
      let key = '';
      if (heading.startsWith('Demandes en attente')) key = 'requests';
      else if (heading === 'Attribuer des points') key = 'points';
      else if (heading.toLowerCase().includes('résultat')) key = 'matches';
      else if (heading === 'Configuration des photos') key = 'photos';
      if (key) makePanel(block, key, root);
    });

    const launch = $('.admin-inbox-launch', root);
    const inbox = $('#requestsInbox', root);
    if (launch && inbox && !launch.dataset.adminAccordion) {
      const holder = document.createElement('div');
      holder.className = 'admin-inbox-holder';
      launch.parentNode.insertBefore(holder, launch);
      holder.append(launch, inbox);
      makePanel(holder, 'inbox', root);
    }

    const notificationSection = $('#mouNotificationAdmin', root);
    if (notificationSection) makePanel(notificationSection, 'notifications', root);
  }

  function init() {
    const root = $('#adminContent');
    if (!root) return;
    const observer = new MutationObserver(() => setup(root));
    observer.observe(root, { childList: true, subtree: true });
    setup(root);
    window.addEventListener('mou:admin-auth', () => setup(root));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();