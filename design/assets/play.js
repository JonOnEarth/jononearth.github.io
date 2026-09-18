(() => {
  'use strict';
  if (!document.querySelector('#cosmic-app')) return;
  const engine = window.RoverMission, api = window.CosmicAPI;
  const $ = selector => document.querySelector(selector);
  const colors = { gold: '#ba8a36', sage: '#6d8d67', lilac: '#9380ac', coral: '#be806b' };
  const formatDate = value => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  function el(tag, text, cls) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; }
  function feedback(selector, text, error = false) { const node = $(selector); node.textContent = text; node.classList.toggle('is-error', error); }
  let mission = engine.create(428), selected = 0, replay = null, completed = null, runId = null, pendingRun = null;
  const comparisons = new Map();
  const board = $('#rover-board');
  const cells = Array.from({ length: engine.COLS * engine.ROWS }, (_, n) => {
    const button = el('button', undefined, 'rover-cell'); button.type = 'button'; button.dataset.cell = n;
    button.addEventListener('click', () => {
      if (mission.finished) return;
      const index = mission.rovers.findIndex(r => r.pos === n);
      if (index >= 0) selected = index;
      else if (!engine.plan(mission, selected, n)) return;
      render();
    });
    board.append(button); return button;
  });
  const roverButtons = engine.NAMES.map((name, i) => {
    const button = el('button', undefined, 'rover-choice'); button.type = 'button'; button.style.setProperty('--rover-color', engine.COLORS[i]); button.setAttribute('aria-label', `Select ${name}`);
    button.append(el('i'), el('span', name));
    button.addEventListener('click', () => { selected = i; render(); });
    $('#rover-selector').append(button); return button;
  });
  function directionName(origin, target) {
    if (target === null) return 'waits';
    const delta = target - origin;
    return delta === -engine.COLS ? 'north ↑' : delta === 1 ? 'east →' : delta === engine.COLS ? 'south ↓' : 'west ←';
  }
  function render() {
    const result = engine.result(mission);
    const view = replay === null ? null : mission.history[replay];
    const known = view ? new Set(view.known) : mission.finished || mission.mode === 'shared' ? engine.knowledge(mission) : mission.rovers[selected].known;
    const positions = view ? view.positions : mission.rovers.map(r => r.pos);
    const found = view ? new Set(view.found) : mission.found;
    const reachable = engine.neighbors(mission.rovers[selected].pos).filter(n => !mission.rocks.has(n));
    cells.forEach((button, n) => {
      const visible = known.has(n);
      const rover = positions.findIndex((pos, i) => pos === n && (mission.finished || mission.mode === 'shared' || selected === i));
      const planIndex = mission.finished ? -1 : mission.plans.findIndex((pos, i) => pos === n && (mission.mode === 'shared' || selected === i));
      button.className = 'rover-cell'; button.replaceChildren();
      if (visible) button.classList.add('is-known');
      if (visible && mission.rocks.has(n)) button.classList.add('is-rock');
      if (visible && mission.supplies.includes(n)) button.classList.add(found.has(n) ? 'is-collected' : 'is-supply');
      if (!mission.finished && reachable.includes(n)) button.classList.add('is-reachable');
      if (planIndex >= 0) {
        button.classList.add('has-plan'); button.style.setProperty('--rover-color', engine.COLORS[planIndex]); button.append(el('span', undefined, 'plan-marker'));
      }
      if (rover >= 0) {
        button.classList.remove('is-supply', 'is-collected');
        button.style.setProperty('--rover-color', engine.COLORS[rover]); button.append(el('span', undefined, 'rover-icon'));
        if (rover === selected) button.classList.add('is-selected');
      }
      const terrain = !visible ? 'unknown' : mission.rocks.has(n) ? 'crater' : mission.supplies.includes(n) ? found.has(n) ? 'recovered pod' : 'supply pod' : 'open ground';
      button.setAttribute('aria-label', `Row ${Math.floor(n / engine.COLS) + 1}, column ${n % engine.COLS + 1}: ${terrain}${rover >= 0 ? `, ${engine.NAMES[rover]}` : ''}${planIndex >= 0 ? `, ${engine.NAMES[planIndex]} plans to move here` : ''}`);
      button.tabIndex = !mission.finished && (rover === selected || reachable.includes(n)) ? 0 : -1;
    });
    roverButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
    $('#sector-name').textContent = `SECTOR ${String(mission.seed).padStart(4, '0')}`;
    $('#map-caption').textContent = view ? `Team replay · round ${view.round}` : mission.finished ? 'Team discoveries' : mission.mode === 'shared' ? 'Shared map' : `${engine.NAMES[selected]}’s map`;
    $('#round-count').textContent = engine.ROUNDS - mission.round;
    $('#supply-count').textContent = `${mission.found.size} / 3`;
    $('#coverage-count').textContent = `${result.coverage}%`;
    $('#mode-description').textContent = mission.mode === 'shared' ? 'Everyone’s discoveries and planned moves are visible together.' : 'Each rover sees its own discoveries and plan. Switch rovers to compare their views.';
    document.querySelectorAll('[name="map-mode"]').forEach(input => { input.checked = input.value === mission.mode; input.disabled = mission.round > 0; });
    $('#plan-summary').textContent = mission.mode === 'private' && !mission.finished ? `${engine.NAMES[selected]}: ${directionName(mission.rovers[selected].pos, mission.plans[selected])}\nOther plans stay private.` : mission.rovers.map((r, i) => `${r.name}: ${directionName(r.pos, mission.plans[i])}`).join('\n');
    $('#move-team').disabled = mission.finished || mission.plans.every(n => n === null);
    document.querySelectorAll('[data-direction]').forEach(button => {
      const delta = { up: -engine.COLS, right: 1, down: engine.COLS, left: -1 }[button.dataset.direction];
      button.disabled = mission.finished || (delta !== undefined && !reachable.includes(mission.rovers[selected].pos + delta));
    });
  }
  function steer(direction) {
    const delta = { up: -engine.COLS, right: 1, down: engine.COLS, left: -1 }[direction];
    if (engine.plan(mission, selected, direction === 'stay' ? null : mission.rovers[selected].pos + delta)) render();
  }
  document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => steer(button.dataset.direction)));
  board.addEventListener('keydown', event => {
    const directions = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (directions[event.key] && !mission.finished) { event.preventDefault(); steer(directions[event.key]); }
  });
  function reset(seed, mode) {
    mission = engine.create(seed, mode); selected = 0; replay = null; completed = null; pendingRun = null; runId = null;
    $('#mission-result').hidden = true; $('#save-run').disabled = false; $('#save-run').textContent = 'Save this run to my star ✦';
    $('#replay-step').value = 0; $('.replay-details').open = false;
    feedback('#save-status', ''); $('#mission-message').textContent = 'Plan a step for each rover, then move the team together.';
    render();
  }
  document.querySelectorAll('[name="map-mode"]').forEach(input => input.addEventListener('change', () => reset(mission.seed, input.value)));
  $('#restart-mission').addEventListener('click', () => reset(mission.seed, mission.mode));
  $('#new-planet').addEventListener('click', () => { const seed = new Uint32Array(1); crypto.getRandomValues(seed); reset(seed[0] % 10000, mission.mode); });
  $('#move-team').addEventListener('click', () => {
    const previousFound = mission.found.size, previousConflicts = mission.conflicts;
    if (!engine.advance(mission)) return;
    render();
    $('#mission-message').textContent = mission.found.size > previousFound ? `Supply pod recovered! ${3 - mission.found.size} left to find.` : mission.conflicts > previousConflicts ? 'Two routes met. Those rovers waited safely—try different destinations.' : `Round ${mission.round} logged. Look for the edges of what you know.`;
    if (mission.finished) {
      completed = engine.result(mission); runId = api.id();
      comparisons.set(`${mission.seed}:${mission.mode}`, completed);
      $('#result-title').textContent = completed.found === 3 ? 'Three pods. One good team.' : 'A little more of the unknown, known.';
      $('#result-copy').textContent = `${completed.found} of 3 pods recovered in ${completed.rounds} rounds. Your team mapped ${completed.coverage}% of open ground, with ${completed.repeats} moves back onto previously visited tiles.${completed.conflicts ? ` ${completed.conflicts} planned moves waited for another rover.` : ''}`;
      const other = comparisons.get(`${mission.seed}:${mission.mode === 'shared' ? 'private' : 'shared'}`);
      $('#comparison-copy').hidden = !other;
      if (other) $('#comparison-copy').textContent = `On your previous ${other.mode}-map attempt: ${other.found}/3 pods, ${other.coverage}% coverage, ${other.repeats} revisits. Same planet and round limit; your choices can change the outcome.`;
      $('#compare-mission').textContent = `Try ${mission.mode === 'shared' ? 'private maps' : 'a shared map'} on this planet ↗`;
      $('#mission-result').hidden = false; $('#replay-step').max = mission.round; $('#replay-step').value = mission.round; $('#replay-label').value = mission.round;
      $('#mission-result').focus({ preventScroll: true }); $('#mission-result').scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  });
  $('#compare-mission').addEventListener('click', () => { reset(mission.seed, mission.mode === 'shared' ? 'private' : 'shared'); $('#lost-rovers').scrollIntoView({ behavior: 'auto' }); roverButtons[0].focus({ preventScroll: true }); });
  $('#replay-step').addEventListener('input', event => { replay = Number(event.target.value); $('#replay-label').value = replay; render(); });
  render();

  let myStar = null, sky = { scope: api.connected ? 'local' : 'browser', stars: [], count: 0 }, draft = { x: 48, y: 26 }, color = 'gold';
  const starSky = $('#star-sky');
  function renderSky() {
    starSky.replaceChildren(el('span', undefined, 'sky-orbit'), el('span', undefined, 'sky-orbit second'));
    const stars = [...sky.stars];
    if (myStar && !stars.some(s => s.id === myStar.id)) stars.push(myStar);
    $('#sky-count').textContent = sky.scope === 'browser' ? (myStar ? 'Your star · on this browser' : 'A little sky, on this browser') : `${sky.count} explorer${sky.count === 1 ? '' : 's'} checked in`;
    if (!stars.length) {
      const empty = el('div', undefined, 'sky-empty'); empty.append(el('span', '✳'), el('strong', 'Every universe starts somewhere.'), el('p', 'Leave the first little light.')); starSky.append(empty);
    }
    for (const star of stars) {
      const button = el('button', '✦', 'visitor-star'); button.type = 'button';
      button.style.left = `${star.x}%`; button.style.top = `${star.y}%`; button.style.setProperty('--star-color', colors[star.color] || colors.gold);
      button.setAttribute('aria-label', `${star.name}${star.id === 'local' ? ', your local star' : `, explorer ${star.id}`}`);
      if (myStar && star.id === myStar.id) { button.classList.add('is-mine'); if (myStar.runs > 0) button.append(el('span', undefined, 'star-moon')); }
      button.addEventListener('click', event => { event.stopPropagation(); $('#sky-caption').textContent = `${star.name} · ${star.id === 'local' ? 'your local star' : `explorer #${star.id}`} · arrived ${formatDate(star.created_at)}`; });
      starSky.append(button);
    }
    if (!myStar) { const mark = el('span', '✦', 'star-draft'); mark.style.left = `${draft.x}%`; mark.style.top = `${draft.y}%`; mark.style.setProperty('--star-color', colors[color]); starSky.append(mark); }
  }
  function renderStar() {
    const browserOnly = !api.connected;
    $('#storage-note').textContent = browserOnly ? (api.persistent ? 'Local sketch · saved on this browser only' : 'Temporary sketch · saved until this tab closes') : sky.scope === 'local' ? 'Local preview · one constellation across browsers' : 'Shared constellation';
    $('#star-form').hidden = Boolean(myStar); $('#my-star').hidden = !myStar;
    if (!myStar) { renderSky(); return; }
    $('#explorer-number').textContent = browserOnly ? 'YOUR LOCAL STAR' : `EXPLORER #${myStar.id}`;
    $('#explorer-name').textContent = myStar.name === 'A passing explorer' ? 'Welcome, explorer.' : `Welcome, ${myStar.name}.`;
    $('#star-welcome').textContent = api.persistent ? 'A little light to find your way back to. This browser remembers your star.' : 'This tab remembers your star. Browser storage is unavailable, so closing the tab will lose its key.';
    $('#run-count').textContent = `${myStar.runs} saved expedition${myStar.runs === 1 ? '' : 's'}.`;
    $('#star-badges').replaceChildren();
    if (myStar.runs) $('#star-badges').append(el('span', '☾ First expedition', 'star-badge'));
    if (myStar.scout) $('#star-badges').append(el('span', '✦ Rover scout', 'star-badge'));
    const history = $('#visitor-history'); history.replaceChildren();
    for (const event of myStar.events.filter(e => e.kind === 'run').slice(0, 3)) {
      const row = el('div', undefined, 'visitor-run'); row.append(el('strong', event.data.game ? event.data.title : `Lost Rovers · ${event.data.found}/3 pods`), el('div', `${formatDate(event.created_at)} · ${event.data.game ? 'Idea explored' : `${event.data.mode} maps · ${event.data.coverage}% explored`}`)); history.append(row);
    }
    const latestMessage = myStar.events.find(e => e.kind === 'message');
    if (latestMessage) history.append(el('p', `Your latest note: ${latestMessage.data.text}`, 'visitor-message'));
    const reply = myStar.events.find(e => e.kind === 'reply'); $('#peng-reply').hidden = !reply;
    if (reply) $('#peng-reply p').textContent = reply.data.text;
    $('#message-form button').textContent = browserOnly ? 'Save a local note ↗' : 'Send a little signal ↗';
    $('#message-privacy').textContent = browserOnly ? 'This note stays on your browser. Peng will not receive it in the static preview.' : 'Only Peng and this browser can read your message and the reply.';
    renderSky();
  }
  async function refresh() {
    const [skyResult, meResult] = await Promise.allSettled([api.sky(), api.me()]);
    if (skyResult.status === 'fulfilled') sky = skyResult.value;
    if (meResult.status === 'fulfilled') myStar = meResult.value;
    renderStar();
    const failure = skyResult.status === 'rejected' ? skyResult.reason : meResult.status === 'rejected' ? meResult.reason : null;
    if (failure) { $('#storage-note').textContent = 'Constellation connection unavailable'; $('#sky-count').textContent = 'The sky is out of reach'; feedback('#star-feedback', failure.message, true); }
    else feedback('#star-feedback', '');
  }
  function setDraft(x, y) {
    draft = { x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) }; renderSky();
  }
  starSky.addEventListener('click', event => {
    if (myStar || event.target.closest('.visitor-star')) return;
    const rect = starSky.getBoundingClientRect(); setDraft(100 * (event.clientX - rect.left) / rect.width, 100 * (event.clientY - rect.top) / rect.height);
    let option = $('#star-location option[value="custom"]');
    if (!option) { option = el('option', 'Your chosen spot'); option.value = 'custom'; $('#star-location').append(option); }
    $('#star-location').value = 'custom';
  });
  $('#star-location').addEventListener('change', event => { if (event.target.value !== 'custom') setDraft(...event.target.value.split(',').map(Number)); });
  document.querySelectorAll('[name="star-color"]').forEach(input => input.addEventListener('change', () => { color = input.value; renderSky(); }));
  async function saveRun(record) {
    $('#save-run').disabled = true; feedback('#save-status', 'Saving this expedition…');
    try { myStar = await api.saveRun(record.result, record.id); pendingRun = null; renderStar(); $('#save-run').textContent = 'Saved to your star ✓'; feedback('#save-status', api.connected ? 'Your expedition is saved. Find its stamp on your star below.' : 'Saved on this browser only. Your star has a new expedition stamp.'); }
    catch (error) { $('#save-run').disabled = false; feedback('#save-status', error.message, true); }
  }
  $('#save-run').addEventListener('click', async () => {
    if (!completed) return;
    const record = { result: completed, id: runId };
    if (!myStar) { pendingRun = record; feedback('#save-status', 'Choose a star below. This expedition will be saved when you place it.'); $('#constellation').scrollIntoView({ behavior: 'auto' }); $('#star-name').focus({ preventScroll: true }); }
    else await saveRun(record);
  });
  $('#star-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true; feedback('#star-feedback', 'Finding a place for your star…');
    try {
      myStar = await api.create({ name: $('#star-name').value.trim(), color, ...draft });
      sky = await api.sky(); renderStar();
      feedback('#star-feedback', api.connected ? `Your star is here, explorer #${myStar.id}.` : 'Your star is saved on this browser.');
      if (pendingRun) await saveRun(pendingRun);
    } catch (error) { feedback('#star-feedback', error.message, true); }
    finally { button.disabled = false; }
  });
  let messageRequest = null;
  $('#message-form').addEventListener('submit', async event => {
    event.preventDefault(); const text = $('#star-message').value.trim(); if (!text) return;
    if (!messageRequest || messageRequest.text !== text) messageRequest = { text, id: api.id() };
    const button = event.currentTarget.querySelector('button'); button.disabled = true;
    try { myStar = await api.message(text, messageRequest.id); $('#star-message').value = ''; messageRequest = null; renderStar(); feedback('#star-feedback', api.connected ? 'Your signal is saved for Peng. Come back to your star to check for a reply.' : 'Saved on this browser only. This note has not been sent to Peng.'); }
    catch (error) { feedback('#star-feedback', error.message, true); }
    finally { button.disabled = false; }
  });
  $('#refresh-sky').addEventListener('click', async () => { $('#refresh-sky').disabled = true; try { await refresh(); } finally { $('#refresh-sky').disabled = false; } });
  $('#forget-star').addEventListener('click', () => {
    const message = api.connected ? 'Forget the key to this star? Its public light stays in the sky, but this browser will lose access to its private history.' : 'Remove this browser’s local star and its saved history?';
    if (!window.confirm(message)) return;
    api.forget(); myStar = null; pendingRun = null; refresh();
  });
  refresh();
})();
