(() => {
  'use strict';
  const dialog = document.querySelector('#leave-a-star'), api = window.CosmicAPI;
  if (!dialog || !api) return;
  const $ = selector => dialog.querySelector(selector);
  const colors = { gold: '#94702d', sage: '#55764c', lilac: '#78608f', coral: '#a35d47' };
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  let star = null, sky = { count: 0, stars: [], scope: api.connected ? 'local' : 'browser' }, origin = null, busy = false, loadPromise = null;
  // Keep the same name, color, location and visitor key on a network retry.
  const random = new Uint32Array(3); crypto.getRandomValues(random);
  const placement = { color: Object.keys(colors)[random[0] % 4], x: 12 + random[1] % 77, y: 12 + random[2] % 77 };
  function draw(target, limit) {
    if (!target) return;
    target.replaceChildren();
    const visible = [...sky.stars];
    if (star && !visible.some(item => item.id === star.id)) visible.unshift(star);
    if (!visible.length) { target.append(el('p', 'Every universe starts with a little light. Yours could be the first.', 'sky-empty')); return; }
    const list = el('ul', undefined, 'named-star-list');
    for (const item of visible.slice(0, limit)) {
      const node = el('li', undefined, `named-star${item.id === star?.id ? ' is-mine' : ''}`);
      const symbol = el('span', '✦', 'named-star-symbol'); symbol.setAttribute('aria-hidden', 'true');
      symbol.style.setProperty('--star-ink', colors[item.color] || colors.gold);
      const name = el('span', item.name, 'named-star-name'); name.title = item.name;
      node.append(symbol, name); list.append(node);
    }
    target.append(list);
    if (visible.length > limit) {
      const more = el('button', `See all ${visible.length} stars ↗`, 'sky-more'); more.type = 'button';
      more.addEventListener('click', () => open(more)); target.append(more);
    }
  }
  function render() {
    draw($('#little-sky'), 250); draw(document.querySelector('#home-star-sky'), 12);
    const scope = api.connected ? (sky.scope === 'local' ? 'Local preview constellation' : 'Visitor constellation') : api.persistent ? 'Saved on this browser only' : 'Temporary star · this tab only';
    $('#star-storage-note').textContent = scope;
    $('#little-star-privacy').textContent = api.connected ? 'Your name will appear beside your star.' : 'Your name and star stay on this browser in this preview.';
    $('#little-star-form').hidden = Boolean(star); $('#little-my-star').hidden = !star;
    if (star) $('#little-star-welcome').textContent = `You’re part of this little sky, ${star.name}.`;
    const count = document.querySelector('#constellation-count'), note = document.querySelector('#constellation-note');
    if (count) count.textContent = api.connected ? `${sky.count} star${sky.count === 1 ? '' : 's'} left by passing explorers` : star ? 'Your star is here.' : 'A little space for your name.';
    if (note) note.textContent = api.connected ? `${scope} · stars count check-ins, not page views.` : `${scope}.`;
    document.querySelectorAll('.header-star').forEach(link => { link.textContent = star ? 'Your star ✦' : 'Leave a star ✦'; });
  }
  async function refresh() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const [publicSky, mine] = await Promise.all([api.sky(), api.me()]);
      sky = publicSky; star = mine; render();
    })();
    try { await loadPromise; } finally { loadPromise = null; }
  }
  async function open(opener) {
    origin = opener || document.activeElement;
    if (!dialog.open) dialog.showModal();
    $('#little-star-feedback').textContent = 'Opening the sky…';
    const submit = $('#little-star-form button'); submit.disabled = true;
    try { await refresh(); $('#little-star-feedback').textContent = ''; }
    catch (error) { $('#little-star-feedback').textContent = error.message; $('#star-storage-note').textContent = 'The constellation is out of reach'; }
    finally { submit.disabled = false; }
  }
  function close() { if (!busy) dialog.close(); }
  $('.star-close').addEventListener('click', close); $('.star-done').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { if (origin?.isConnected) origin.focus({ preventScroll: true }); });
  document.querySelectorAll('[data-open-stars]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); open(link); }));
  $('#little-sky-refresh').addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true;
    try { await refresh(); $('#little-star-feedback').textContent = 'The sky is up to date.'; } catch (error) { $('#little-star-feedback').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('#little-star-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const name = $('#little-star-name').value.trim();
    if (!name) { $('#little-star-feedback').textContent = 'Add a name or nickname for your star.'; $('#little-star-name').focus(); return; }
    busy = true; const button = event.currentTarget.querySelector('button'); button.disabled = true; $('.star-close').disabled = true;
    $('#little-star-feedback').textContent = 'Placing your star…';
    try {
      star = await api.create({ name, ...placement }); render();
      $('#little-star-feedback').textContent = api.connected ? 'Your name is in the stars. Thanks for stopping by.' : 'Your star is saved on this browser.';
      try { sky = await api.sky(); render(); } catch (_) { $('#little-star-feedback').textContent = 'Your star was saved. Refresh to see the latest sky.'; }
      $('.star-done').focus({ preventScroll: true });
    } catch (error) { $('#little-star-feedback').textContent = error.message; }
    finally { busy = false; button.disabled = false; $('.star-close').disabled = false; }
  });
  window.CosmicStars = { open };
  if (document.querySelector('#home-star-sky')) refresh().catch(() => {
    document.querySelector('#constellation-count').textContent = 'The sky is out of reach.';
    document.querySelector('#home-star-sky').replaceChildren(el('p', 'The constellation could not load. Open “Leave a star” to try again.', 'sky-empty'));
  });
  if (location.hash === '#leave-a-star') open(document.querySelector('[data-open-stars]'));
})();
