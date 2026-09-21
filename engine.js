export const STAGES = [
  { id: 'shapes', number: '01', title: '몸통 만들기', tag: '모양 익히기', description: '패 3장을 묶어 몸통 2개를 만들어 보세요.', bodies: 2, pair: false, suits: ['m'], scored: false, note: '만수 36장 · 점수 없는 연습' },
  { id: 'hand', number: '02', title: '한 손 완성하기', tag: '구조 익히기', description: '몸통 4개와 같은 패 2장인 머리를 만들어요.', bodies: 4, pair: true, suits: ['m'], scored: false, note: '만수 36장 · 점수 없는 연습' },
  { id: 'tanyao', number: '03', title: '첫 번째 역, 탕야오', tag: '역 만들기', description: '2~8만 사용해 몸통 4개와 머리를 만들어요.', bodies: 4, pair: true, suits: ['m', 'p', 's'], scored: true, note: '수패 108장 · 남은 패 + 발견 보너스' },
];

export const suitNames = { m: '만', p: '통', s: '삭' };
export const tileName = tile => `${tile.rank}${suitNames[tile.suit]}`;
export const tileOrder = (a, b) => 'mps'.indexOf(a.suit) - 'mps'.indexOf(b.suit) || a.rank - b.rank || a.id.localeCompare(b.id);
export const stageOf = state => STAGES.find(stage => stage.id === state.stageId);
export const occupied = state => state.groups.filter(Boolean).length + Number(Boolean(state.pair));

export function seededRandom(seed) {
  let value = seed >>> 0 || 1;
  return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}

export function createGame(stageId = 'shapes', seed = Date.now()) {
  const stage = STAGES.find(item => item.id === stageId) || STAGES[0];
  const wall = stage.suits.flatMap(suit => Array.from({ length: 9 }, (_, rank) => Array.from({ length: 4 }, (_, copy) => ({ id: `${suit}${rank + 1}-${copy}`, suit, rank: rank + 1 }))).flat());
  const random = seededRandom(seed);
  for (let index = wall.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [wall[index], wall[swap]] = [wall[swap], wall[index]];
  }
  const tray = wall.splice(-13).sort(tileOrder);
  return { version: 1, stageId: stage.id, seed: seed >>> 0, wall, tray, groups: Array(stage.bodies).fill(null), pair: null, discards: [], supplies: 0, exchanges: 0, exchangeStreak: 0, longestExchangeStreak: 0, status: 'playing', edit: null };
}

export function classify(tiles) {
  if (tiles.length < 2 || tiles.length > 3 || !tiles.every(Boolean)) return null;
  const sorted = [...tiles].sort(tileOrder);
  if (!sorted.every(tile => tile.suit === sorted[0].suit)) return null;
  if (sorted.every(tile => tile.rank === sorted[0].rank)) return tiles.length === 2 ? 'pair' : 'triplet';
  if (tiles.length === 3 && sorted[1].rank === sorted[0].rank + 1 && sorted[2].rank === sorted[0].rank + 2) return 'sequence';
  return null;
}

export function registration(state, ids) {
  if (state.status !== 'playing') return { ok: false, message: '새 판을 시작해 주세요.' };
  if (new Set(ids).size !== ids.length) return { ok: false, message: '서로 다른 패를 골라 주세요.' };
  const tiles = ids.map(id => state.tray.find(tile => tile?.id === id));
  const kind = classify(tiles);
  if (!kind) return { ok: false, message: ids.length === 1 ? '한 장은 버리고 뽑을 수 있어요.' : '연속 숫자 3장 또는 같은 패를 골라 주세요.' };
  const stage = stageOf(state);
  if (stage.scored && tiles.some(tile => tile.rank === 1 || tile.rank === 9)) return { ok: false, message: '탕야오에는 1과 9를 사용할 수 없어요.' };
  if (kind === 'pair' && (!stage.pair || state.pair || (state.edit && !state.edit.hadPair))) return { ok: false, message: !stage.pair ? '이번에는 3장짜리 몸통을 만들어요.' : '머리 자리는 이미 채웠어요.' };
  const maxBodies = state.edit ? state.edit.bodyCount : stage.bodies;
  if (kind !== 'pair' && state.groups.filter(Boolean).length >= maxBodies) return { ok: false, message: '몸통 자리는 모두 채웠어요.' };
  return { ok: true, kind, tiles: tiles.sort(tileOrder), message: { sequence: '슌쯔 · 연속된 숫자 3장', triplet: '커쯔 · 같은 패 3장', pair: '머리 · 같은 패 2장' }[kind] };
}

