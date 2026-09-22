import { STAGES, HONORS, SCORE_VERSION, BONUS_PER_HAN, YAKU_VALUES, goalStatus, tileName, tileAsset, stageOf, occupied, createGame, registration, register, supply, exchange, sortTray, beginReassembly, releaseGroup, canFinishReassembly, finishReassembly, cancelReassembly, endRound, findGroup, scoreGame, validSavedGame } from './engine.js';
import { rankScore, rankLabel, starThreshold } from './benchmark.js';

const root = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const announce = document.querySelector('#announcement');
const STORAGE = 'chagok-v1';
const PREFS = 'chagok-preferences-v1';
const RECORDS = 'chagok-records-v1';
const paths = {
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 8.6a2.5 2.5 0 0 1 4.8.9c0 1.8-2.4 2-2.4 3.8M12 16h.01"/>',
  settings: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  rebuild: '<path d="M3 10a9 9 0 0 1 15-5l3 3M21 3v5h-5M21 14a9 9 0 0 1-15 5l-3-3M3 21v-5h5"/>',
  supply: '<rect x="6" y="7" width="12" height="14" rx="2"/><path d="M9 3h9a3 3 0 0 1 3 3v10M12 11v6M9 14h6"/>',
  swap: '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sort: '<path d="M5 4v16m-3-3 3 3 3-3M11 5h9M11 10h7M11 15h5M11 20h3"/>',
  spark: '<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z"/>',
  flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
const safeRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The current round remains playable without storage. */ } };
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const loaded = safeRead(STORAGE, null);
const resuming = validSavedGame(loaded);
let game = resuming ? loaded : createGame('sequences', freshSeed());
const preferences = safeRead(PREFS, {});
let prefs = { numbers: preferences?.numbers !== false, autoSort: preferences?.autoSort === true, introSeen: preferences?.introSeen === true, lessonsSeen: Array.isArray(preferences?.lessonsSeen) ? preferences.lessonsSeen : [] };
if (prefs.autoSort) game = sortTray(game);
let selected = [];
let hinted = [];
let feedback = '';
let feedbackError = false;
let activeSheet = null;
let focusBeforeSheet = null;
let riverPage = null;
const riverPageSize = 40;
let resultBonus = null;
let resultRanking = false;
let introPage = 0;
let stagesPage = 0;
const stagePages = [
  { name: '기초 1–3', stages: STAGES.slice(0, 3) },
  { name: '기초 4–6', stages: STAGES.slice(3, 6) },
  ...[0, 1, 2].map(index => ({ name: `역 ${index * 4 + 1}–${index * 4 + 4}`, stages: STAGES.filter(stage => stage.scored).slice(index * 4, index * 4 + 4) })),
];
const starsMarkup = count => `<span class="stars" role="img" aria-label="별 ${count}개 / 3개">${[1, 2, 3].map(n => `<span class="${n <= count ? 'earned' : ''}" aria-hidden="true">${n <= count ? '★' : '☆'}</span>`).join('')}</span>`;

// Fit the board from viewport space, never from stage text or occupied slots.
// Keep a 3:4 discard face; spare height enlarges content instead of a blank river.
function fitGameLayout() {
  const style = getComputedStyle(root);
  const width = root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = root.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  if (width <= 0 || height <= 0) return;
  // Two rows need 605px including four discard rows and 50px tray tiles.
  const compact = height < 605;
  const rows = compact ? 1 : 2;
  const goal = compact ? 70 : 76;
  const gap = compact ? 3 : 4;
  const base = goal + gap * 3 + (42 + (rows - 1) * 6) + 47 + 106;
  const minRiver = compact ? 28 : 32;
  const minTray = compact ? 44 : 50;
  const idealSlot = compact ? 52 : 64;
  const idealRiver = (width - 27) / 10 / .75;
  const idealTray = Math.min(76, (width - 24) / 7 / .75);
  const minimum = base + rows * 44 + 4 * minRiver + 2 * minTray;
  const ideal = base + rows * idealSlot + 4 * idealRiver + 2 * idealTray;
  const scale = Math.max(0, Math.min(1, (height - minimum) / (ideal - minimum)));
  const spare = Math.max(0, height - ideal);
  const headerSpace = Math.min(32, spare);
  const slot = 44 + (idealSlot - 44) * scale + (spare - headerSpace) / rows;
  const river = minRiver + (idealRiver - minRiver) * scale;
  const tray = minTray + (idealTray - minTray) * scale;
  const workHeading = 32 + headerSpace * 12 / 32;
  const riverHeading = 36 + headerSpace * 8 / 32;
  const trayHeading = 32 + headerSpace * 12 / 32;
  const maxWorkTileWidth = compact ? ((width - 30) * 3 / 14 - 6) / 3 : (width - 46) / 8;
  const workTile = Math.min(slot - (compact ? 18 : 24), maxWorkTileWidth / .75, 56);
  const values = {
    'goal-height': goal,
    'section-gap': gap,
    'work-heading': workHeading,
    'work-height': workHeading + 10 + (rows - 1) * 6 + rows * slot,
    'work-slots-height': rows * slot + (rows - 1) * 6,
    'work-tile-height': workTile,
    'work-tile-width': workTile * .75,
    'river-heading': riverHeading,
    'river-height': riverHeading + 11 + river * 4,
    'river-tile-height': river,
    'river-tile-width': river * .75,
    'tray-heading': trayHeading,
    'tray-height': 74 + trayHeading + tray * 2,
    'tray-tile-height': tray,
    'title-size': Math.min(19, Math.max(15, width * .054)),
  };
  root.dataset.compact = String(compact);
  for (const [name, value] of Object.entries(values)) root.style.setProperty(`--${name}`, `${value.toFixed(3)}px`);
}
fitGameLayout();
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fitGameLayout).observe(root);
window.addEventListener('resize', fitGameLayout);
window.visualViewport?.addEventListener('resize', fitGameLayout);

function remember() { safeWrite(STORAGE, game.edit ? game.edit.snapshot : game); }
function recordWin() {
  if (game.status !== 'won') return;
  const stored = safeRead(RECORDS, {});
  const records = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  const score = scoreGame(game);
  const previous = records[game.stageId] || {};
  const ranking = score && rankScore(game.stageId, score.total, score.version);
  records[game.stageId] = { ...previous, completed: true, ...(score ? { bestByScoreVersion: { ...previous.bestByScoreVersion, [score.version]: Math.max(Number(previous.bestByScoreVersion?.[score.version]) || 0, score.total) } } : {}), ...(ranking ? { starsByBenchmark: { ...previous.starsByBenchmark, [ranking.benchmarkId]: Math.max(Number(previous.starsByBenchmark?.[ranking.benchmarkId]) || 0, ranking.stars) } } : {}) };
  safeWrite(RECORDS, records);
}

