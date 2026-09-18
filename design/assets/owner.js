(() => {
  'use strict';
  const api = window.CosmicAPI, form = document.querySelector('#owner-login');
  if (!form) return;
  const feedback = document.querySelector('#owner-feedback');
  let key = '';
  try { key = sessionStorage.getItem('cosmic-owner-key') || ''; } catch (_) { /* Session-only access still works. */ }
  function el(tag, text, cls) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; }
  const date = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  async function load() {
    feedback.textContent = 'Opening the notebook…';
    const data = await api.owner(key);
    document.querySelector('#owner-content').hidden = false;
    form.hidden = true;
    const stats = document.querySelector('#owner-stats');
    stats.replaceChildren(el('span', `${data.count} explorer${data.count === 1 ? '' : 's'}`), el('span', 'Local preview constellation'));
    const entries = document.querySelector('#owner-entries');
    entries.replaceChildren();
    if (!data.stars.length) entries.append(el('p', 'No one has left a star yet. The first light is still ahead.'));
    for (const star of data.stars) {
      const card = el('article', undefined, 'owner-entry');
      card.append(el('h2', `#${star.id} · ${star.name}`), el('p', `Checked in ${date(star.created_at)} · ${star.runs} saved discoveries`, 'owner-meta'));
      const timeline = el('ul');
      for (const event of star.events.filter(e => e.kind === 'checkin' || e.kind === 'run')) {
        let text;
        if (event.kind === 'run') text = event.data.game ? `${event.data.title} · idea explored\n${event.data.attempts} attempt${event.data.attempts === 1 ? '' : 's'}` : `Lost Rovers · ${event.data.mode} maps · sector ${event.data.seed}\n${event.data.found}/3 pods · ${event.data.coverage}% coverage · ${event.data.rounds} rounds · ${event.data.repeats} revisits`;
        else if (event.kind === 'checkin') text = 'Left a star.';
        else text = `${event.kind === 'reply' ? 'Peng replied' : 'Message'}: ${event.data.text}`;
        const item = el('li');
        item.append(el('time', date(event.created_at)), el('div', text));
        timeline.append(item);
      }
      card.append(timeline);
      const note = el('p', '', 'form-feedback'); note.setAttribute('role', 'status');
      const visibility = el('button', star.visible ? 'Hide star from the public sky' : 'Show star in the sky', 'quiet-button'); visibility.type = 'button';
      visibility.addEventListener('click', async () => {
        visibility.disabled = true;
        try { await api.visibility(key, star.id, !star.visible); await load(); }
        catch (error) { note.textContent = error.message; visibility.disabled = false; }
      });
      card.append(visibility, note);
      entries.append(card);
    }
    feedback.textContent = 'Stars count explicit check-ins. Older saved game results remain in this private history.';
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); key = document.querySelector('#owner-key').value.trim();
    const button = form.querySelector('button'); button.disabled = true;
    try { await load(); try { sessionStorage.setItem('cosmic-owner-key', key); } catch (_) { /* Keep key in memory. */ } document.querySelector('#owner-key').value = ''; }
    catch (error) { feedback.textContent = error.message; }
    finally { button.disabled = false; }
  });
  document.querySelector('#owner-refresh').addEventListener('click', () => load().catch(error => { feedback.textContent = error.message; }));
  document.querySelector('#owner-export').addEventListener('click', async () => {
    const button = document.querySelector('#owner-export'); button.disabled = true;
    try {
      const data = await api.exportHistory(key);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = el('a'); link.href = url; link.download = `cosmic-notebook-history-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      feedback.textContent = 'Complete visitor history exported. The file includes private messages and replies.';
    } catch (error) { feedback.textContent = error.message; }
    finally { button.disabled = false; }
  });
  document.querySelector('#owner-logout').addEventListener('click', () => {
    key = ''; try { sessionStorage.removeItem('cosmic-owner-key'); } catch (_) { /* No persisted key. */ }
    document.querySelector('#owner-entries').replaceChildren(); document.querySelector('#owner-content').hidden = true; form.hidden = false; feedback.textContent = 'Notebook locked.'; document.querySelector('#owner-key').focus();
  });
  if (!api.connected) { feedback.textContent = 'Open this page through the connected preview server (port 4174) to read shared visitor history.'; form.querySelector('button').disabled = true; }
  else if (key) load().catch(error => { feedback.textContent = error.message; });
})();
