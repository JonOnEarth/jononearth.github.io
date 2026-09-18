(function () {
  'use strict';
  const base = (window.COSMIC_API || '').replace(/\/$/, '');
  const connected = Boolean(base);
  const prefix = `cosmic-notebook-v1:${base || 'browser'}:`;
  let memory = {};
  let persistent = true;
  function get(key, fallback = null) {
    if (!persistent && Object.prototype.hasOwnProperty.call(memory, key)) return memory[key];
    try { const raw = localStorage.getItem(prefix + key); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { persistent = false; return memory[key] ?? fallback; }
  }
  function put(key, value) {
    memory[key] = value;
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); }
    catch (_) { persistent = false; }
  }
  function id() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
  }
  async function request(path, body, token) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const headers = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal, cache: 'no-store', credentials: 'omit' });
      let result;
      try { result = await response.json(); }
      catch (_) { throw new Error('The constellation could not read that signal. Please refresh and try again.'); }
      if (!response.ok) throw new Error(result.error || 'The signal could not be saved.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('The constellation is out of reach. Refresh to check your star, or retry the same action.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function local() { return get('local', { star: null }); }
  function localEvent(kind, data, requestId) {
    const state = local();
    if (!state.star) throw new Error('Leave your star first.');
    if (!state.star.events.some(e => e.request_id === requestId)) {
      state.star.events.unshift({ kind, data, created_at: new Date().toISOString(), request_id: requestId });
      if (kind === 'run') { state.star.runs++; state.star.scout ||= data.found === 3; }
      state.star.events = state.star.events.slice(0, 60);
      put('local', state);
    }
    return state.star;
  }
  window.CosmicAPI = {
    connected, id,
    get persistent() { return persistent; },
    async sky() {
      if (connected) return request('/universe');
      const star = local().star;
      return { scope: 'browser', count: star ? 1 : 0, stars: star ? [{ id: star.id, name: star.name, color: star.color, x: star.x, y: star.y, created_at: star.created_at }] : [] };
    },
    async me() {
      if (!connected) return local().star;
      const token = get('token');
      return token ? request('/me', undefined, token) : null;
    },
    async create(values) {
      if (connected) {
        const token = get('token') || id();
        put('token', token); // Reusing the key makes network retries idempotent.
        return request('/stars', values, token);
      }
      const state = local();
      if (!state.star) {
        state.star = { ...values, id: 'local', name: values.name || 'A passing explorer', created_at: new Date().toISOString(), events: [], runs: 0, scout: false };
        put('local', state);
      }
      return state.star;
    },
    async saveRun(result, requestId) {
      if (connected) return request('/runs', { result, request_id: requestId }, get('token'));
      return localEvent('run', result, requestId);
    },
    async message(text, requestId) {
      if (connected) return request('/messages', { text, request_id: requestId }, get('token'));
      return localEvent('message', { text }, requestId);
    },
    forget() { put('token', null); put('local', { star: null }); },
    owner: key => request('/owner', undefined, key),
    exportHistory: key => request('/owner/export', undefined, key),
    reply: (key, starId, text) => request('/owner/reply', { id: starId, text }, key),
    visibility: (key, starId, visible) => request('/owner/visibility', { id: starId, visible }, key)
  };
})();