const assetName = tileAsset;
const miniTile = tile => `<img class="mini-tile" src="./assets/tiles/${assetName(tile)}.svg" alt="${tileName(tile)}" draggable="false">`;
const miniGroup = tiles => `<span class="mini-tiles">${tiles.map(miniTile).join('')}</span>`;

function tileButton(tile) {
  const chosen = selected.includes(tile.id);
  return `<button class="tile-button${chosen ? ' selected' : ''}${hinted.includes(tile.id) ? ' hinted' : ''}" data-action="tile" data-id="${tile.id}" aria-label="${tileName(tile)}" aria-pressed="${chosen}" ${game.status !== 'playing' ? 'disabled' : ''}><img src="./assets/tiles/${assetName(tile)}.svg" alt="" draggable="false">${prefs.numbers && tile.suit !== 'z' ? `<span class="tile-number" aria-hidden="true">${tile.rank}</span>` : ''}</button>`;
}

function slotsMarkup(editing = false) {
  const stage = stageOf(game);
  const slot = (tiles, index, label, isPair = false) => {
    const required = editing && (isPair ? game.edit.hadPair : Boolean(game.edit.snapshot.groups[index]));
    const unused = editing && !required;
    const tag = editing && tiles ? 'button' : 'div';
    const kind = unused ? '사용 안 함' : tiles ? (isPair ? '머리' : tiles[0].rank === tiles[1].rank ? '커쯔' : '슌쯔') : required ? '다시 채우기' : label;
    const access = editing && tiles ? ` data-action="release" data-index="${index}" aria-label="${label} 풀기: ${tiles.map(tileName).join(', ')}"` : editing ? ` role="group" aria-label="${label}: ${unused ? '이번 재조립에서 사용하지 않음' : '다시 채워야 함'}"` : '';
    return `<${tag} class="slot${tiles ? ' filled' : ''}${isPair ? ' pair-slot' : ''}${required ? ' required' : ''}${required && !tiles ? ' needs-refill' : ''}${unused ? ' unused' : ''}"${access}>${tiles ? miniGroup(tiles) : `<span class="mini-tiles" aria-hidden="true">${Array(isPair ? 2 : 3).fill('<span class="empty-tile"></span>').join('')}</span>`}<span class="slot-label">${kind}</span></${tag}>`;
  };
  return `<div class="slots${stage.pair ? ' with-pair' : ''}${stage.bodies === 2 ? ' small-hand' : ''}">${game.groups.map((group, index) => slot(group, index, `몸통 ${index + 1}`)).join('')}${stage.pair ? slot(game.pair, 'pair', '머리', true) : ''}</div>`;
}

function selectionMarkup(inTray = false) {
  const match = selected.length ? registration(game, selected) : null;
  let text = feedback || (selected.length ? match.message : '패를 골라 묶어 보세요. 다시 누르면 선택 취소.');
  if (!feedback && !selected.length && game.edit) text = '묶음을 풀고, 아래에서 패를 골라 다시 등록해요.';
  const valid = selected.length && match?.ok && !feedback;
  return `<div class="selection-info${valid ? ' valid' : ''}${feedbackError ? ' error' : ''}"><span class="selection-dot">${selected.length || (feedback ? '✓' : 'i')}</span><p class="selection-text">${text}</p>${selected.length && !inTray ? `<button class="clear-selection" data-action="clear" aria-label="선택 취소">${icon('close')}</button>` : ''}</div>`;
}

function render() {
  if (activeSheet === 'edit' && game.edit) { renderEdit(); return; }
  const stage = stageOf(game);
  const vacancies = game.tray.filter(tile => !tile).length;
  const goal = goalStatus(game);
  const pending = game.status === 'playing' && goal.full && !goal.complete;
  const match = registration(game, selected);
  const last = !game.wall.length && game.status === 'playing';
  root.innerHTML = `
    <section class="lesson-panel" aria-label="이번 단계의 목표"><div class="lesson"><button class="lesson-link" data-action="stages" aria-label="단계 선택, 현재 ${stage.title}"><span class="eyebrow">${stage.number} · ${stage.tag}</span><h1>${stage.title}${icon('down')}</h1></button><div class="wall${game.wall.length <= 6 ? ' low' : ''}" aria-label="남은 패 ${game.wall.length}장"><strong>${game.wall.length}</strong><span>남은 패</span></div><button class="icon-button menu-button" data-action="settings" aria-label="게임 메뉴">${icon('settings')}</button></div><p class="lesson-description${pending ? ' goal-warning' : ''}">${pending ? goal.message : stage.description}</p></section>
    <section class="workbench${pending ? ' goal-pending' : ''}" aria-label="등록한 묶음"><div class="section-heading"><h2>작업대<span class="count">${occupied(game)} / ${stage.bodies + Number(stage.pair)}</span>${pending ? '<span class="goal-label">역 미완성</span>' : ''}</h2><button class="text-button" data-action="reassemble" ${!occupied(game) || game.status !== 'playing' ? 'disabled' : ''}>${icon('rebuild')}재조립</button></div>${slotsMarkup()}</section>
    <section class="river-section" aria-label="버림패"><div class="river-heading"><h2>버림패<span class="count">${game.discards.length}장</span></h2><div class="river-pagination"></div></div><div class="river-field"></div></section>
    <section class="play-zone" aria-label="패 고르기"><div class="section-heading tray-heading">${selected.length || feedback ? selectionMarkup(true) : `<h2>공급대<span class="count">${game.tray.filter(Boolean).length} / 13</span></h2><span class="tray-prompt">${last ? '마지막 조합을 확인해요' : '패를 골라 주세요'}</span>`}</div>
    <div class="tile-grid" aria-label="공급대의 패, ${game.tray.filter(Boolean).length}장">${game.tray.map(tile => tile ? tileButton(tile) : '<div class="tile-space" aria-label="공급할 빈자리"><span>＋</span></div>').join('')}<button class="tray-tool" data-action="${selected.length ? 'clear' : 'sort'}" aria-label="${selected.length ? '선택 취소' : '무늬와 숫자순으로 정렬'}">${icon(selected.length ? 'close' : 'sort')}<span>${selected.length ? '취소' : '정렬'}</span></button></div>
    ${game.status === 'playing' ? `<div class="controls gameplay-controls"><button class="action primary register" data-action="register" aria-label="${match.ok ? `${match.kind === 'pair' ? '머리' : '몸통'} 등록하기` : '묶음 등록하기'}" ${!match.ok ? 'disabled' : ''}>${icon('check')}${match.ok ? `${match.kind === 'pair' ? '머리' : '몸통'} 등록` : '묶음 등록'}</button><button class="action secondary" data-action="exchange" aria-label="한 장 버림·쯔모" ${selected.length !== 1 || !game.wall.length ? 'disabled' : ''}>버림·쯔모</button>${last ? '<button class="action secondary" data-action="end" aria-label="이번 판 마치기">판 마치기</button>' : `<button class="action secondary" data-action="supply" aria-label="${vacancies ? `${Math.min(vacancies, game.wall.length)}장 공급받기` : '공급받기'}" ${!vacancies ? 'disabled' : ''}>${vacancies ? `${Math.min(vacancies, game.wall.length)}장 공급` : '공급받기'}</button>`}</div>` : `<div class="controls"><button class="action primary" data-action="result">결과 보기 ${icon('chevron')}</button><button class="action secondary" data-action="restart">새 패로 다시 하기</button></div>`}
    </section>`;
  renderRiverBoard();
}

