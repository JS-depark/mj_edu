import { STAGES, HONORS, tileName, tileAsset, stageOf, occupied, createGame, registration, register, supply, exchange, sortTray, beginReassembly, releaseGroup, canFinishReassembly, finishReassembly, cancelReassembly, endRound, findGroup, scoreGame, validSavedGame } from './engine.js';

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
let game = validSavedGame(loaded) ? loaded : createGame('shapes', freshSeed());
const preferences = safeRead(PREFS, {});
let prefs = { numbers: preferences?.numbers !== false, autoSort: preferences?.autoSort === true };
if (prefs.autoSort) game = sortTray(game);
let selected = [];
let hinted = [];
let feedback = '';
let feedbackError = false;
let activeSheet = null;
let focusBeforeSheet = null;
let riverPage = null;
let riverPageSize = 10;
let resultBonus = null;
const riverObserver = new ResizeObserver(() => renderRiverBoard());

function remember() { safeWrite(STORAGE, game.edit ? game.edit.snapshot : game); }
function recordWin() {
  if (game.status !== 'won') return;
  const stored = safeRead(RECORDS, {});
  const records = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  const score = scoreGame(game)?.total || 0;
  records[game.stageId] = { completed: true, best: Math.max(Number(records[game.stageId]?.best) || 0, score) };
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
  return `<div class="slots${stage.pair ? ' with-pair' : ''}">${game.groups.map((group, index) => slot(group, index, `몸통 ${index + 1}`)).join('')}${stage.pair ? slot(game.pair, 'pair', '머리', true) : ''}</div>`;
}

function selectionMarkup() {
  const match = selected.length ? registration(game, selected) : null;
  let text = feedback || (selected.length ? match.message : '패를 골라 묶어 보세요. 다시 누르면 선택 취소.');
  if (!feedback && !selected.length && game.edit) text = '묶음을 풀고, 아래에서 패를 골라 다시 등록해요.';
  const valid = selected.length && match?.ok && !feedback;
  return `<div class="selection-info${valid ? ' valid' : ''}${feedbackError ? ' error' : ''}"><span class="selection-dot">${selected.length || (feedback ? '✓' : 'i')}</span><p class="selection-text">${text}</p>${selected.length ? `<button class="clear-selection" data-action="clear" aria-label="선택 취소">${icon('close')}</button>` : ''}</div>`;
}

function render() {
  if (activeSheet === 'edit' && game.edit) { renderEdit(); return; }
  const stage = stageOf(game);
  const vacancies = game.tray.filter(tile => !tile).length;
  const match = registration(game, selected);
  const last = !game.wall.length && game.status === 'playing';
  root.innerHTML = `
    <section class="lesson-panel" aria-label="이번 단계의 목표"><div class="lesson"><button class="lesson-link" data-action="stages" aria-label="단계 선택, 현재 ${stage.title}"><span class="eyebrow">${stage.number} · ${stage.tag}</span><h1>${stage.title}${icon('down')}</h1></button><div class="wall${game.wall.length <= 6 ? ' low' : ''}" aria-label="남은 패 ${game.wall.length}장"><strong>${game.wall.length}</strong><span>남은 패</span></div><button class="icon-button menu-button" data-action="settings" aria-label="게임 메뉴">${icon('settings')}</button></div><p class="lesson-description">${stage.description}</p></section>
    <section class="workbench" aria-label="등록한 묶음"><div class="section-heading"><h2>작업대<span class="count">${occupied(game)} / ${stage.bodies + Number(stage.pair)}</span></h2><button class="text-button" data-action="reassemble" ${!occupied(game) || game.status !== 'playing' ? 'disabled' : ''}>${icon('rebuild')}재조립</button></div>${slotsMarkup()}</section>
    <section class="river-section" aria-label="버림패"><div class="river-heading"><h2>버림패<span class="count">${game.discards.length}장</span></h2><div class="river-pagination"></div></div><div class="river-field"></div></section>
    <section class="play-zone" aria-label="패 고르기"><div class="section-heading tray-heading">${selected.length || feedback ? selectionMarkup() : `<h2>공급대<span class="count">${game.tray.filter(Boolean).length} / 13</span></h2><span class="tray-prompt">${last ? '마지막 조합을 확인해요' : '패를 골라 주세요'}</span>`}${!selected.length ? `<button class="text-button sort-button" data-action="sort" aria-label="무늬와 숫자순으로 정렬">${icon('sort')}정렬</button>` : ''}</div>
    <div class="tile-grid" aria-label="공급대의 패, ${game.tray.filter(Boolean).length}장">${game.tray.map(tile => tile ? tileButton(tile) : '<div class="tile-space" aria-label="공급할 빈자리"><span>＋</span></div>').join('')}</div>
    ${game.status === 'playing' ? `<div class="controls gameplay-controls"><button class="action primary register" data-action="register" aria-label="${match.ok ? `${match.kind === 'pair' ? '머리' : '몸통'} 등록하기` : '묶음 등록하기'}" ${!match.ok ? 'disabled' : ''}>${icon('check')}${match.ok ? `${match.kind === 'pair' ? '머리' : '몸통'} 등록` : '묶음 등록'}</button><button class="action secondary" data-action="exchange" aria-label="한 장 버림·쯔모" ${selected.length !== 1 || !game.wall.length ? 'disabled' : ''}>버림·쯔모</button>${last ? '<button class="action secondary" data-action="end" aria-label="이번 판 마치기">판 마치기</button>' : `<button class="action secondary" data-action="supply" aria-label="${vacancies ? `${Math.min(vacancies, game.wall.length)}장 공급받기` : '공급받기'}" ${!vacancies ? 'disabled' : ''}>${vacancies ? `${Math.min(vacancies, game.wall.length)}장 공급` : '공급받기'}</button>`}</div>` : `<div class="controls"><button class="action primary" data-action="result">결과 보기 ${icon('chevron')}</button><button class="action secondary" data-action="restart">새 패로 다시 하기</button></div>`}
    </section>`;
  riverObserver.disconnect();
  riverObserver.observe(root.querySelector('.river-field'));
  renderRiverBoard();
}

