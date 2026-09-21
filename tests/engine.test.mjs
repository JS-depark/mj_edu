import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, createGame, classify, register, registration, supply, exchange, beginReassembly, releaseGroup, finishReassembly, cancelReassembly, canFinishReassembly, findGroup, endRound, scoreGame, validSavedGame, seededRandom } from '../engine.js';

function fixture(stageId, { tray = [], groups = [], pair = null, remaining = null, status = 'playing' } = {}) {
  const game = createGame(stageId, 777);
  const pool = [...game.wall, ...game.tray];
  const take = code => {
    const index = pool.findIndex(tile => `${tile.suit}${tile.rank}` === code);
    assert.ok(index >= 0, `No fifth copy of ${code}`);
    return pool.splice(index, 1)[0];
  };
  game.groups = game.groups.map((_, i) => groups[i] ? groups[i].map(take) : null);
  game.pair = pair?.map(take) || null;
  game.tray = tray.map(code => code ? take(code) : null);
  while (game.tray.length < 13) game.tray.push(null);
  game.wall = remaining === null ? pool : pool.splice(0, remaining);
  game.discards = remaining === null ? [] : pool;
  game.status = status;
  return game;
}
const ids = state => state.tray.filter(Boolean).map(tile => tile.id);
function inventory(state) {
  const stage = STAGES.find(item => item.id === state.stageId);
  const all = [...state.wall, ...state.tray.filter(Boolean), ...state.groups.filter(Boolean).flat(), ...(state.pair || []), ...state.discards];
  assert.equal(all.length, stage.suits.length * 36);
  assert.equal(new Set(all.map(tile => tile.id)).size, all.length);
  const counts = new Map();
  for (const tile of all) { const key = `${tile.suit}${tile.rank}`; counts.set(key, (counts.get(key) || 0) + 1); }
  assert.ok([...counts.values()].every(count => count === 4));
}

test('finite decks contain four copies, seeded runs replay and different seeds vary', () => {
  for (const stage of STAGES) {
    const first = createGame(stage.id, 1234);
    inventory(first);
    assert.equal(first.tray.length, 13);
    assert.deepEqual(first, createGame(stage.id, 1234));
    assert.notDeepEqual(first.tray, createGame(stage.id, 5678).tray);
    assert.ok(validSavedGame(first));
  }
});

test('mixed suits, wrapping sequences and lone tiles are not melds', () => {
  const tiles = codes => codes.map((code, i) => ({ suit: code[0], rank: Number(code[1]), id: String(i) }));
  assert.equal(classify(tiles(['m3', 'm2', 'm4'])), 'sequence');
  assert.equal(classify(tiles(['s5', 's5', 's5'])), 'triplet');
  assert.equal(classify(tiles(['p4', 'p4'])), 'pair');
  for (const codes of [['m9', 'm1', 'm2'], ['m3', 'p4', 's5'], ['m2'], ['m2', 'm3'], ['m1', 'm1', 'm1', 'm1']]) assert.equal(classify(tiles(codes)), null);
});

test('registration leaves holes and manual supply consumes only those vacancies', () => {
  const game = fixture('hand', { tray: ['m2', 'm3', 'm4', 'm1', 'm1', 'm5', 'm5', 'm6', 'm6', 'm7', 'm8', 'm9', 'm9'] });
  const original = structuredClone(game);
  const registered = register(game, ids(game).slice(0, 3)).state;
  assert.equal(registered.tray.filter(Boolean).length, 10);
  assert.equal(registered.wall.length, game.wall.length);
  assert.deepEqual(game, original);
  const supplied = supply(registered).state;
  assert.equal(supplied.wall.length, game.wall.length - 3);
  assert.equal(supplied.tray.filter(Boolean).length, 13);
  assert.deepEqual(supplied.tray.slice(3), game.tray.slice(3));
  assert.equal(supply(supplied).ok, false);
  inventory(supplied);
  assert.equal(register(game, [ids(game)[0], ids(game)[0], ids(game)[0]]).ok, false);
});