function renderRiverBoard() {
  const field = root.querySelector('.river-field');
  if (!field) return;
  // A page is always four rows of ten; resizing never hides a row or changes pages.
  const capacity = riverPageSize;
  const pages = Math.max(1, Math.ceil(game.discards.length / capacity));
  const page = riverPage === null ? pages - 1 : Math.min(riverPage, pages - 1);
  const start = page * capacity;
  const visible = game.discards.slice(start, start + capacity);
  root.querySelector('.river-pagination').innerHTML = pages > 1 ? `<button class="icon-button previous" data-action="river-prev" aria-label="이전 버림패" ${!page ? 'disabled' : ''}>${icon('chevron')}</button><span class="river-range" aria-live="polite">${start + 1}–${start + visible.length}<small> / ${game.discards.length}</small></span><button class="icon-button" data-action="river-next" aria-label="다음 버림패" ${page === pages - 1 ? 'disabled' : ''}>${icon('chevron')}</button>` : '<span class="river-direction">버린 순서대로 →</span>';
  field.innerHTML = visible.length ? `<ol class="river-grid" start="${start + 1}" aria-label="${start + 1}번째부터 ${start + visible.length}번째 버림패">${visible.map((tile, i) => `<li aria-label="${start + i + 1}번째, ${tileName(tile)}">${miniTile(tile)}</li>`).join('')}</ol>` : '<p class="river-empty">버린 패가 여기에 순서대로 쌓여요.</p>';
}

function say(message, error = false) {
  feedback = message;
  feedbackError = error;
  announce.textContent = message;
}

function apply(result) {
  if (!result.ok) { say(result.message, true); render(); return; }
  if (game.discards.length !== result.state.discards.length) riverPage = null;
  game = prefs.autoSort && !result.state.edit ? sortTray(result.state) : result.state;
  selected = [];
  hinted = [];
  say(result.message);
  remember();
  render();
  if (game.status === 'won') { recordWin(); openSheet('result'); }
}

function startStage(stageId) {
  game = createGame(stageId, freshSeed());
  riverPage = null;
  selected = []; hinted = []; feedback = ''; feedbackError = false;
  closeSheet(); remember(); render();
  announce.textContent = `${stageOf(game).title}, 새 패로 시작했어요.`;
  if (!prefs.lessonsSeen.includes(game.stageId)) openSheet('lesson');
}

function sheetFrame(title, content, closeAction = 'close', footer = '') {
  return `<div class="sheet-inner"><div class="sheet-header"><h2 id="sheet-title" tabindex="-1">${title}</h2><button class="icon-button" data-action="${closeAction}" aria-label="${closeAction === 'cancel-edit' ? '재조립 취소' : '닫기'}">${icon('close')}</button></div><div class="sheet-content">${content}</div>${footer ? `<div class="sheet-footer">${footer}</div>` : ''}</div>`;
}

function openSheet(kind) {
  if (!sheet.open) focusBeforeSheet = document.activeElement?.dataset?.action;
  activeSheet = kind;
  if (kind === 'result') { resultBonus = null; resultRanking = false; }
  if (kind === 'intro') introPage = 0;
  if (kind === 'stages') stagesPage = Math.max(0, stagePages.findIndex(page => page.stages.some(stage => stage.id === game.stageId)));
  sheet.dataset.view = kind;
  sheet.classList.toggle('expanded', ['edit', 'help', 'result', 'settings', 'stages', 'intro', 'lesson'].includes(kind));
  if (kind === 'edit') renderEdit();
  else if (kind === 'help') {
    renderHelp();
    if (stageOf(game).scored) {
      const controls = sheet.querySelector('.sheet-footer .controls');
      controls.classList.add('help-controls');
      controls.insertAdjacentHTML('afterbegin', '<button class="action secondary" data-action="lesson">목표 설명</button>');
    }
  }
  else if (kind === 'stages') renderStages();
  else if (kind === 'settings') renderSettings();
  else if (kind === 'restart') renderRestart();
  else if (kind === 'end') renderEnd();
  else if (kind === 'result') renderResult();
  else if (kind === 'intro') renderIntro();
  else if (kind === 'lesson') renderLesson();
  if (!sheet.open) sheet.showModal();
  sheet.querySelector('#sheet-title')?.focus({ preventScroll: true });
}

function closeSheet() {
  if (activeSheet === 'lesson' && !prefs.lessonsSeen.includes(game.stageId)) { prefs.lessonsSeen.push(game.stageId); safeWrite(PREFS, prefs); }
  activeSheet = null;
  if (sheet.open) sheet.close();
  root.querySelector(`[data-action="${focusBeforeSheet}"]`)?.focus({ preventScroll: true });
}