function renderRiverBoard() {
  const field = root.querySelector('.river-field');
  if (!field) return;
  // Tiles keep a readable size; surplus history uses pages, never a scroll strip.
  const capacity = Math.max(1, Math.floor((field.clientHeight + 4) / 40)) * 10;
  if (capacity !== riverPageSize) { riverPageSize = capacity; riverPage = null; }
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
}

function sheetFrame(title, content, closeAction = 'close', footer = '') {
  return `<div class="sheet-inner"><div class="sheet-header"><h2 id="sheet-title" tabindex="-1">${title}</h2><button class="icon-button" data-action="${closeAction}" aria-label="${closeAction === 'cancel-edit' ? '재조립 취소' : '닫기'}">${icon('close')}</button></div><div class="sheet-content">${content}</div>${footer ? `<div class="sheet-footer">${footer}</div>` : ''}</div>`;
}

function openSheet(kind) {
  if (!sheet.open) focusBeforeSheet = document.activeElement?.dataset?.action;
  activeSheet = kind;
  if (kind === 'result') resultBonus = null;
  sheet.dataset.view = kind;
  sheet.classList.toggle('expanded', ['edit', 'help', 'result', 'settings', 'stages'].includes(kind));
  if (kind === 'edit') renderEdit();
  else if (kind === 'help') renderHelp();
  else if (kind === 'stages') renderStages();
  else if (kind === 'settings') renderSettings();
  else if (kind === 'restart') renderRestart();
  else if (kind === 'end') renderEnd();
  else if (kind === 'result') renderResult();
  if (!sheet.open) sheet.showModal();
  sheet.querySelector('#sheet-title')?.focus({ preventScroll: true });
}

function closeSheet() {
  activeSheet = null;
  if (sheet.open) sheet.close();
  root.querySelector(`[data-action="${focusBeforeSheet}"]`)?.focus({ preventScroll: true });
}

