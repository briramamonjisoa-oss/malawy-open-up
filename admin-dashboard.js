(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const icons = {
    requests: '👥', points: '🏆', matches: '⚔️',
    inbox: '📥', notifications: '🔔', photos: '🖼️'
  };
  const labels = {
    requests: ['Demandes joueurs', 'Valider ou refuser les inscriptions'],
    points: ['Attribuer des points', 'Joueurs et équipes'],
    matches: ['Résultats des matchs', 'Ajouter ou modifier un score'],
    inbox: ['Boîte des demandes', 'Consulter toutes les inscriptions'],
    notifications: ['Notifications', 'Envoyer ou programmer un message'],
    photos: ['Photos', 'Configuration des photos']
  };
  function wrapPanel(root, element, key) {
    if (!element || element.dataset.adminAccordion === '1') return;
    const details = document.createElement('details');
    details.className = 'admin-accordion';
    details.dataset.adminPanel = key;
    const summary = document.createElement('summary');
    summary.innerHTML = '<span class="shortcut-icon">' + icons[key] + '</span><span>' + labels[key][0] + '</span>';
    const body = document.createElement('div');
    body.className = 'admin-accordion-body';
    element.dataset.adminAccordion = '1';
    element.parentNode.insertBefore(details, element);
    details.append(summary, body);
    body.append(element);
    if (key === 'requests') {
      const count = $('#pendingRequestsTitle');
      const update = () => {
        const match = (count?.textContent || '').match(/\((\d+)\)/);
        const badge = summary.querySelector('.admin-shortcut-count') || document.createElement('span');
        badge.className = 'admin-shortcut-count';
        badge.textContent = match ? match[1] : '0';
        summary.append(badge);
      };
      update();
      if (count) new MutationObserver(update).observe(count, {childList:true,subtree:true,characterData:true});
    }
    return details;
  }
  function setup(root) {
    if (!root) return;
    const toolbar = $('.admin-toolbar', root);
    if (!toolbar) return;
    let grid = $('#adminShortcuts', root);
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'adminShortcuts';
      grid.className = 'admin-shortcuts';
    const order = ['requests','points','matches','inbox','notifications','photos'];
    const targets = {
      requests: () => $('[data-admin-panel="requests"]', root),
      points: () => $('[data-admin-panel="points"]', root),
      matches: () => $('[data-admin-panel="matches"]', root),
      inbox: () => $('[data-admin-panel="inbox"]', root),
      notifications: () => $('[data-admin-panel="notifications"]', root),
      photos: () => $('[data-admin-panel="photos"]', root)
    };
    order.forEach(key => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'admin-shortcut';
      button.innerHTML = '<span class="shortcut-icon">' + icons[key] + '</span><span>' + labels[key][0] + '<small>' + labels[key][1] + '</small></span>';
      button.addEventListener('click', () => {
        const panel = targets[key]();
        if (!panel) return;
        panel.open = true;
        panel.scrollIntoView({behavior:'smooth',block:'start'});
      });
      grid.append(button);
    });
      toolbar.after(grid);
    }
    const blocks = [...root.querySelectorAll(':scope > .admin-block')];
    blocks.forEach(block => {
      const heading = $('h3', block)?.textContent || '';
      const key = heading.includes('Demandes en attente') ? 'requests'
        : heading.includes('Attribuer des points') ? 'points'
        : heading.includes('résultat') ? 'matches'
        : heading.includes('Configuration des photos') ? 'photos' : '';
      if (key) wrapPanel(root, block, key);
    });
    const launch = $('.admin-inbox-launch', root);
    const inbox = $('#requestsInbox', root);
    if (launch && inbox && !launch.closest('[data-admin-accordion="1"]')) {
      const holder = document.createElement('div');
      holder.className = 'admin-inbox-holder';
      launch.parentNode.insertBefore(holder, launch);
      holder.append(launch, inbox);
      const details = wrapPanel(root, holder, 'inbox');
      if (details) details.open = false;
      launch.hidden = true;
    }
    const notice = $('#mouNotificationAdmin', root);
    if (notice) wrapPanel(root, notice, 'notifications');
  }
  function init() {
    const root = $('#adminContent');
    if (!root) return;
    const observer = new MutationObserver(() => setup(root));
    observer.observe(root, {childList:true,subtree:true});
    setup(root);
    document.addEventListener('mou:admin-auth', () => setup(root));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();