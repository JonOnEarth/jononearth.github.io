const assert = require('node:assert/strict');
const game = require('../assets/rover-engine.js');

function route(state, start, goal) {
  const queue = [[start]], seen = new Set([start]);
  for (const path of queue) {
    if (path.at(-1) === goal) return path.slice(1);
    for (const cell of game.neighbors(path.at(-1))) if (!state.rocks.has(cell) && !seen.has(cell)) {
      seen.add(cell); queue.push([...path, cell]);
    }
  }
  return null;
}

for (let seed = 0; seed < 200; seed++) {
  const state = game.create(seed);
  const same = game.create(seed, 'private');
  assert.deepEqual([...state.rocks], [...same.rocks]);
  assert.deepEqual(state.supplies, same.supplies, 'Sharing mode must not change the planet');
  for (const target of state.supplies) assert(route(state, state.rovers[0].pos, target), 'Every supply must be reachable');
  const initial = game.result(state);
  const rover = state.rovers[0];
  const next = game.neighbors(rover.pos).find(n => !state.rocks.has(n));
  assert(game.plan(state, 0, next));
  assert.equal(game.result(state).coverage, initial.coverage, 'Planned observations must not become known evidence');
  assert.equal(game.plan(state, 0, 100), false, 'Cannot jump outside the map');
  assert.equal(game.plan(state, 0, 0), false, 'Cannot teleport');
  for (let turn = 0; turn < 12 && !state.finished; turn++) {
    state.rovers.forEach((r, i) => {
      const options = game.neighbors(r.pos).filter(n => !state.rocks.has(n));
      game.plan(state, i, options[(seed + turn + i) % options.length]);
    });
    const coverage = game.result(state).coverage;
    assert(game.advance(state));
    assert.equal(new Set(state.rovers.map(r => r.pos)).size, 3, 'Rovers cannot occupy the same tile');
    assert(game.result(state).coverage >= coverage, 'Observed evidence is retained');
    assert(game.result(state).coverage <= 100, 'Shared observations must be deduplicated');
    state.rovers.forEach(r => assert(!state.rocks.has(r.pos)));
  }
  assert(state.finished);
  const final = game.result(state);
  assert.equal(game.advance(state), false);
  assert.deepEqual(game.result(state), final, 'Finished missions cannot change');
}

const state = game.create(428);
assert(state.rovers.some(r => r.known.size < game.knowledge(state).size), 'Private and shared views must contain different information');
const paths = state.rovers.map((r, i) => route(state, r.pos, state.supplies[i]));
for (let turn = 0; turn < 12 && !state.finished; turn++) {
  state.rovers.forEach((r, i) => game.plan(state, i, paths[i][turn] ?? null));
  game.advance(state);
}
assert.equal(state.found.size, 3, 'The initial planet must be winnable');
assert.equal(state.history.length, state.round + 1, 'Replay includes the initial state and every round');
console.log('PASS: 200 deterministic connected maps, fair sharing modes, unseen plans, movement bounds, collision safety, unique coverage, finish state, and a winning initial mission.');