function renderHelp() {
  const honors = game.stageId === 'honors';
  const examples = honors ? [{ name: '커쯔', copy: '같은 자패 3장 · 동동동처럼 묶어요', ranks: [1, 1, 1] }] : [
    { name: '슌쯔', copy: '같은 무늬의 연속 숫자 3장', ranks: [2, 3, 4] },
    { name: '커쯔', copy: '무늬와 숫자가 같은 패 3장', ranks: [5, 5, 5] },
    ...(stageOf(game).pair ? [{ name: '머리', copy: '무늬와 숫자가 같은 패 2장', ranks: [7, 7] }] : []),
  ];
  sheet.innerHTML = sheetFrame('놀이 방법', `<p class="sheet-intro">${honors ? '자패는 같은 패끼리만 묶어요. 동·남·서처럼 이어도 슌쯔가 되지 않아요.' : '슌쯔와 커쯔를 모두 ‘몸통’이라고 해요.'}</p>${honors ? `<div class="honor-guide">${HONORS.map((item, index) => `<figure>${miniTile({ suit: 'z', rank: index + 1 })}<figcaption>${item.name}</figcaption></figure>`).join('')}</div>` : ''}${examples.map(item => `<div class="help-example">${miniGroup(item.ranks.map(rank => ({ rank, suit: honors ? 'z' : 'm' })))}<div><strong>${item.name}</strong><p>${item.copy}</p></div></div>`).join('')}<ol class="help-list"><li>패를 골라 <strong>묶음 등록</strong>을 눌러요.</li><li>빈칸은 <strong>공급받기</strong>로 채워요.</li><li>한 장을 고르면 <strong>버림·쯔모</strong>로 바꿔요.</li><li><strong>재조립</strong>에서는 강조된 슬롯을 다시 채워요.</li></ol><details class="more-help"><summary>패산과 연습 규칙</summary><p>${stageOf(game).note}. 버린 패는 다시 섞지 않아요. 마지막 패를 뽑은 뒤 조합을 확인하고 판을 마쳐요.</p><p>재조립은 원래의 몸통·머리 수를 유지하며, 공급이나 버림은 할 수 없어요. 이번 연습에는 타가·울기가 없어요. 작업대 등록은 치·펑과 달라요.</p></details>`, 'close', '<div class="controls"><button class="action secondary" data-action="hint" aria-label="지금 만들 수 있는 묶음 보기">묶음 힌트</button><button class="action primary" data-action="close">계속하기</button></div>');
}

function renderStages() {
  const records = safeRead(RECORDS, {});
  sheet.innerHTML = sheetFrame('한 단계씩 익혀요', `<p class="sheet-intro">원하는 단계부터 해볼 수 있어요. 다른 단계로 이동하면 현재 판은 새로 시작해요.</p>${STAGES.map(stage => `<button class="lesson-card${game.stageId === stage.id ? ' current' : ''}" data-action="stage" data-stage="${stage.id}"><span class="lesson-num">${stage.number}</span><span><strong>${stage.title}</strong><small>${stage.note}</small></span><span class="lesson-badge">${records?.[stage.id]?.completed ? '완료 ✓' : game.stageId === stage.id ? '연습 중' : icon('chevron')}</span></button>`).join('')}<p class="saved-note">모양 연습 단계는 점수 없이 익혀요.</p>`);
}