test('one-tile exchange remains available with a possible meld and preserves discard order', () => {
  let game = fixture('hand', { tray: ['m2', 'm3', 'm4', 'm7'] });
  assert.ok(findGroup(game).length);
  const firstDiscard = game.tray[0];
  game = exchange(game, firstDiscard.id).state;
  const secondDiscard = game.tray[1];
  game = exchange(game, secondDiscard.id).state;
  assert.deepEqual(game.discards, [firstDiscard, secondDiscard]);
  assert.equal(game.tray.filter(Boolean).length, 4);
  assert.equal(game.exchanges, 2);
  assert.equal(game.longestExchangeStreak, 2);
  inventory(game);
});

test('tanyao rejects terminals and tutorials do not award scores', () => {
  const invalid = fixture('tanyao', { tray: ['m1', 'm2', 'm3'] });
  assert.equal(register(invalid, ids(invalid)).ok, false);
  const valid = fixture('tanyao', { tray: ['s6', 's7', 's8'] });
  assert.equal(register(valid, ids(valid)).ok, true);
  assert.equal(scoreGame({ ...createGame('shapes', 1), status: 'won' }), null);
});

test('reassembly can exchange a tile with the tray but cannot add space or earn refills', () => {
  const game = fixture('hand', { tray: ['m5', 'm9', 'm9'], groups: [['m2', 'm3', 'm4'], ['m6', 'm7', 'm8']] });
  let edited = beginReassembly(game).state;
  edited = releaseGroup(edited, 0).state;
  assert.equal(canFinishReassembly(edited), false);
  assert.equal(finishReassembly(edited).ok, false);
  assert.equal(supply(edited).ok, false);
  assert.equal(exchange(edited, ids(edited)[0]).ok, false);
  assert.equal(register(edited, ids(edited).filter(id => id.startsWith('m9'))).ok, false);
  const replacement = edited.tray.filter(tile => tile && [3, 4, 5].includes(tile.rank)).map(tile => tile.id);
  edited = register(edited, replacement).state;
  assert.equal(canFinishReassembly(edited), true);
  const committed = finishReassembly(edited).state;
  assert.equal(committed.tray.length, 13);
  assert.equal(committed.tray.filter(Boolean).length, game.tray.filter(Boolean).length);
  assert.equal(committed.wall.length, game.wall.length);
  assert.equal(committed.supplies, game.supplies);
  assert.equal(committed.tray.filter(tile => tile?.rank === 2).length, 1);
  inventory(committed);
  assert.deepEqual(cancelReassembly(edited), game);
});

test('two released bodies and a head must each be restored, including full trays', () => {
  const game = fixture('hand', { groups: [['m2', 'm3', 'm4'], ['m5', 'm6', 'm7']], pair: ['m8', 'm8'], tray: ['m1', 'm1', 'm1', 'm1', 'm2', 'm2', 'm2', 'm3', 'm3', 'm3', 'm4', 'm4', 'm4'] });
  let edited = beginReassembly(game).state;
  for (const key of [0, 1, 'pair']) edited = releaseGroup(edited, key).state;
  assert.equal(edited.tray.filter(Boolean).length, 21);
  for (const group of game.groups.filter(Boolean)) edited = register(edited, group.map(tile => tile.id)).state;
  assert.equal(canFinishReassembly(edited), false);
  assert.equal(edited.groups.filter(Boolean).length, 2);
  edited = register(edited, game.pair.map(tile => tile.id)).state;
  assert.equal(canFinishReassembly(edited), true);
  edited = finishReassembly(edited).state;
  assert.equal(edited.tray.length, 13);
  assert.equal(edited.tray.filter(Boolean).length, 13);
  assert.equal(supply(edited).ok, false);
  inventory(edited);
});

test('last supply is partial and allows a final winning registration', () => {
  let game = fixture('shapes', { groups: [['m6', 'm7', 'm8']], tray: ['m2', 'm3'] });
  const winningTile = game.wall.find(tile => tile.rank === 4);
  game.discards.push(...game.wall.filter(tile => tile.id !== winningTile.id));
  game.wall = [winningTile];
  game = supply(game).state;
  assert.equal(game.wall.length, 0);
  assert.equal(game.tray.filter(Boolean).length, 3);
  assert.equal(game.status, 'playing');
  assert.equal(exchange(game, ids(game)[0]).ok, false);
  const won = register(game, ids(game)).state;
  assert.equal(won.status, 'won');
  assert.equal(endRound(won).status, 'won');
  assert.equal(endRound(game).status, 'lost');
  inventory(won);
});