function renderIntro() {
  const numeric = introPage === 0;
  const row = (suit, name) => `<section class="tile-family"><h3>${name}<small>1〜9</small></h3><div class="intro-tiles">${Array.from({ length: 9 }, (_, i) => `<figure>${miniTile({ suit, rank: i + 1 })}<figcaption>${i + 1}</figcaption></figure>`).join('')}</div></section>`;
  const content = numeric ? `<p class="eyebrow">패 알아보기 · 1 / 2</p><h3 class="intro-title">세 무늬, 각각 1부터 9까지</h3><p class="sheet-intro">숫자가 있는 패를 ‘수패’라고 해요.<br>같은 숫자라도 무늬가 다르면 다른 패예요.</p>${row('m', '만수')}${row('s', '삭수')}${row('p', '통수')}<p class="intro-tip">1삭은 새 그림이에요. 같은 패는 각각 4장씩 있어요.</p>` : `<p class="eyebrow">패 알아보기 · 2 / 2</p><h3 class="intro-title">숫자가 없는 일곱 자패</h3><p class="sheet-intro">동·남·서·북은 풍패, 백·발·중은 삼원패예요.<br>백은 그림이 없는 하얀 패예요.</p><div class="intro-honors">${HONORS.map((item, i) => `<figure>${miniTile({ suit: 'z', rank: i + 1 })}<figcaption>${item.name}</figcaption></figure>`).join('')}</div><div class="intro-callout"><strong>자패에는 숫자 순서가 없어요.</strong><p>동·남·서를 이어도 슌쯔가 되지 않아요.<br>같은 패끼리 모으는 방법을 곧 연습할 거예요.</p></div><p class="intro-tip">수패 27종 + 자패 7종 = 34종<br>각 4장씩, 기본 한 세트는 136장이에요.</p>`;
  sheet.innerHTML = sheetFrame('마작패와 첫인사', content, 'intro-finish', numeric ? '<button class="action primary full" data-action="intro-next">자패도 알아보기 →</button>' : '<div class="controls"><button class="action secondary" data-action="intro-prev">수패 다시 보기</button><button class="action primary" data-action="intro-finish">연습으로 가기</button></div>');
}

function finishIntro() {
  prefs.introSeen = true; safeWrite(PREFS, prefs); closeSheet();
  if (game.status === 'playing' && !prefs.lessonsSeen.includes(game.stageId)) openSheet('lesson');
}

