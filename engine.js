export const STAGES = [
  { id: 'sequences', number: '01', title: '슌쯔 두 개 만들기', tag: '기초 · 연속 숫자', description: '같은 무늬의 연속 숫자 3장, 슌쯔를 2개 만들어요.', bodies: 2, pair: false, bodyKind: 'sequence', suits: ['m'], scored: false, note: '만수 36장 · 슌쯔만 등록' },
  { id: 'triplets', number: '02', title: '커쯔 두 개 만들기', tag: '기초 · 같은 패', description: '무늬와 숫자가 같은 패 3장, 커쯔를 2개 만들어요.', bodies: 2, pair: false, bodyKind: 'triplet', suits: ['m'], scored: false, note: '만수 36장 · 커쯔만 등록' },
  { id: 'honors', number: '03', title: '자패로 커쯔 만들기', tag: '기초 · 일곱 자패', description: '같은 자패 3장으로 커쯔 2개를 만들어요.', bodies: 2, pair: false, bodyKind: 'triplet', suits: ['z'], scored: false, note: '자패 28장 · 자패는 이어지지 않아요' },
  { id: 'pairs', number: '04', title: '머리 하나 더하기', tag: '기초 · 같은 패 두 장', description: '몸통 2개와 같은 패 2장인 머리 1개를 만들어요.', bodies: 2, pair: true, suits: ['m'], scored: false, note: '만수 36장 · 몸통 2개 + 머리' },
  { id: 'mixed', number: '05', title: '세 무늬 구분하기', tag: '기초 · 만수·삭수·통수', description: '한 묶음은 같은 무늬로! 몸통 2개와 머리를 만들어요.', bodies: 2, pair: true, suits: ['m', 'p', 's'], scored: false, note: '수패 108장 · 무늬를 섞지 않아요' },
  { id: 'hand', number: '06', title: '한 손 완성하기', tag: '기초 · 네 몸통과 머리', description: '몸통 4개와 머리 1개, 총 14장을 완성해요.', bodies: 4, pair: true, suits: ['m'], scored: false, note: '만수 36장 · 한 손의 구조' },
  ...[
    ['tanyao', '첫 번째 역, 탕야오', '2~8만 사용해 몸통 4개와 머리를 만들어요.', '2~8만 사용'],
    ['iipeikou', '같은 슌쯔, 이페코', '똑같은 슌쯔 한 쌍을 포함해 한 손을 완성해요.', '같은 슌쯔 한 쌍'],
    ['toitoi', '커쯔로 또이또이', '몸통 4개를 모두 커쯔로 만들고 머리를 더해요.', '커쯔 네 개'],
    ['chinitsu', '한 무늬로 청일색', '만·삭·통 중 한 무늬로 몸통과 머리를 완성해요.', '한 무늬로 통일'],
    ['honitsu', '자패와 혼일색', '한 가지 수패 무늬와 자패를 함께 써서 완성해요.', '한 무늬 + 자패'],
    ['ittsu', '1부터 9, 일기통관', '한 무늬의 123·456·789 슌쯔를 포함해 완성해요.', '한 무늬의 123·456·789'],
    ['sanshokuDoujun', '세 무늬, 삼색동순', '같은 숫자의 슌쯔를 만·삭·통으로 하나씩 만들어요.', '세 무늬로 같은 슌쯔'],
    ['chanta', '끝수와 자패, 찬타', '모든 묶음에 1·9나 자패를 넣어요. 슌쯔와 자패도 필요해요.', '1·9·자패를 모든 묶음에'],
    ['junchan', '끝수를 담은 준찬타', '모든 묶음에 1이나 9를 넣어요. 슌쯔도 하나 이상 필요해요.', '자패 없이 1·9를 모든 묶음에'],
    ['honroutou', '끝수와 자패만, 혼노두', '1·9와 자패만으로 완성해요. 수패와 자패를 모두 써요.', '1·9·자패만 사용'],
    ['sanshokuDoukou', '같은 커쯔, 삼색동각', '같은 숫자의 커쯔를 만·삭·통으로 하나씩 만들어요.', '세 무늬로 같은 커쯔'],
    ['ryanpeikou', '슌쯔 두 쌍, 량페코', '똑같은 슌쯔 두 묶음을 두 쌍 만들고 머리를 더해요.', '같은 슌쯔 두 쌍'],
  ].map(([id, title, description, note], index) => ({ id, number: String(index + 7).padStart(2, '0'), title, description, tag: '역 만들기', target: id, bodies: 4, pair: true, suits: ['m', 'p', 's', 'z'], scored: true, note: `전체 136장 · ${note}` })),
];

