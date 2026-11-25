(() => {
  'use strict';
  if (window.__MOU_BACK_LAYERS__) return;
  window.__MOU_BACK_LAYERS__ = true;

  const openLayers = new Map();
  const ignoredClose = new Set();
  let syncingUiClose = false;
  let sequence = 0;

  function visible(el) {
    if (!el || el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  }

  function collectLayers() {
    const layers = [];
    const add = (id, el, close) => {
      if (!el || !visible(el) || layers.some(x => x.id === id)) return;
      layers.push({ id, el, close, z: Number.parseInt(getComputedStyle(el).zIndex, 10) || 0 });
    };

    const chatShell = document.querySelector('#messages .mou-messages-shell');
    const chat = document.getElementById('mouChatActive');
    if ((document.body.classList.contains('mou-chat-fullscreen') || chatShell?.classList.contains('chat-open')) && chat && !chat.hidden) {
      add('chat', chat, () => document.getElementById('mouChatBack')?.click());
    }

    const profile = document.getElementById('mouProfileModal');
    add('profile-modal', profile, () => document.getElementById('mouProfileClose')?.click());

    const publicPlayer = document.getElementById('publicPlayerModal');
    add('public-player', publicPlayer, () => publicPlayer?.querySelector('.public-player-close')?.click());

    const sender = document.getElementById('mouSenderProfileModal');
    add('sender-profile', sender, () => sender?.querySelector('.close')?.click());

    const feed = document.getElementById('feedComposer');
    add('feed-composer', feed, () => feed?.querySelector('[data-close]')?.click());

    document.querySelectorAll('[role="dialog"][aria-modal="true"]').forEach(dialog => {
      const root = dialog.closest('#mouProfileModal,#publicPlayerModal,#mouSenderProfileModal,#feedComposer,.public-player-overlay,.mou-sender-profile-modal') || dialog;
      if (root === profile || root === publicPlayer || root === sender || root === feed) return;
      if (!root.dataset.mouBackLayerId) root.dataset.mouBackLayerId = 'dialog-' + (++sequence);
      add(root.dataset.mouBackLayerId, root, () => {
        const close = root.querySelector('[data-close],.close,[aria-label*="Fermer" i],[aria-label*="Close" i],button');
        if (close) close.click();
        else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
    });

    document.querySelectorAll('.admin-accordion[open][data-in-modal="1"],body>.admin-accordion[open]').forEach(el => {
      if (!el.dataset.mouBackLayerId) el.dataset.mouBackLayerId = 'admin-panel-' + (++sequence);
      add(el.dataset.mouBackLayerId, el, () => {
        el.open = false;
        document.body.classList.remove('admin-modal-active');
      });
    });

    return layers.sort((a, b) => a.z - b.z);
  }

  function scan() {
    const current = collectLayers();
    const currentIds = new Set(current.map(layer => layer.id));

    for (const layer of current) {
      if (!openLayers.has(layer.id)) {
        openLayers.set(layer.id, layer);
        history.pushState({ ...(history.state || {}), mouOverlay: true, mouOverlayId: layer.id }, '', location.href);
      } else {
        openLayers.set(layer.id, layer);
      }
    }

    for (const id of [...openLayers.keys()]) {
      if (currentIds.has(id)) continue;
      openLayers.delete(id);
      if (ignoredClose.delete(id)) continue;
      if (history.state?.mouOverlayId === id) {
        syncingUiClose = true;
        history.back();
      }
    }
  }

  window.addEventListener('popstate', event => {
    if (syncingUiClose) {
      syncingUiClose = false;
      event.stopImmediatePropagation();
      return;
    }
    const layers = collectLayers();
    const top = layers[layers.length - 1];
    if (!top) return;

    ignoredClose.add(top.id);
    openLayers.delete(top.id);
    try { top.close(); }
    catch (error) { console.warn('MALAWY back navigation:', error); }
    event.stopImmediatePropagation();
  }, true);

  const start = () => {
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['hidden', 'class', 'style', 'aria-hidden', 'open']
    });
    window.addEventListener('mou:page-change', scan);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();