function renderLesson() {
  const stage = stageOf(game);
  const lessons = {
    sequences: { title: '연속된 숫자 세 장, 슌쯔', tiles: ['m2','m3','m4'], rule: '같은 무늬의 2·3·4처럼 이어지는 세 장이에요. 이런 묶음을 ‘몸통’이라고 해요.', caution: '8·9·1은 이어지지 않아요. 이번에는 슌쯔만 2개 만들어요.', tip: '패 세 장을 누르고 ‘몸통 등록’을 눌러요. 빈자리는 ‘공급’으로 채워요.' },
    triplets: { title: '똑같은 패 세 장, 커쯔', tiles: ['m5','m5','m5'], rule: '무늬와 숫자가 모두 같은 세 장이에요. 커쯔도 몸통의 한 종류예요.', caution: '같은 패 두 장은 아직 커쯔가 아니에요. 이번에는 커쯔만 2개 만들어요.', tip: '묶을 패가 없다면 한 장을 골라 ‘버림·쯔모’를 눌러요. 버린 패는 돌아오지 않아요.' },
    honors: { title: '자패도 같은 것끼리 모아요', tiles: ['z7','z7','z7'], rule: '중·중·중처럼 같은 자패 세 장도 커쯔예요.', caution: '자패는 슌쯔가 되지 않아요. 이번에는 자패 커쯔를 2개 만들어요.', tip: '동·남·서·북·백·발·중의 모양을 보며 같은 패를 찾아보세요.' },
    pairs: { title: '두 장짜리 짝은 머리', tiles: ['m7','m7'], rule: '같은 패 두 장은 머리 자리에 등록해요.', caution: '슌쯔·커쯔는 몸통, 두 장짜리는 머리예요. 몸통 2개와 머리 1개를 채워요.', tip: '머리를 먼저 만들어도 괜찮아요. 한 장만 따로 등록할 수는 없어요.' },
    mixed: { title: '한 묶음 안에서는 같은 무늬', tiles: ['s2','s3','s4'], rule: '만수·삭수·통수를 함께 보며 골라요.', caution: '2만·3삭·4통은 슌쯔가 아니에요. 숫자가 같아도 무늬가 다르면 커쯔가 아니에요.', tip: '서로 다른 몸통은 무늬가 달라도 돼요. 몸통 2개와 머리 1개를 만들어요.' },
    hand: { title: '네 몸통과 머리 하나', tiles: ['m2','m3','m4'], rule: '3장 × 몸통 4개 + 2장 × 머리 1개 = 14장', caution: '이번에는 만수만 보며 다섯 자리를 완성해요. 머리를 만들 패도 남겨 보세요.', tip: '이미 등록한 조합을 바꾸고 싶다면 ‘재조립’을 써요. 원래 차 있던 자리를 모두 다시 채워야 끝나요.' },
    tanyao: { title: '첫 번째 역, 탕야오 · 1판', tiles: ['p3','p4','p5'], rule: '역은 완성한 손이 갖춰야 할 조건이에요. 탕야오는 2~8 숫자패만 써요.', caution: '1·9와 자패는 사용할 수 없어요. 슌쯔도 커쯔도 괜찮아요.', tip: `목표와 추가 역은 각각 판수 × ${BONUS_PER_HAN}점, 남은 패는 한 장당 10점이에요.` },
    iipeikou: { title: '같은 슌쯔 한 쌍, 이페코 · 1판', examples: [['m2','m3','m4'], ['m2','m3','m4']], rule: '무늬도 숫자도 똑같은 슌쯔 두 묶음이에요.', caution: '같은 슌쯔 한 쌍을 포함해 몸통 4개와 머리 1개를 만들어요. 나머지 몸통은 자유예요.', tip: '1·9도 쓸 수 있어요. 자리를 다 채워도 목표가 없다면 재조립으로 바꿔 보세요.' },
    toitoi: { title: '커쯔 네 개, 또이또이 · 2판', tiles: ['s6','s6','s6'], rule: '네 몸통이 모두 같은 패 세 장인 커쯔예요.', caution: '커쯔 4개와 머리 1개를 만들어요. 무늬는 서로 달라도 괜찮아요.', tip: '숫자패와 자패를 모두 쓸 수 있어요. 같은 패 두 장을 남겨 두고 세 번째 패를 기다려 보세요.' },
    chinitsu: { title: '한 무늬로 통일, 청일색 · 6판', tiles: ['p2','p3','p4'], rule: '몸통도 머리도 모두 같은 수패 무늬로 만들어요.', caution: '만수·삭수·통수 중 하나를 골라요. 숫자는 1~9 모두 사용할 수 있어요.', tip: '모으던 무늬를 바꿔도 괜찮아요. 이미 등록한 묶음은 재조립으로 함께 바꿀 수 있어요.' },
    honitsu: { title: '한 무늬와 자패, 혼일색 · 3판', examples: [['m2','m3','m4'], ['z7','z7','z7']], rule: '수패는 한 무늬로 모으고, 자패를 함께 사용해요.', caution: '몸통 4개와 머리를 완성해요. 수패와 자패가 모두 있어야 해요.', tip: '자패를 머리로 써도 괜찮아요.' },
    ittsu: { title: '1부터 9까지, 일기통관 · 2판', examples: [['m1','m2','m3'], ['m4','m5','m6'], ['m7','m8','m9']], rule: '한 무늬의 123·456·789, 세 슌쯔를 모아요.', caution: '나머지 몸통 하나와 머리는 자유롭게 만들어요.', tip: '1부터 9가 흩어져 있기만 해서는 안 돼요. 세 슌쯔로 등록해요.' },
    sanshokuDoujun: { title: '세 무늬로, 삼색동순 · 2판', examples: [['m2','m3','m4'], ['s2','s3','s4'], ['p2','p3','p4']], rule: '같은 숫자의 슌쯔를 만수·삭수·통수로 하나씩 모아요.', caution: '나머지 몸통 하나와 머리는 자유롭게 만들어요.', tip: '123부터 789까지, 어떤 연속 숫자로 만들어도 괜찮아요.' },
    chanta: { title: '끝수와 자패, 찬타 · 2판', examples: [['m1','m2','m3'], ['z1','z1','z1']], rule: '모든 몸통과 머리에 1·9 또는 자패가 들어가요.', caution: '슌쯔가 하나 이상, 자패도 하나 이상 있어야 해요.', tip: '슌쯔는 123이나 789예요. 머리도 1·9 또는 자패로 만들어요.' },
    junchan: { title: '끝수를 담아, 준찬타 · 3판', examples: [['s1','s2','s3'], ['p7','p8','p9']], rule: '자패 없이 모든 몸통과 머리에 1이나 9를 넣어요.', caution: '슌쯔가 하나 이상 있어야 해요. 머리는 1 또는 9예요.', tip: '123·789 슌쯔와 1·9 커쯔를 조합해 보세요.' },
    honroutou: { title: '끝수와 자패만, 혼노두 · 2판', examples: [['m1','m1','m1'], ['z5','z5','z5']], rule: '1·9와 자패만 사용하고, 수패와 자패가 모두 있어요.', caution: '네 몸통은 커쯔, 머리도 1·9 또는 자패로 만들어요.', tip: '2~8 숫자패는 사용할 수 없어요.' },
    sanshokuDoukou: { title: '세 무늬로, 삼색동각 · 2판', examples: [['m5','m5','m5'], ['s5','s5','s5'], ['p5','p5','p5']], rule: '같은 숫자의 커쯔를 만수·삭수·통수로 하나씩 모아요.', caution: '나머지 몸통 하나와 머리는 자유롭게 만들어요.', tip: '세 커쯔의 숫자는 모두 같아야 해요.' },
    ryanpeikou: { title: '슌쯔 두 쌍, 량페코 · 3판', examples: [['m2','m3','m4'], ['m2','m3','m4'], ['p6','p7','p8'], ['p6','p7','p8']], rule: '똑같은 슌쯔 두 묶음을 두 쌍 만들어요.', caution: '몸통 4개가 모두 슌쯔예요. 머리는 자유롭게 만들어요.', tip: '량페코를 완성하면 이페코 점수를 중복해서 더하지 않아요.' },
  };
  const lesson = lessons[stage.id] || lessons.hand;
  const examples = lesson.examples || [lesson.tiles];
  sheet.innerHTML = sheetFrame('이번에 배울 것', `<p class="eyebrow">STEP ${stage.number} · ${stage.scored ? '역 만들기' : '점수 없는 연습'}</p><h3 class="intro-title">${lesson.title}</h3><div class="lesson-example${examples.length > 1 ? ' paired-example' : ''}${examples.length > 2 ? ' many-examples' : ''}">${examples.map(tiles => miniGroup(tiles.map(code => ({ suit: code[0], rank: Number(code[1]) })))).join('')}</div><p class="lesson-rule">${lesson.rule}</p><div class="intro-callout"><strong>이번 목표</strong><p>${lesson.caution}</p></div><p class="lesson-tip">${lesson.tip}</p><p class="saved-note">${stage.note} · 패 순서는 매번 달라져요.</p>`, 'close', '<button class="action primary full" data-action="close">직접 만들어 보기</button>');
}

function renderHelp() {
  const honors = game.stageId === 'honors';
  const examples = honors ? [{ kind: 'triplet', name: '커쯔', copy: '같은 자패 3장 · 동동동처럼 묶어요', ranks: [1, 1, 1] }] : [
    { kind: 'sequence', name: '슌쯔', copy: '같은 무늬의 연속 숫자 3장', ranks: [2, 3, 4] },
    { kind: 'triplet', name: '커쯔', copy: '무늬와 숫자가 같은 패 3장', ranks: [5, 5, 5] },
    ...(stageOf(game).pair ? [{ kind: 'pair', name: '머리', copy: '무늬와 숫자가 같은 패 2장', ranks: [7, 7] }] : []),
  ];
  sheet.innerHTML = sheetFrame('놀이 방법', `<p class="sheet-intro">${honors ? '자패는 같은 패끼리만 묶어요. 동·남·서처럼 이어도 슌쯔가 되지 않아요.' : '슌쯔와 커쯔를 모두 ‘몸통’이라고 해요.'}</p>${honors ? `<div class="honor-guide">${HONORS.map((item, index) => `<figure>${miniTile({ suit: 'z', rank: index + 1 })}<figcaption>${item.name}</figcaption></figure>`).join('')}</div>` : ''}${examples.filter(item => !stageOf(game).bodyKind || item.kind === stageOf(game).bodyKind).map(item => `<div class="help-example">${miniGroup(item.ranks.map(rank => ({ rank, suit: honors ? 'z' : 'm' })))}<div><strong>${item.name}</strong><p>${item.copy}</p></div></div>`).join('')}<ol class="help-list"><li>패를 골라 <strong>묶음 등록</strong>을 눌러요.</li><li>빈칸은 <strong>공급받기</strong>로 채워요.</li><li>한 장을 고르면 <strong>버림·쯔모</strong>로 바꿔요.</li><li><strong>재조립</strong>에서는 강조된 슬롯을 다시 채워요.</li></ol><details class="more-help"><summary>패산과 연습 규칙</summary><p>${stageOf(game).note}. 버린 패는 다시 섞지 않아요. 마지막 패를 뽑은 뒤 조합을 확인하고 판을 마쳐요.</p><p>재조립은 원래의 몸통·머리 수를 유지하며, 공급이나 버림은 할 수 없어요. 이번 연습에는 타가·울기가 없어요. 작업대 등록은 치·펑과 달라요.</p></details>`, 'close', '<div class="controls"><button class="action secondary" data-action="hint" aria-label="지금 만들 수 있는 묶음 보기">묶음 힌트</button><button class="action primary" data-action="close">계속하기</button></div>');
}