// Old mixed-body lessons can still be resumed without redefining their rules.
const LEGACY_STAGES = [{ id: 'shapes', number: '01', title: '몸통 만들기', tag: '이전 모양 연습', description: '슌쯔 또는 커쯔로 몸통 2개를 만들어요.', bodies: 2, pair: false, suits: ['m'], scored: false, note: '만수 36장 · 점수 없는 연습' }];
export const RULES_VERSION = 2;
export const SCORE_VERSION = 4;
export const BONUS_PER_HAN = 100;
// Closed-hand values are the learning reference; null means closed-only.
export const YAKU_VALUES = {
  tanyao: { name: '탕야오', han: 1, openHan: 1 },
  iipeikou: { name: '이페코', han: 1, openHan: null },
  ryanpeikou: { name: '량페코', han: 3, openHan: null },
  toitoi: { name: '또이또이', han: 2, openHan: 2 },
  honitsu: { name: '혼일색', han: 3, openHan: 2 },
  chinitsu: { name: '청일색', han: 6, openHan: 5 },
  ittsu: { name: '일기통관', han: 2, openHan: 1 },
  sanshokuDoujun: { name: '삼색동순', han: 2, openHan: 1 },
  chanta: { name: '찬타', han: 2, openHan: 1 },
  junchan: { name: '준찬타', han: 3, openHan: 2 },
  honroutou: { name: '혼노두', han: 2, openHan: 2 },
  sanshokuDoukou: { name: '삼색동각', han: 2, openHan: 2 },
};

export const HONORS = [
  { name: '동', asset: 'Ton' }, { name: '남', asset: 'Nan' },
  { name: '서', asset: 'Shaa' }, { name: '북', asset: 'Pei' },
  { name: '백', asset: 'Haku' }, { name: '발', asset: 'Hatsu' }, { name: '중', asset: 'Chun' },
];
export const suitNames = { m: '만', p: '통', s: '삭' };
export const tileName = tile => tile.suit === 'z' ? HONORS[tile.rank - 1]?.name : `${tile.rank}${suitNames[tile.suit]}`;
export const tileAsset = tile => tile.suit === 'z' ? HONORS[tile.rank - 1]?.asset : `${{ m: 'Man', p: 'Pin', s: 'Sou' }[tile.suit]}${tile.rank}`;
export const tileOrder = (a, b) => 'mpsz'.indexOf(a.suit) - 'mpsz'.indexOf(b.suit) || a.rank - b.rank || a.id.localeCompare(b.id);
export const isSimple = tile => tile.suit !== 'z' && tile.rank >= 2 && tile.rank <= 8;
export const makeTiles = suits => suits.flatMap(suit => Array.from({ length: suit === 'z' ? 7 : 9 }, (_, rank) => Array.from({ length: 4 }, (_, copy) => ({ id: `${suit}${rank + 1}-${copy}`, suit, rank: rank + 1 }))).flat());
const OLD_YAKU = ['tanyao', 'iipeikou', 'toitoi', 'chinitsu'];
const isLegacyRound = state => state?.version === 1 && state.rulesVersion === undefined && OLD_YAKU.includes(state.stageId);
export const stageOf = state => {
  const stage = [...STAGES, ...LEGACY_STAGES].find(stage => stage.id === state?.stageId);
  return isLegacyRound(state) ? { ...stage, suits: ['m', 'p', 's'], note: '이전 규칙 · 수패 108장' } : stage;
};
export const occupied = state => state.groups.filter(Boolean).length + Number(Boolean(state.pair));

export function seededRandom(seed) {
  let value = seed >>> 0 || 1;
  return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}