function renderSettings() {
  sheet.innerHTML = sheetFrame('게임 메뉴', `<div class="settings-row"><span>숫자 도움 표시<small>패 왼쪽 위에 작은 숫자를 표시해요.</small></span><button class="toggle" role="switch" aria-label="숫자 도움 표시" aria-checked="${prefs.numbers}" data-action="numbers"></button></div><div class="settings-row"><span>자동정렬<small>등록·공급·교체 후 무늬와 숫자순으로 정렬해요.<br>재조립 중에는 패 위치를 유지해요.</small></span><button class="toggle" role="switch" aria-label="자동정렬" aria-checked="${prefs.autoSort}" data-action="auto-sort"></button></div><div class="sheet-actions"><button class="action secondary" data-action="help">${icon('help')}놀이 방법</button><button class="action secondary" data-action="stages">단계 선택</button><button class="action secondary" data-action="restart">${icon('rebuild')}새 패로 다시 시작</button></div><p class="credit">진행 상황과 설정은 이 브라우저에 저장돼요.<br>차곡 · 패 그림 <a href="https://github.com/FluffyStuff/riichi-mahjong-tiles" target="_blank" rel="noopener noreferrer">FluffyStuff</a> · CC0</p>`, 'close', '<button class="action primary full" data-action="close">계속하기</button>');
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
  const next = STAGES[STAGES.findIndex(item => item.id === game.stageId) + 1];
  const records = safeRead(RECORDS, {});
  const hand = `<div class="result-hand" aria-label="${won ? '완성한' : '등록한'} 묶음">${slotsMarkup()}</div>`;
  const bonus = resultBonus === null ? null : score?.bonuses[resultBonus];
  if (bonus) {
    sheet.innerHTML = sheetFrame('발견한 모양', `<div class="bonus-detail"><p class="eyebrow">탕야오와 함께 만들었어요</p><h3>${bonus.name}</h3><p class="bonus-points">+${bonus.points}점</p>${hand}<p>${bonus.description}</p><p class="result-note">등록한 묶음에서 발견한 모양이에요.<br>실전에서는 울기 등 성립 조건도 함께 배워요.</p></div>`, 'close', '<button class="action primary full" data-action="result-overview">결과로 돌아가기</button>');
    return;
  }
  const bonusTotal = score?.bonuses.reduce((sum, item) => sum + item.points, 0) || 0;
  const footer = `<div class="controls"><button class="action ${won && next ? 'secondary' : 'primary'}" data-action="restart-confirm">새 패로 재도전</button>${won && next ? `<button class="action primary" data-action="stage" data-stage="${next.id}" aria-label="다음 단계 · ${next.title}">다음 단계 ${icon('chevron')}</button>` : '<button class="action secondary" data-action="close">패 살펴보기</button>'}</div>`;
  sheet.innerHTML = sheetFrame(won ? '스테이지 클리어' : '이번 연습의 기록', `<div class="result-hero"><h3>${won ? (stage.scored ? '탕야오를 만들었어요!' : stage.pair ? '한 손이 완성됐어요!' : '몸통 두 개, 완성!') : '패산을 모두 사용했어요'}</h3><p>${won ? (stage.scored ? '1과 9 없이, 2~8로 완성한 한 손' : '한 묶음씩, 모양이 익숙해지고 있어요.') : `${occupied(game)}개의 묶음을 만들었어요. 다시 도전해 봐요.`}</p></div>${score ? `<div class="score-banner"><strong>${score.total.toLocaleString()}<small>점</small></strong><span>내 최고 기록<strong>${Number(records?.[stage.id]?.best || score.total).toLocaleString()}점</strong></span></div>` : ''}${hand}${score ? `<div class="score-breakdown"><div><span>목표 완성</span><strong>+${score.base.toLocaleString()}</strong></div><div><span>남은 패 ${game.wall.length} × 10</span><strong>+${score.remaining}</strong></div><div><span>발견 보너스</span><strong>+${bonusTotal}</strong></div></div><div class="result-bonuses"><p>${score.bonuses.length ? '함께 만든 모양 · 눌러서 알아보기' : '다음엔 다른 역의 모양도 함께 만들어 봐요.'}</p><div>${score.bonuses.map((item, index) => `<button data-action="result-bonus" data-index="${index}">${item.name}<strong>+${item.points}</strong>${icon('chevron')}</button>`).join('')}</div></div><p class="result-note">등록한 묶음의 모양으로 계산한 퍼즐 점수예요.</p>` : `<p class="tutorial-result-note">${won ? '점수 없는 연습이에요.<br>익숙해졌다면 다음 단계로 넘어가 보세요.' : '버림패와 남은 조합을 돌아보고<br>새 패로 다시 연습해 보세요.'}</p>`}<div class="result-meta"><span>공급 <strong>${game.supplies}회</strong></span><span>한 장 교체 <strong>${game.exchanges}회</strong></span><span>남은 패 <strong>${game.wall.length}장</strong></span></div>`, 'close', footer);
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
  } else if (action === 'result-bonus' || action === 'result-overview') {
    resultBonus = action === 'result-bonus' ? Number(button.dataset.index) : null;
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
  else if (action === 'close') closeSheet();
  else if (['help', 'settings', 'stages', 'restart', 'result', 'end'].includes(action)) openSheet(action);
}

root.addEventListener('click', handleClick);
sheet.addEventListener('click', handleClick);
sheet.addEventListener('cancel', event => {
  event.preventDefault();
  if (game.edit) { game = cancelReassembly(game); selected = []; hinted = []; say('재조립을 취소했어요.'); remember(); }
  closeSheet(); render();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) remember(); });
remember();
render();
if (game.status === 'won' || game.status === 'lost') { recordWin(); openSheet('result'); }