function renderStages() {
  const records = safeRead(RECORDS, {});
  const yakuPage = stagesPage >= 2;
  const visibleStages = stagePages[stagesPage].stages;
  const cards = visibleStages.map(stage => {
    const record = records?.[stage.id];
    const best = record?.bestByScoreVersion?.[SCORE_VERSION];
    const ranking = stage.scored && best != null ? rankScore(stage.id, best, SCORE_VERSION) : null;
    const detail = ranking ? `최고 ${Number(best).toLocaleString()}점 · 자동 대비 ${rankLabel(ranking)}` : stage.scored ? `${YAKU_VALUES[stage.target].han}판 · 전체 136장` : stage.note;
    const badge = stage.scored ? starsMarkup(ranking?.stars || 0) : record?.completed ? '완료 ✓' : game.stageId === stage.id ? '연습 중' : icon('chevron');
    return `<button class="lesson-card${game.stageId === stage.id ? ' current' : ''}" data-action="stage" data-stage="${stage.id}"><span class="lesson-num">${stage.number}</span><span class="lesson-copy"><strong>${stage.title}</strong><small>${detail}</small></span><span class="lesson-badge">${badge}</span></button>`;
  }).join('');
  sheet.innerHTML = sheetFrame('한 단계씩 익혀요', `<p class="sheet-intro">원하는 단계부터 해볼 수 있어요.<br>다른 단계로 이동하면 새 판을 시작해요.</p><div class="stage-pages" aria-label="단계 묶음">${stagePages.map((page, i) => `<button data-action="stage-page" data-page="${i}" aria-pressed="${i === stagesPage}">${page.name}</button>`).join('')}</div><div class="${yakuPage ? 'yaku-stage-list' : 'tutorial-stage-list'}">${cards}</div><p class="saved-note">${yakuPage ? '별은 각 역의 자동 플레이 기록과 비교해요.<br>단계 번호는 실전 난이도 순서가 아니에요.' : '기초 6단계는 점수 없이 익혀요.'}</p>`, 'close', '<button class="action secondary full" data-action="intro">처음부터 · 패 소개 보기</button>');
}
function renderSettings() {
  sheet.innerHTML = sheetFrame('게임 메뉴', `<div class="settings-row"><span>숫자 도움 표시<small>패 왼쪽 위에 작은 숫자를 표시해요.</small></span><button class="toggle" role="switch" aria-label="숫자 도움 표시" aria-checked="${prefs.numbers}" data-action="numbers"></button></div><div class="settings-row"><span>자동정렬<small>등록·공급·교체 후 무늬와 숫자순으로 정렬해요.<br>재조립 중에는 패 위치를 유지해요.</small></span><button class="toggle" role="switch" aria-label="자동정렬" aria-checked="${prefs.autoSort}" data-action="auto-sort"></button></div><div class="sheet-actions"><button class="action secondary" data-action="intro">패 소개</button><button class="action secondary" data-action="help">${icon('help')}놀이 방법</button><button class="action secondary" data-action="stages">단계 선택</button><button class="action secondary" data-action="restart">${icon('rebuild')}새 패로 다시 시작</button></div><p class="credit">진행 상황과 설정은 이 브라우저에 저장돼요.<br>차곡 · 패 그림 <a href="https://github.com/FluffyStuff/riichi-mahjong-tiles" target="_blank" rel="noopener noreferrer">FluffyStuff</a> · CC0</p>`, 'close', '<button class="action primary full" data-action="close">계속하기</button>');
}

function renderRestart() {
  sheet.innerHTML = sheetFrame('새 패로 시작할까요?', '<p class="sheet-intro">현재 판은 끝내고 패산을 새로 섞어요. 이전 최고 기록과 완료한 단계는 남아 있어요.</p><div class="sheet-actions"><button class="action primary" data-action="restart-confirm">새 판 시작</button><button class="action secondary" data-action="close">이어서 하기</button></div>');
}

function renderEnd() {
  sheet.innerHTML = sheetFrame('이번 판을 마칠까요?', '<p class="sheet-intro">패산을 모두 사용했어요. 아직 만들 수 있는 조합이 있다면 돌아가서 등록하거나 재조립할 수 있어요.</p><div class="sheet-actions"><button class="action primary" data-action="end-confirm">판 마치기</button><button class="action secondary" data-action="close">마지막 조합 확인</button></div>');
}

function renderEdit() {
  if (!game.edit) return;
  const scroll = sheet.querySelector('.edit-pool')?.scrollTop || 0;
  const match = registration(game, selected);
  const bodyCount = game.groups.filter(Boolean).length;
  const required = game.edit;
  const tiles = game.tray.filter(Boolean);
  const rows = Math.max(1, Math.ceil(tiles.length / 7));
  sheet.innerHTML = sheetFrame('재조립', `<p class="sheet-intro">묶음을 눌러 풀고, 강조된 자리를 채워요.</p><div class="edit-slots">${slotsMarkup(true)}</div><p class="sr-only" role="status">몸통 ${bodyCount} / ${required.bodyCount}${required.hadPair ? ` · 머리 ${Number(Boolean(game.pair))} / 1` : ''}</p>${selectionMarkup()}<div class="edit-pool"><div class="tile-grid edit-tray" style="--pool-rows:${rows}" aria-label="재조립할 패 ${tiles.length}장">${tiles.map(tileButton).join('')}</div></div>`, 'cancel-edit', `<div class="controls edit-controls"><button class="action secondary" data-action="cancel-edit">원래대로</button><button class="action primary" data-action="register" aria-label="선택한 묶음 등록" ${!match.ok ? 'disabled' : ''}>묶음 등록</button><button class="action secondary" data-action="finish-edit" aria-label="재조립 완료" ${!canFinishReassembly(game) ? 'disabled' : ''}>완료</button></div>`);
  sheet.querySelector('.edit-pool').scrollTop = scroll;
}

