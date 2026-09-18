/* A deliberately small exploration model. No research results are simulated here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RoverMission = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const COLS = 9, ROWS = 7, ROUNDS = 12;
  const NAMES = ['Moss', 'Pip', 'Nova'];
  const COLORS = ['#557b65', '#b57746', '#8674a3'];
  const neighbors = n => [n - COLS, n + 1, n + COLS, n - 1].filter(v => v >= 0 && v < COLS * ROWS && Math.abs(v % COLS - n % COLS) + Math.abs(Math.floor(v / COLS) - Math.floor(n / COLS)) === 1);
  function rng(seed) {
    let n = seed >>> 0;
    return () => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, n | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function connected(rocks, start) {
    const seen = new Set([start]), queue = [start];
    for (const n of queue) for (const v of neighbors(n)) if (!rocks.has(v) && !seen.has(v)) { seen.add(v); queue.push(v); }
    return seen.size === COLS * ROWS - rocks.size;
  }
  function observe(state, rover) {
    [rover.pos, ...neighbors(rover.pos)].forEach(v => rover.known.add(v));
    if (state.supplies.includes(rover.pos)) state.found.add(rover.pos);
  }
  function knowledge(state) { return new Set(state.rovers.flatMap(r => [...r.known])); }
  function frame(state) {
    return { positions: state.rovers.map(r => r.pos), known: [...knowledge(state)], found: [...state.found], round: state.round };
  }
  function create(seed = 428, mode = 'shared') {
    const random = rng(seed), starts = [55, 58, 61];
    const safe = new Set(starts.flatMap(n => [n, ...neighbors(n)]));
    const rocks = new Set();
    for (let tries = 0; tries < 300 && rocks.size < 8; tries++) {
      const n = Math.floor(random() * COLS * ROWS);
      if (safe.has(n) || rocks.has(n)) continue;
      rocks.add(n);
      if (!connected(rocks, starts[0])) rocks.delete(n);
    }
    // One supply in each region; all maps are connected and reproducible.
    const supplies = [0, 1, 2].map(region => {
      const choices = [];
      for (let y = 0; y < 4; y++) for (let x = region * 3; x < region * 3 + 3; x++) if (!rocks.has(y * COLS + x)) choices.push(y * COLS + x);
      return choices[Math.floor(random() * choices.length)];
    });
    const state = { seed: seed >>> 0, mode, rocks, supplies, found: new Set(), rovers: starts.map((pos, i) => ({ name: NAMES[i], color: COLORS[i], pos, known: new Set() })), plans: [null, null, null], round: 0, moves: 0, repeats: 0, conflicts: 0, visited: new Set(starts), history: [], actions: [], finished: false };
    state.rovers.forEach(r => observe(state, r));
    state.history.push(frame(state));
    return state;
  }
  function plan(state, index, cell) {
    if (state.finished || !Number.isInteger(index) || index < 0 || index > 2) return false;
    if (cell === null || cell === state.rovers[index].pos) { state.plans[index] = null; return true; }
    if (!neighbors(state.rovers[index].pos).includes(cell) || state.rocks.has(cell)) return false;
    state.plans[index] = cell;
    return true;
  }
  function advance(state) {
    if (state.finished || state.plans.every(v => v === null)) return false;
    const before = state.rovers.map(r => r.pos);
    const intended = before.map((n, i) => state.plans[i] === null ? n : state.plans[i]);
    const next = [...intended];
    // Resolve blocked destinations, including chains behind a rover that waits.
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < 3; i++) if (next.some((n, j) => j !== i && n === next[i])) {
        const target = next[i];
        for (let j = 0; j < 3; j++) if (next[j] === target) next[j] = before[j];
      }
    }
    state.actions.push([...state.plans]);
    next.forEach((n, i) => {
      if (intended[i] !== before[i] && n === before[i]) state.conflicts++;
      if (n !== before[i]) {
        state.moves++;
        if (state.visited.has(n)) state.repeats++;
        state.visited.add(n);
      }
      state.rovers[i].pos = n;
      observe(state, state.rovers[i]);
    });
    state.plans = [null, null, null];
    state.round++;
    state.finished = state.round >= ROUNDS || state.found.size === 3;
    state.history.push(frame(state));
    return true;
  }
  function result(state) {
    const seen = [...knowledge(state)].filter(n => !state.rocks.has(n)).length;
    return { seed: state.seed, mode: state.mode, rounds: state.round, found: state.found.size, coverage: Math.round(100 * seen / (COLS * ROWS - state.rocks.size)), repeats: state.repeats, conflicts: state.conflicts, moves: state.moves, actions: state.actions.map(a => [...a]) };
  }
  return { COLS, ROWS, ROUNDS, NAMES, COLORS, neighbors, create, plan, advance, knowledge, result };
});