export function createGame(stageId = 'sequences', seed = Date.now()) {
  const stage = stageOf({ stageId }) || STAGES[0];
  const wall = makeTiles(stage.suits);
  const random = seededRandom(seed);
  for (let index = wall.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [wall[index], wall[swap]] = [wall[swap], wall[index]];
  }
  const tray = wall.splice(-13).sort(tileOrder);
  return { version: 1, rulesVersion: RULES_VERSION, stageId: stage.id, seed: seed >>> 0, wall, tray, groups: Array(stage.bodies).fill(null), pair: null, discards: [], supplies: 0, exchanges: 0, exchangeStreak: 0, longestExchangeStreak: 0, status: 'playing', edit: null };
}

export function classify(tiles) {
  if (tiles.length < 2 || tiles.length > 3 || !tiles.every(Boolean)) return null;
  const sorted = [...tiles].sort(tileOrder);
  if (!sorted.every(tile => tile.suit === sorted[0].suit)) return null;
  if (sorted.every(tile => tile.rank === sorted[0].rank)) return tiles.length === 2 ? 'pair' : 'triplet';
  if (sorted[0].suit !== 'z' && tiles.length === 3 && sorted[1].rank === sorted[0].rank + 1 && sorted[2].rank === sorted[0].rank + 2) return 'sequence';
  return null;
}

export function registration(state, ids) {
  if (state.status !== 'playing') return { ok: false, message: '새 판을 시작해 주세요.' };
  if (new Set(ids).size !== ids.length) return { ok: false, message: '서로 다른 패를 골라 주세요.' };
  const tiles = ids.map(id => state.tray.find(tile => tile?.id === id));
  const kind = classify(tiles);
  if (!kind) return { ok: false, message: ids.length === 1 ? '한 장은 버리고 뽑을 수 있어요.' : tiles.some(tile => tile?.suit === 'z') ? '자패는 같은 패끼리만 묶을 수 있어요.' : '연속 숫자 3장 또는 같은 패를 골라 주세요.' };
  const stage = stageOf(state);
  if (stage.bodyKind && kind !== 'pair' && kind !== stage.bodyKind) return { ok: false, message: stage.bodyKind === 'sequence' ? '이번에는 연속 숫자 3장인 슌쯔를 연습해요.' : '이번에는 같은 패 3장인 커쯔를 연습해요.' };
  if (stage.id === 'tanyao' && tiles.some(tile => !isSimple(tile))) return { ok: false, message: '탕야오에는 1·9와 자패를 사용할 수 없어요.' };
  if (kind === 'pair' && (!stage.pair || state.pair || (state.edit && !state.edit.hadPair))) return { ok: false, message: !stage.pair ? '이번에는 3장짜리 몸통을 만들어요.' : '머리 자리는 이미 채웠어요.' };
  const maxBodies = state.edit ? state.edit.bodyCount : stage.bodies;
  if (kind !== 'pair' && state.groups.filter(Boolean).length >= maxBodies) return { ok: false, message: '몸통 자리는 모두 채웠어요.' };
  return { ok: true, kind, tiles: tiles.sort(tileOrder), message: { sequence: '슌쯔 · 연속된 숫자 3장', triplet: '커쯔 · 같은 패 3장', pair: '머리 · 같은 패 2장' }[kind] };
}