function renderResult() {
  const won = game.status === 'won';
  const stage = stageOf(game);
  const score = scoreGame(game);
  const ranking = score && rankScore(game.stageId, score.total, score.version);
  if (resultRanking && ranking) {
    const thresholds = [2, 3].map(stars => starThreshold(stage.id, stars));
    sheet.innerHTML = sheetFrame('별과 순위의 기준', `<div class="ranking-detail">${starsMarkup(ranking.stars)}<h3>${rankLabel(ranking)}</h3><p>${YAKU_VALUES[stage.target].name} · 자동 플레이의 클리어 기록과 비교</p><div class="star-rules"><div>${starsMarkup(1)}<span>스테이지 클리어</span></div><div>${starsMarkup(2)}<span>상위 50% 이내<small>${thresholds[0].toLocaleString()}점부터</small></span></div><div>${starsMarkup(3)}<span>상위 10% 이내<small>${thresholds[1].toLocaleString()}점부터</small></span></div></div><p>136장으로 ${ranking.trials.toLocaleString()}판을 자동 플레이한 뒤,<br>클리어한 ${ranking.clears.toLocaleString()}판의 점수만 비교했어요.</p><p>같은 점수는 중간 순위로 계산해요.<br>별은 반올림 전 순위로 정하고, 최고 기록을 남겨요.</p><p class="result-note">사람들의 순위나 실전 마작의 난이도가 아니에요.<br>자동 플레이는 필요한 조합을 남기며, 재조립은 하지 않아요.</p></div>`, 'close', '<button class="action primary full" data-action="result-overview">결과로 돌아가기</button>');
    return;
  }
  const next = STAGES[STAGES.findIndex(item => item.id === game.stageId) + 1];
  const records = safeRead(RECORDS, {});
  const hand = `<div class="result-hand" aria-label="${won ? '완성한' : '등록한'} 묶음">${slotsMarkup()}</div>`;
  const bonus = resultBonus === null ? null : score?.bonuses[resultBonus];
  if (bonus) {
    sheet.innerHTML = sheetFrame('발견한 모양', `<div class="bonus-detail"><p class="eyebrow">${score.target.name} 목표에서 발견했어요</p><h3>${bonus.name}</h3><p class="bonus-points">${bonus.han}판 × ${score.bonusPerHan} = +${bonus.points}점</p>${hand}<p>${bonus.description}</p><div class="intro-callout"><strong>함께 만든 모양의 보너스</strong><p>목표 외에 만든 이 모양은 ${bonus.han}판이에요.<br>한 판당 ${score.bonusPerHan}점씩 보너스로 더해요.</p></div><p class="result-note">작업대에 완성한 묶음으로 계산하는 퍼즐 점수예요.</p></div>`, 'close', '<button class="action primary full" data-action="result-overview">결과로 돌아가기</button>');
    return;
  }
  const footer = `<div class="controls"><button class="action ${won && next ? 'secondary' : 'primary'}" data-action="restart-confirm">새 패로 재도전</button>${won && next ? `<button class="action primary" data-action="stage" data-stage="${next.id}" aria-label="다음 단계 · ${next.title}">다음 단계 ${icon('chevron')}</button>` : '<button class="action secondary" data-action="close">패 살펴보기</button>'}</div>`;
  const upgraded = score && score.target.id !== stage.target;
  const successTitle = score ? `${score.target.name}${upgraded ? '로 목표 완성!' : ' 완성!'}` : stage.id === 'hand' ? '한 손이 완성됐어요!' : stage.pair ? '몸통과 머리를 구분했어요!' : stage.bodyKind === 'sequence' ? '슌쯔 두 개, 완성!' : stage.bodyKind === 'triplet' ? '커쯔 두 개, 완성!' : '몸통 두 개, 완성!';
  const successCopy = upgraded ? `${YAKU_VALUES[stage.target].name}의 조건을 포함한 모양이에요.` : score ? score.target.description : '한 묶음씩, 모양이 익숙해지고 있어요.';
  const best = records?.[stage.id]?.bestByScoreVersion?.[score?.version] || score?.total || 0;
  const nextStars = ranking && ranking.stars < 3 ? starThreshold(stage.id, ranking.stars + 1) : null;
  const rankPanel = ranking ? `<button class="result-ranking" data-action="result-ranking" aria-label="${rankLabel(ranking)}, 별 ${ranking.stars}개. 비교 기준 보기"><span>${starsMarkup(ranking.stars)}<small>${nextStars ? `다음 별까지 ${(nextStars - score.total).toLocaleString()}점` : '별 세 개를 모두 모았어요!'}</small></span><span class="rank-copy"><small>자동 플레이 대비</small><strong>${rankLabel(ranking)} ${icon('chevron')}</strong></span></button>` : score ? '<p class="result-note">이전 108장 판은 순위 비교에서 제외해요.<br>새 패로 재도전하면 136장 규칙과 별을 적용해요.</p>' : '';
  const scoring = score ? `<div class="score-breakdown"><div><span>${score.version === SCORE_VERSION ? `목표 ${score.target.han}판 × ${score.bonusPerHan}` : '이전 목표 완성'}</span><strong>+${score.base.toLocaleString()}</strong></div><div><span>남은 패 ${game.wall.length} × 10</span><strong>+${score.remaining}</strong></div><div><span>추가 ${score.bonusHan}판 × ${score.bonusPerHan}</span><strong>+${score.bonusPoints}</strong></div></div><div class="result-bonuses"><p>${score.bonuses.length ? '함께 만든 모양 · 눌러서 알아보기' : '목표 역을 완성했어요.'}</p><div>${score.bonuses.map((item, index) => `<button data-action="result-bonus" data-index="${index}"><span class="bonus-copy"><strong>${item.name}<small>${item.han}판</small></strong><span>${item.description}</span></span><span class="bonus-award">+${item.points}<small>${item.han}판 × ${score.bonusPerHan}</small></span>${icon('chevron')}</button>`).join('')}</div></div><p class="result-note">목표와 추가 역은 한 번씩만 점수에 포함해요.</p>` : `<div class="tutorial-achievement">${icon(won ? 'check' : 'rebuild')}<p>${won ? '이번 모양을 익혔어요.<br>점수 부담 없이 다음 단계로 가볼까요?' : '버림패와 남은 조합을 돌아보고<br>새 패로 다시 연습해 보세요.'}</p></div>`;
  sheet.innerHTML = sheetFrame(won ? '스테이지 클리어' : '이번 연습의 기록', `<div class="result-hero${won ? ' cleared' : ''}">${won ? `<span class="clear-seal">${icon('spark')} ${score ? `${score.target.name} · ${score.target.han}판` : `STEP ${stage.number} COMPLETE`}</span>` : ''}<h3>${won ? successTitle : '패산을 모두 사용했어요'}</h3><p>${won ? successCopy : `${occupied(game)}개의 묶음을 만들었어요. 다시 도전해 봐요.`}</p></div>${score ? `<div class="score-banner"><strong>${score.total.toLocaleString()}<small>점</small></strong><span>내 최고${score.version === SCORE_VERSION ? '' : ' · 이전 규칙'}<strong>${Number(best).toLocaleString()}점</strong></span></div>` : ''}${rankPanel}${hand}${scoring}<div class="result-meta"><span>공급 <strong>${game.supplies}회</strong></span><span>한 장 교체 <strong>${game.exchanges}회</strong></span><span>남은 패 <strong>${game.wall.length}장</strong></span></div>`, 'close', footer);
}
function handleClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'tile') {
    if (game.status !== 'playing') return;
    const id = button.dataset.id;
    if (selected.includes(id)) selected = selected.filter(value => value !== id);
    else if (selected.length < 3) selected.push(id);
    else { say('한 번에 최대 3장까지 고를 수 있어요.', true); render(); return; }
    hinted = []; feedback = ''; feedbackError = false; render();
    (activeSheet === 'edit' ? sheet : root).querySelector(`[data-id="${id}"]`)?.focus({ preventScroll: true });
  } else if (action === 'clear') { selected = []; hinted = []; feedback = ''; feedbackError = false; render(); }
  else if (action === 'register') apply(register(game, selected));
  else if (action === 'supply') apply(supply(game));
  else if (action === 'exchange') apply(exchange(game, selected[0]));
  else if (action === 'sort') { game = sortTray(game); selected = []; hinted = []; say('무늬와 숫자순으로 정렬했어요.'); remember(); render(); }
  else if (action === 'numbers') { prefs.numbers = !prefs.numbers; safeWrite(PREFS, prefs); render(); renderSettings(); }
  else if (action === 'auto-sort') {
    prefs.autoSort = !prefs.autoSort;
    if (prefs.autoSort) { game = sortTray(game); selected = []; hinted = []; feedback = ''; remember(); }
    safeWrite(PREFS, prefs); render(); renderSettings();
    sheet.querySelector('[data-action="auto-sort"]')?.focus({ preventScroll: true });
  } else if (action === 'river-prev' || action === 'river-next') {
    const lastPage = Math.max(0, Math.ceil(game.discards.length / riverPageSize) - 1);
    const current = riverPage === null ? lastPage : riverPage;
    riverPage = Math.max(0, Math.min(lastPage, current + (action === 'river-next' ? 1 : -1)));
    renderRiverBoard();
    root.querySelector(`[data-action="${action}"]:not(:disabled)`)?.focus({ preventScroll: true });
  } else if (action === 'result-bonus' || action === 'result-overview' || action === 'result-ranking') {
    resultBonus = action === 'result-bonus' ? Number(button.dataset.index) : null;
    resultRanking = action === 'result-ranking';
    renderResult(); sheet.querySelector('#sheet-title')?.focus({ preventScroll: true });
  }
  else if (action === 'reassemble') {
    const result = beginReassembly(game);
    if (!result.ok) return;
    game = result.state; selected = []; hinted = []; feedback = ''; feedbackError = false; openSheet('edit');
  } else if (action === 'release') apply(releaseGroup(game, button.dataset.index === 'pair' ? 'pair' : Number(button.dataset.index)));
  else if (action === 'cancel-edit') { game = cancelReassembly(game); selected = []; hinted = []; closeSheet(); say('원래 조합으로 돌아왔어요.'); remember(); render(); }
  else if (action === 'finish-edit') {
    const result = finishReassembly(game);
    if (!result.ok) return apply(result);
    closeSheet(); apply(result);
  } else if (action === 'hint') {
    hinted = findGroup(game); selected = []; closeSheet(); say(hinted.length ? '테두리로 표시한 패를 골라 등록해 보세요.' : '지금 바로 등록할 묶음은 없어요. 한 장을 바꾸거나 재조립해 보세요.'); render();
  } else if (action === 'stage') {
    if (button.dataset.stage === game.stageId && game.status === 'playing') closeSheet();
    else startStage(button.dataset.stage);
  } else if (action === 'restart-confirm') startStage(game.stageId);
  else if (action === 'end-confirm') { game = endRound(game); remember(); render(); openSheet('result'); }
  else if (action === 'stage-page') { stagesPage = Number(button.dataset.page); renderStages(); }
  else if (action === 'intro-next' || action === 'intro-prev') { introPage = action === 'intro-next' ? 1 : 0; renderIntro(); sheet.querySelector('#sheet-title')?.focus({ preventScroll: true }); }
  else if (action === 'intro-finish') finishIntro();
  else if (action === 'close') closeSheet();
  else if (['help', 'settings', 'stages', 'restart', 'result', 'end', 'intro', 'lesson'].includes(action)) openSheet(action);
}

root.addEventListener('click', handleClick);
sheet.addEventListener('click', handleClick);
sheet.addEventListener('cancel', event => {
  event.preventDefault();
  if (activeSheet === 'intro') { finishIntro(); return; }
  if (game.edit) { game = cancelReassembly(game); selected = []; hinted = []; say('재조립을 취소했어요.'); remember(); }
  closeSheet(); render();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) remember(); });
remember();
render();
if (game.status === 'won' || game.status === 'lost') { recordWin(); openSheet('result'); }
else if (!prefs.introSeen && game.stageId === 'sequences') openSheet('intro');
else if (!resuming && !prefs.lessonsSeen.includes(game.stageId)) openSheet('lesson');