test('reassembly refills only the originally occupied slots, even across gaps', () => {
  const game = fixture('hand', { groups: [null, ['m2', 'm3', 'm4'], null, ['m6', 'm7', 'm8']], tray: ['m5'] });
  let edited = beginReassembly(game).state;
  edited = releaseGroup(edited, 3).state;
  assert.equal(canFinishReassembly(edited), false);
  const replacement = edited.tray.filter(tile => tile && [5, 6, 7].includes(tile.rank)).map(tile => tile.id);
  edited = register(edited, replacement).state;
  assert.equal(edited.groups[0], null);
  assert.equal(edited.groups[2], null);
  assert.deepEqual(edited.groups[3].map(tile => tile.rank), [5, 6, 7]);
  assert.equal(canFinishReassembly(edited), true);
  const misplaced = structuredClone(edited);
  [misplaced.groups[0], misplaced.groups[3]] = [misplaced.groups[3], misplaced.groups[0]];
  assert.equal(canFinishReassembly(misplaced), false);
  const committed = finishReassembly(edited).state;
  assert.equal(committed.tray.filter(Boolean).length, 1);
  inventory(committed);
});

test('structural bonuses combine only compatible registered shapes', () => {
  const double = fixture('tanyao', { groups: [['m2', 'm3', 'm4'], ['m2', 'm3', 'm4'], ['m5', 'm6', 'm7'], ['m5', 'm6', 'm7']], pair: ['m8', 'm8'], status: 'won' });
  const score = scoreGame(double);
  assert.deepEqual(score.bonuses.map(bonus => bonus.name), ['량페코 모양', '청일색 모양']);
  assert.equal(score.total, 1000 + double.wall.length * 10 + 600);
  const triple = fixture('tanyao', { groups: [['m2', 'm3', 'm4'], ['p2', 'p3', 'p4'], ['s2', 's3', 's4'], ['s6', 's7', 's8']], pair: ['p5', 'p5'], status: 'won' });
  assert.deepEqual(scoreGame(triple).bonuses.map(bonus => bonus.name), ['삼색동순 모양']);
  const triplets = fixture('tanyao', { groups: [['m2', 'm2', 'm2'], ['p4', 'p4', 'p4'], ['s6', 's6', 's6'], ['m8', 'm8', 'm8']], pair: ['p5', 'p5'], status: 'won' });
  assert.deepEqual(scoreGame(triplets).bonuses.map(bonus => bonus.name), ['또이또이 모양']);
});

test('corrupt browser saves are rejected', () => {
  assert.equal(validSavedGame(null), false);
  const game = createGame('hand', 22);
  assert.equal(validSavedGame({ ...game, wall: game.wall.slice(1) }), false);
  assert.equal(validSavedGame({ ...game, status: 'won' }), false);
  assert.equal(validSavedGame({ ...game, groups: [['fake'], null, null, null] }), false);
  assert.equal(validSavedGame({ ...game, exchanges: '<script>' }), false);
});

test('180 random mechanical games conserve every tile through registration, refill and exchanges', () => {
  for (const stage of STAGES) for (let seed = 1; seed <= 60; seed++) {
    let game = createGame(stage.id, seed * 7919);
    const random = seededRandom(seed);
    for (let turn = 0; turn < 180 && game.status === 'playing'; turn++) {
      const match = findGroup(game);
      if (match.length) game = register(game, match).state;
      else if (!game.wall.length) game = endRound(game);
      else if (game.tray.includes(null)) game = supply(game).state;
      else { const tiles = game.tray.filter(Boolean); game = exchange(game, tiles[Math.floor(random() * tiles.length)].id).state; }
      inventory(game);
      assert.ok(validSavedGame(game));
    }
    assert.notEqual(game.status, 'playing');
  }
});