const failure = (state, message) => ({ state, ok: false, message });
function completeIfReady(state) {
  if (!state.edit && goalStatus(state).complete) state.status = 'won';
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
  completeIfReady(next);
  const goal = goalStatus(next);
  return { state: next, ok: true, message: !next.edit && goal.full && !goal.complete ? '묶음은 채웠어요. 재조립으로 목표 역을 만들어 봐요.' : `${match.message.split(' · ')[0]}를 등록했어요.` };
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
  completeIfReady(next);
  return { state: next, ok: true, message: next.status === 'won' ? '재조립으로 목표 역을 완성했어요!' : '재조립을 마쳤어요. 공급대의 빈자리 수는 그대로예요.' };
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

// One registered decomposition drives goal checks and bonus discovery alike.
export function detectYaku(state) {
  if (state.groups?.length !== 4 || state.groups.some(group => !group || !['sequence', 'triplet'].includes(classify(group))) || classify(state.pair || []) !== 'pair') return [];
  const groups = state.groups.map(group => [...group].sort(tileOrder));
  const sequences = groups.filter(group => classify(group) === 'sequence');
  const bySequence = new Map();
  for (const group of sequences) { const key = group.map(tile => `${tile.suit}${tile.rank}`).join(); bySequence.set(key, (bySequence.get(key) || 0) + 1); }
  const identicalPairs = [...bySequence.values()].reduce((sum, count) => sum + Math.floor(count / 2), 0);
  const found = [];
  const add = (id, description) => found.push({ id, ...YAKU_VALUES[id], description });
  const all = [...groups.flat(), ...state.pair];
  const hasHonors = all.some(tile => tile.suit === 'z');
  const suited = all.filter(tile => tile.suit !== 'z');
  const oneSuit = new Set(suited.map(tile => tile.suit)).size === 1;
  const terminal = tile => tile.suit !== 'z' && [1, 9].includes(tile.rank);
  const outer = tile => tile.suit === 'z' || terminal(tile);
  if (all.every(isSimple)) add('tanyao', '몸통과 머리를 모두 2~8 숫자패로 만들었어요.');
  if (identicalPairs >= 2) add('ryanpeikou', '같은 슌쯔 두 묶음이 두 쌍 있어요. 이페코와 중복해서 세지 않아요.');
  else if (identicalPairs === 1) add('iipeikou', '같은 무늬, 같은 숫자의 슌쯔가 두 묶음이에요.');
  if (groups.every(group => classify(group) === 'triplet')) add('toitoi', '네 몸통을 모두 같은 패 세 장인 커쯔로 만들었어요.');
  if (oneSuit && hasHonors) add('honitsu', '한 가지 수패 무늬와 자패를 함께 사용했어요.');
  if (oneSuit && !hasHonors) add('chinitsu', '몸통과 머리를 모두 한 가지 수패 무늬로 만들었어요.');
  if (['m', 'p', 's'].some(suit => [1, 4, 7].every(rank => sequences.some(group => group[0].suit === suit && group[0].rank === rank)))) add('ittsu', '한 가지 무늬로 123·456·789 슌쯔를 모두 만들었어요.');
  if (sequences.some(group => ['m', 'p', 's'].every(suit => sequences.some(other => other[0].suit === suit && other[0].rank === group[0].rank)))) add('sanshokuDoujun', '만·통·삭으로 같은 숫자의 슌쯔를 만들었어요.');
  if (sequences.length && [...groups, state.pair].every(group => group.some(outer))) {
    if (hasHonors) add('chanta', '모든 묶음에 1·9나 자패가 있고, 슌쯔와 자패도 포함했어요.');
    else add('junchan', '자패 없이 모든 묶음에 1이나 9가 있고, 슌쯔도 포함했어요.');
  }
  if (hasHonors && suited.length && all.every(outer)) add('honroutou', '1·9와 자패만 사용했어요. 네 몸통은 모두 커쯔예요.');
  const triplets = groups.filter(group => classify(group) === 'triplet');
  if (triplets.some(group => ['m', 'p', 's'].every(suit => triplets.some(other => other[0].suit === suit && other[0].rank === group[0].rank)))) add('sanshokuDoukou', '만·통·삭으로 같은 숫자의 커쯔를 만들었어요.');
  return found;
}

export function goalStatus(state) {
  const stage = stageOf(state);
  const full = state.groups.every(Boolean) && (!stage.pair || Boolean(state.pair));
  const found = stage.scored && full ? detectYaku(state) : [];
  // Ryanpeikou includes the matching-sequence pair taught by the Iipeikou goal.
  const target = found.find(yaku => yaku.id === stage.target || (stage.target === 'iipeikou' && yaku.id === 'ryanpeikou')) || null;
  const complete = full && (!stage.scored || Boolean(target));
  const missing = {
    tanyao: '재조립으로 1·9를 빼고 2~8만 남겨요.',
    iipeikou: '재조립으로 같은 무늬·숫자의 슌쯔 한 쌍을 만들어요.',
    toitoi: '재조립으로 슌쯔를 바꿔 네 몸통 모두 커쯔로 만들어요.',
    chinitsu: '재조립으로 머리까지 한 가지 무늬로 맞춰요.',
    honitsu: '한 가지 수패 무늬와 자패를 모두 포함해요.',
    ittsu: '한 무늬의 123·456·789 슌쯔를 모두 넣어요.',
    sanshokuDoujun: '같은 숫자의 슌쯔를 만·삭·통으로 맞춰요.',
    chanta: '모든 묶음에 1·9나 자패를 넣고, 슌쯔와 자패를 포함해요.',
    junchan: '자패 없이 모든 묶음에 1·9를 넣고 슌쯔를 포함해요.',
    honroutou: '1·9와 자패만 남기고, 수패와 자패를 모두 포함해요.',
    sanshokuDoukou: '같은 숫자의 커쯔를 만·삭·통으로 맞춰요.',
    ryanpeikou: '똑같은 슌쯔 두 묶음을 두 쌍 만들어요.',
  };
  return { full, complete, target, found, message: full && !complete ? missing[stage.target] : stage.description };
}

export function scoreGame(state) {
  if (!stageOf(state)?.scored || state.status !== 'won' || state.edit) return null;
  const goal = goalStatus(state);
  if (!goal.complete) return null;
  // Keep in-progress 108-tile saves on their original score rules.
  const legacy = isLegacyRound(state);
  const found = legacy ? goal.found.filter(yaku => [...OLD_YAKU, 'ryanpeikou', 'sanshokuDoujun'].includes(yaku.id)) : goal.found;
  const bonuses = found.filter(yaku => yaku.id !== goal.target.id).map(yaku => ({ ...yaku, points: yaku.han * BONUS_PER_HAN }));
  const base = legacy ? 1000 : goal.target.han * BONUS_PER_HAN;
  const remaining = state.wall.length * 10;
  const bonusHan = bonuses.reduce((sum, bonus) => sum + bonus.han, 0);
  const bonusPoints = bonusHan * BONUS_PER_HAN;
  return { version: legacy ? 3 : SCORE_VERSION, base, remaining, target: goal.target, bonuses, bonusHan, bonusPoints, bonusPerHan: BONUS_PER_HAN, total: base + remaining + bonusPoints };
}

export function validSavedGame(state) {
  try {
    const stage = stageOf(state);
    if (state.rulesVersion !== undefined && state.rulesVersion !== RULES_VERSION) return false;
    if (stage?.scored && !isLegacyRound(state) && state.rulesVersion !== RULES_VERSION) return false;
    if (!stage || state.version !== 1 || !['playing', 'won', 'lost'].includes(state.status) || state.edit || state.tray.length !== 13 || state.groups.length !== stage.bodies) return false;
    if (!Array.isArray(state.wall) || !Array.isArray(state.discards)) return false;
    if (state.groups.some(group => group && !['sequence', 'triplet'].includes(classify(group)))) return false;
    if (stage.bodyKind && state.groups.some(group => group && classify(group) !== stage.bodyKind)) return false;
    if (state.pair && (!stage.pair || classify(state.pair) !== 'pair')) return false;
    if (stage.id === 'tanyao' && [...state.groups.filter(Boolean).flat(), ...(state.pair || [])].some(tile => !isSimple(tile))) return false;
    const all = [...state.wall, ...state.tray.filter(Boolean), ...state.groups.filter(Boolean).flat(), ...(state.pair || []), ...state.discards];
    const expected = new Set(makeTiles(stage.suits).map(tile => tile.id));
    if (all.length !== expected.size || new Set(all.map(tile => tile.id)).size !== expected.size) return false;
    if (!all.every(tile => expected.has(tile.id) && tile.id.startsWith(`${tile.suit}${tile.rank}-`))) return false;
    if (!['supplies', 'exchanges', 'exchangeStreak', 'longestExchangeStreak'].every(key => Number.isInteger(state[key]) && state[key] >= 0)) return false;
    const complete = goalStatus(state).complete;
    return (state.status !== 'won' || complete) && (state.status !== 'playing' || !complete) && (state.status !== 'lost' || (state.wall.length === 0 && !complete));
  } catch { return false; }
}