const failure = (state, message) => ({ state, ok: false, message });
function completeIfReady(state) {
  const stage = stageOf(state);
  if (!state.edit && state.groups.every(Boolean) && (!stage.pair || state.pair)) state.status = 'won';
  return state;
}

export function register(state, ids) {
  const match = registration(state, ids);
  if (!match.ok) return failure(state, match.message);
  const next = structuredClone(state);
  next.tray = next.tray.map(tile => ids.includes(tile?.id) ? null : tile);
  if (match.kind === 'pair') next.pair = match.tiles;
  else {
    const index = next.groups.findIndex((group, position) => !group && (!next.edit || next.edit.snapshot.groups[position]));
    next.groups[index] = match.tiles;
  }
  next.exchangeStreak = 0;
  return { state: completeIfReady(next), ok: true, message: `${match.message.split(' · ')[0]}를 등록했어요.` };
}

export function supply(state) {
  if (state.edit || state.status !== 'playing') return failure(state, '재조립을 먼저 마쳐 주세요.');
  if (!state.wall.length) return failure(state, '남은 패가 없어요. 마지막 조합을 확인해 주세요.');
  if (state.tray.every(Boolean)) return failure(state, '등록해서 빈자리를 만들면 공급할 수 있어요.');
  const next = structuredClone(state);
  let count = 0;
  next.tray = next.tray.map(tile => { if (tile || !next.wall.length) return tile; count++; return next.wall.pop(); });
  next.supplies++;
  return { state: next, ok: true, message: `${count}장을 공급했어요.${!next.wall.length ? ' 마지막 패예요.' : ''}` };
}

export function exchange(state, id) {
  if (state.edit || state.status !== 'playing') return failure(state, '재조립을 먼저 마쳐 주세요.');
  if (!state.wall.length) return failure(state, '남은 패가 없어요.');
  const index = state.tray.findIndex(tile => tile?.id === id);
  if (index < 0) return failure(state, '버릴 패 한 장을 골라 주세요.');
  const next = structuredClone(state);
  next.discards.push(next.tray[index]);
  next.tray[index] = next.wall.pop();
  next.exchanges++;
  next.exchangeStreak++;
  next.longestExchangeStreak = Math.max(next.longestExchangeStreak, next.exchangeStreak);
  return { state: next, ok: true, message: `${tileName(state.tray[index])}을 버리고 ${tileName(next.tray[index])}을 뽑았어요.` };
}

export function sortTray(state) {
  const next = structuredClone(state);
  const tiles = next.tray.filter(Boolean).sort(tileOrder);
  next.tray = [...tiles, ...Array(next.tray.length - tiles.length).fill(null)];
  return next;
}

export function beginReassembly(state) {
  if (state.edit || state.status !== 'playing' || !occupied(state)) return failure(state, '등록한 묶음이 있어야 재조립할 수 있어요.');
  const next = structuredClone(state);
  next.edit = { snapshot: structuredClone(state), bodyCount: state.groups.filter(Boolean).length, hadPair: Boolean(state.pair), trayCount: state.tray.filter(Boolean).length };
  return { state: next, ok: true, message: '바꿀 묶음을 눌러 풀어 주세요.' };
}

export function releaseGroup(state, index) {
  if (!state.edit) return failure(state, '재조립 중에만 묶음을 풀 수 있어요.');
  const next = structuredClone(state);
  const tiles = index === 'pair' ? next.pair : next.groups[index];
  if (!tiles) return failure(state, '이미 비어 있는 자리예요.');
  if (index === 'pair') next.pair = null;
  else next.groups[index] = null;
  for (const tile of tiles) { const empty = next.tray.indexOf(null); if (empty >= 0) next.tray[empty] = tile; else next.tray.push(tile); }
  return { state: next, ok: true, message: '풀어낸 패와 공급대의 패를 다시 조합해 보세요.' };
}

export function canFinishReassembly(state) {
  return Boolean(state.edit && state.groups.every((group, index) => Boolean(group) === Boolean(state.edit.snapshot.groups[index])) && Boolean(state.pair) === state.edit.hadPair && state.tray.filter(Boolean).length === state.edit.trayCount);
}

export function finishReassembly(state) {
  if (!canFinishReassembly(state)) return failure(state, '시작할 때와 같은 수의 몸통과 머리를 채워 주세요.');
  const next = structuredClone(state);
  const tiles = next.tray.filter(Boolean);
  // Reassembly neither creates tray capacity nor awards another refill.
  next.tray = [...tiles, ...Array(13 - tiles.length).fill(null)];
  next.edit = null;
  return { state: next, ok: true, message: '재조립을 마쳤어요. 공급대의 빈자리 수는 그대로예요.' };
}

export const cancelReassembly = state => state.edit ? structuredClone(state.edit.snapshot) : state;
export const endRound = state => !state.wall.length && !state.edit && state.status === 'playing' ? { ...state, status: 'lost' } : state;

export function findGroup(state) {
  const tiles = state.tray.filter(Boolean);
  for (let a = 0; a < tiles.length; a++) {
    for (let b = a + 1; b < tiles.length; b++) {
      for (let c = b + 1; c < tiles.length; c++) {
        const ids = [tiles[a].id, tiles[b].id, tiles[c].id];
        if (registration(state, ids).ok) return ids;
      }
    }
  }
  for (let a = 0; a < tiles.length; a++) for (let b = a + 1; b < tiles.length; b++) {
    const ids = [tiles[a].id, tiles[b].id];
    if (registration(state, ids).ok) return ids;
  }
  return [];
}

export function scoreGame(state) {
  if (!stageOf(state).scored || state.status !== 'won') return null;
  const groups = state.groups;
  const sequences = groups.filter(group => classify(group) === 'sequence');
  const bySequence = new Map();
  for (const group of sequences) { const key = group.map(tile => `${tile.suit}${tile.rank}`).join(); bySequence.set(key, (bySequence.get(key) || 0) + 1); }
  const identicalPairs = [...bySequence.values()].reduce((sum, count) => sum + Math.floor(count / 2), 0);
  const bonuses = [];
  if (identicalPairs >= 2) bonuses.push({ name: '량페코 모양', points: 300, description: '똑같은 슌쯔 두 묶음이 두 쌍 있어요.' });
  else if (identicalPairs === 1) bonuses.push({ name: '이페코 모양', points: 150, description: '같은 무늬, 같은 숫자의 슌쯔가 두 묶음이에요.' });
  if (groups.every(group => classify(group) === 'triplet')) bonuses.push({ name: '또이또이 모양', points: 250, description: '네 몸통을 모두 같은 패 세 장인 커쯔로 만들었어요.' });
  const all = [...groups.flat(), ...state.pair];
  if (new Set(all.map(tile => tile.suit)).size === 1) bonuses.push({ name: '청일색 모양', points: 300, description: '몸통과 머리를 모두 한 가지 무늬로 만들었어요.' });
  if (sequences.some(group => ['m', 'p', 's'].every(suit => sequences.some(other => other[0].suit === suit && other[0].rank === group[0].rank)))) bonuses.push({ name: '삼색동순 모양', points: 200, description: '만·통·삭으로 같은 숫자의 슌쯔를 만들었어요.' });
  const base = 1000;
  const remaining = state.wall.length * 10;
  return { base, remaining, bonuses, total: base + remaining + bonuses.reduce((sum, bonus) => sum + bonus.points, 0) };
}

export function validSavedGame(state) {
  try {
    const stage = stageOf(state);
    if (!stage || state.version !== 1 || !['playing', 'won', 'lost'].includes(state.status) || state.edit || state.tray.length !== 13 || state.groups.length !== stage.bodies) return false;
    if (!Array.isArray(state.wall) || !Array.isArray(state.discards)) return false;
    if (state.groups.some(group => group && !['sequence', 'triplet'].includes(classify(group)))) return false;
    if (state.pair && (!stage.pair || classify(state.pair) !== 'pair')) return false;
    if (stage.scored && [...state.groups.filter(Boolean).flat(), ...(state.pair || [])].some(tile => tile.rank < 2 || tile.rank > 8)) return false;
    const all = [...state.wall, ...state.tray.filter(Boolean), ...state.groups.filter(Boolean).flat(), ...(state.pair || []), ...state.discards];
    const expected = new Set(createGame(stage.id, 1).wall.concat(createGame(stage.id, 1).tray).map(tile => tile.id));
    if (all.length !== expected.size || new Set(all.map(tile => tile.id)).size !== expected.size) return false;
    if (!all.every(tile => expected.has(tile.id) && tile.id.startsWith(`${tile.suit}${tile.rank}-`))) return false;
    if (!['supplies', 'exchanges', 'exchangeStreak', 'longestExchangeStreak'].every(key => Number.isInteger(state[key]) && state[key] >= 0)) return false;
    const full = state.groups.every(Boolean) && (!stage.pair || Boolean(state.pair));
    return (state.status !== 'won' || full) && (state.status !== 'playing' || !full) && (state.status !== 'lost' || state.wall.length === 0);
  } catch { return false; }
}
