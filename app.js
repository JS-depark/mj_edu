import { STAGES, tileName, stageOf, occupied, createGame, registration, register, supply, exchange, sortTray, beginReassembly, releaseGroup, canFinishReassembly, finishReassembly, cancelReassembly, endRound, findGroup, scoreGame, validSavedGame } from './engine.js';

const root = document.querySelector('#app');
const sheet = document.querySelector('#sheet');
const announce = document.querySelector('#announcement');
const STORAGE = 'chagok-v1';
const PREFS = 'chagok-preferences-v1';
const RECORDS = 'chagok-records-v1';
const paths = {
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 8.6a2.5 2.5 0 0 1 4.8.9c0 1.8-2.4 2-2.4 3.8M12 16h.01"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
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
let prefs = { rows: preferences?.rows === 3 ? 3 : 2, numbers: preferences?.numbers !== false };
let selected = [];
let hinted = [];
let feedback = '';
let feedbackError = false;
let activeSheet = null;
let focusBeforeSheet = null;

function remember() { safeWrite(STORAGE, game.edit ? game.edit.snapshot : game); }
function recordWin() {
  if (game.status !== 'won') return;
  const stored = safeRead(RECORDS, {});
  const records = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  const score = scoreGame(game)?.total || 0;
  records[game.stageId] = { completed: true, best: Math.max(Number(records[game.stageId]?.best) || 0, score) };
  safeWrite(RECORDS, records);
}

const assetName = tile => `${{ m: 'Man', p: 'Pin', s: 'Sou' }[tile.suit]}${tile.rank}`;
const miniTile = tile => `<img class="mini-tile" src="./assets/tiles/${assetName(tile)}.svg" alt="${tileName(tile)}" draggable="false">`;
const miniGroup = tiles => `<span class="mini-tiles">${tiles.map(miniTile).join('')}</span>`;

function tileButton(tile) {
  const chosen = selected.includes(tile.id);
  return `<button class="tile-button${chosen ? ' selected' : ''}${hinted.includes(tile.id) ? ' hinted' : ''}" data-action="tile" data-id="${tile.id}" aria-label="${tileName(tile)}" aria-pressed="${chosen}" ${game.status !== 'playing' ? 'disabled' : ''}><img src="./assets/tiles/${assetName(tile)}.svg" alt="" draggable="false">${prefs.numbers ? `<span class="tile-number" aria-hidden="true">${tile.rank}</span>` : ''}</button>`;
}

function slotsMarkup(editing = false) {
  const stage = stageOf(game);
  const slot = (tiles, index, label, isPair = false) => {
    const tag = editing && tiles ? 'button' : 'div';
    const kind = tiles ? (isPair ? '머리' : tiles[0].rank === tiles[1].rank ? '커쯔' : '슌쯔') : label;
    const access = editing && tiles ? ` data-action="release" data-index="${index}" aria-label="${label} 풀기: ${tiles.map(tileName).join(', ')}"` : '';
    return `<${tag} class="slot${tiles ? ' filled' : ''}${isPair ? ' pair-slot' : ''}"${access}>${tiles ? miniGroup(tiles) : `<span class="mini-tiles" aria-hidden="true">${Array(isPair ? 2 : 3).fill('<span class="empty-tile"></span>').join('')}</span>`}<span class="slot-label">${kind}</span></${tag}>`;
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
  root.dataset.rows = prefs.rows;
  const tableScroll = root.querySelector('.table-zone')?.scrollTop || 0;
  const stage = stageOf(game);
  const vacancies = game.tray.filter(tile => !tile).length;
  const match = registration(game, selected);
  const last = !game.wall.length && game.status === 'playing';
  root.innerHTML = `
    <header class="topbar"><div class="brand"><img src="./favicon.svg" alt=""><span class="brand-name">차곡</span><span class="brand-small">마작 퍼즐</span></div><div class="top-actions"><button class="icon-button" data-action="help" aria-label="놀이 방법">${icon('help')}</button><button class="icon-button" data-action="settings" aria-label="화면 설정">${icon('settings')}</button></div></header>
    <div class="table-zone"><section aria-label="이번 단계의 목표"><div class="lesson"><div><p class="eyebrow">STEP ${stage.number} <span aria-hidden="true">/</span> ${stage.tag}</p><button class="lesson-link" data-action="stages" aria-label="단계 선택, 현재 ${stage.title}"><h1>${stage.title}${icon('down')}</h1></button></div><div class="wall${game.wall.length <= 6 ? ' low' : ''}" aria-label="남은 패 ${game.wall.length}장"><strong>${game.wall.length}</strong><span>남은 패</span></div></div><p class="lesson-description">${stage.description}</p><div class="lesson-progress" aria-label="${occupied(game)} / ${stage.bodies + Number(stage.pair)} 묶음 완성">${Array.from({ length: stage.bodies + Number(stage.pair) }, (_, i) => `<span class="${i < occupied(game) ? 'filled' : ''}"></span>`).join('')}</div></section>
    <section class="workbench" aria-label="등록한 묶음"><div class="section-heading"><h2>작업대<span class="count">${occupied(game)} / ${stage.bodies + Number(stage.pair)}</span></h2><button class="text-button" data-action="reassemble" ${!occupied(game) || game.status !== 'playing' ? 'disabled' : ''}>${icon('rebuild')}재조립</button></div>${slotsMarkup()}</section></div>
    <section class="river-section" aria-label="버림패"><h2>버림패<span class="count">${game.discards.length}장</span></h2><div class="river">${game.discards.length ? `${game.discards.length > 7 ? `<span class="river-more">+${game.discards.length - 7}</span>` : ''}${game.discards.slice(-7).map(miniTile).join('')}` : '<p class="river-empty">버린 패가 차례대로 쌓여요.</p>'}</div><button class="icon-button" data-action="river" aria-label="버림패 순서 보기" ${!game.discards.length ? 'disabled' : ''}>${icon('chevron')}</button></section>
    <section class="play-zone" aria-label="패 고르기"><div class="section-heading tray-heading"><h2>공급대<span class="count">${game.tray.filter(Boolean).length} / 13</span></h2><div class="tray-tools"><button class="text-button" data-action="sort" aria-label="무늬와 숫자순으로 정렬">${icon('sort')}정렬</button><div class="layout-switch" aria-label="공급대 배치"><button data-action="rows" data-rows="2" class="${prefs.rows === 2 ? 'active' : ''}" aria-pressed="${prefs.rows === 2}">2줄</button><button data-action="rows" data-rows="3" class="${prefs.rows === 3 ? 'active' : ''}" aria-pressed="${prefs.rows === 3}">3줄</button></div></div></div>
    <div class="tile-grid${prefs.rows === 3 ? ' three-rows' : ''}" aria-label="공급대의 패">${game.tray.map(tile => tile ? tileButton(tile) : '<div class="tile-space" aria-label="공급할 빈자리"><span>＋</span></div>').join('')}</div>
    ${selectionMarkup()}
    ${game.status === 'playing' ? `<div class="controls gameplay-controls"><button class="action primary register" data-action="register" aria-label="${match.ok ? `${match.kind === 'pair' ? '머리' : '몸통'} 등록하기` : '묶음 등록하기'}" ${!match.ok ? 'disabled' : ''}>${icon('check')}${match.ok ? `${match.kind === 'pair' ? '머리' : '몸통'} 등록` : '묶음 등록'}</button><button class="action secondary" data-action="exchange" aria-label="한 장 버림·쯔모" ${selected.length !== 1 || !game.wall.length ? 'disabled' : ''}>버림·쯔모</button>${last ? '<button class="action secondary" data-action="end" aria-label="이번 판 마치기">판 마치기</button>' : `<button class="action secondary" data-action="supply" aria-label="${vacancies ? `${Math.min(vacancies, game.wall.length)}장 공급받기` : '공급받기'}" ${!vacancies ? 'disabled' : ''}>${vacancies ? `${Math.min(vacancies, game.wall.length)}장 공급` : '공급받기'}</button>`}</div>` : `<div class="controls"><button class="action primary full" data-action="result">결과 보기 ${icon('chevron')}</button><button class="action secondary full" data-action="restart">${icon('rebuild')}새 패로 다시 하기</button></div>`}
    ${last ? '<p class="end-note">마지막 패예요. 남은 조합을 등록하거나 재조립한 뒤 판을 마쳐 주세요.</p>' : `<p class="control-caption">${stage.scored ? '남은 패를 아끼고, 새로운 역의 모양을 발견해 보세요.' : '시간 제한 없이, 한 묶음씩 천천히.'}</p>`}</section>`;
  root.querySelector('.table-zone').scrollTop = tableScroll;
  if (activeSheet === 'edit') renderEdit();
}

function say(message, error = false) {
  feedback = message;
  feedbackError = error;
  announce.textContent = message;
}

function apply(result) {
  if (!result.ok) { say(result.message, true); render(); return; }
  game = result.state;
  selected = [];
  hinted = [];
  say(result.message);
  remember();
  render();
  if (game.status === 'won') { recordWin(); openSheet('result'); }
}

function startStage(stageId) {
  game = createGame(stageId, freshSeed());
  selected = []; hinted = []; feedback = ''; feedbackError = false;
  closeSheet(); remember(); render();
  announce.textContent = `${stageOf(game).title}, 새 패로 시작했어요.`;
}

function sheetFrame(title, content, closeAction = 'close') {
  return `<div class="sheet-inner"><div class="sheet-handle" aria-hidden="true"></div><div class="sheet-header"><h2 id="sheet-title" tabindex="-1">${title}</h2><button class="icon-button" data-action="${closeAction}" aria-label="${closeAction === 'cancel-edit' ? '재조립 취소' : '닫기'}">${icon('close')}</button></div>${content}</div>`;
}

function openSheet(kind) {
  if (!sheet.open) focusBeforeSheet = document.activeElement?.dataset?.action;
  activeSheet = kind;
  if (kind === 'edit') renderEdit();
  else if (kind === 'help') renderHelp();
  else if (kind === 'stages') renderStages();
  else if (kind === 'settings') renderSettings();
  else if (kind === 'river') renderRiver();
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
  const examples = [
    { name: '슌쯔', copy: '같은 무늬의 연속 숫자 3장', ranks: [2, 3, 4] },
    { name: '커쯔', copy: '무늬와 숫자가 같은 패 3장', ranks: [5, 5, 5] },
    ...(stageOf(game).pair ? [{ name: '머리', copy: '무늬와 숫자가 같은 패 2장', ranks: [7, 7] }] : []),
  ];
  sheet.innerHTML = sheetFrame('한 묶음씩, 차곡차곡', `<p class="sheet-intro">슌쯔와 커쯔를 모두 ‘몸통’이라고 해요.</p>${examples.map(item => `<div class="help-example">${miniGroup(item.ranks.map(rank => ({ rank, suit: 'm' })))}<div><strong>${item.name}</strong><p>${item.copy}</p></div></div>`).join('')}<ol class="help-list"><li>공급대에서 패를 고르고 <strong>묶음 등록하기</strong>를 눌러요.</li><li>등록해서 생긴 빈자리는 <strong>공급받기</strong>로 채워요.</li><li>패 한 장을 고르면 <strong>한 장 버림·쯔모</strong>로 바꿀 수 있어요. 버린 패는 다시 돌아오지 않아요.</li><li>등록한 패는 <strong>재조립</strong>으로 바꿔도 돼요. 시작할 때와 같은 수의 몸통과 머리를 채워야 끝낼 수 있어요.</li></ol><p class="sheet-intro">${stageOf(game).note}. 이번 연습에는 자패·타가·울기가 없어요. 작업대에 묶음을 등록하는 것은 치·펑과 달라요.</p><div class="sheet-actions"><button class="action primary" data-action="hint">${icon('spark')}지금 만들 수 있는 묶음 보기</button><button class="action secondary" data-action="close">직접 해볼게요</button></div>`);
}

function renderStages() {
  const records = safeRead(RECORDS, {});
  sheet.innerHTML = sheetFrame('한 단계씩 익혀요', `<p class="sheet-intro">원하는 단계부터 해볼 수 있어요. 다른 단계로 이동하면 현재 판은 새로 시작해요.</p>${STAGES.map(stage => `<button class="lesson-card${game.stageId === stage.id ? ' current' : ''}" data-action="stage" data-stage="${stage.id}"><span class="lesson-num">${stage.number}</span><span><strong>${stage.title}</strong><small>${stage.note}</small></span><span class="lesson-badge">${records?.[stage.id]?.completed ? '완료 ✓' : game.stageId === stage.id ? '연습 중' : icon('chevron')}</span></button>`).join('')}<p class="saved-note">앞의 두 단계는 점수 없이 모양에만 집중해요.</p>`);
}

function renderSettings() {
  sheet.innerHTML = sheetFrame('손에 맞게', `<p class="sheet-intro">실제 휴대폰에서 패 크기와 엄지손가락의 이동 거리를 비교해 보세요.</p><div class="settings-row"><span>공급대 배치<small>2줄은 한눈에, 3줄은 더 큰 패로</small></span><div class="layout-switch"><button data-action="rows" data-rows="2" class="${prefs.rows === 2 ? 'active' : ''}" aria-pressed="${prefs.rows === 2}">2줄</button><button data-action="rows" data-rows="3" class="${prefs.rows === 3 ? 'active' : ''}" aria-pressed="${prefs.rows === 3}">3줄</button></div></div><div class="settings-row"><span>숫자 도움 표시<small>패 왼쪽 위에 작은 숫자를 표시해요.</small></span><button class="toggle" role="switch" aria-label="숫자 도움 표시" aria-checked="${prefs.numbers}" data-action="numbers"></button></div><div class="sheet-actions"><button class="action secondary" data-action="stages">단계 선택</button><button class="action secondary" data-action="restart">${icon('rebuild')}새 패로 다시 시작</button><button class="action primary" data-action="close">계속하기</button></div><p class="credit">진행 상황은 이 브라우저에 저장돼요.<br>차곡 · 조작을 살펴보는 첫 번째 버전<br>패 그림: <a href="https://github.com/FluffyStuff/riichi-mahjong-tiles" target="_blank" rel="noopener noreferrer">FluffyStuff</a> · CC0</p>`);
}

function renderRiver() {
  sheet.innerHTML = sheetFrame('버린 순서 그대로', `<p class="sheet-intro">왼쪽부터 오른쪽으로, 위에서 아래로 읽어요. 한 번 버린 패는 패산에 다시 섞지 않아요.</p><div class="full-river">${game.discards.map((tile, index) => `<div class="river-item">${miniTile(tile)}<small>${index + 1}</small></div>`).join('')}</div><div class="sheet-actions"><button class="action primary" data-action="close">계속하기</button></div>`);
}

function renderRestart() {
  sheet.innerHTML = sheetFrame('새 패로 시작할까요?', '<p class="sheet-intro">현재 판은 끝내고 패산을 새로 섞어요. 이전 최고 기록과 완료한 단계는 남아 있어요.</p><div class="sheet-actions"><button class="action primary" data-action="restart-confirm">새 판 시작</button><button class="action secondary" data-action="close">이어서 하기</button></div>');
}

function renderEnd() {
  sheet.innerHTML = sheetFrame('이번 판을 마칠까요?', '<p class="sheet-intro">패산을 모두 사용했어요. 아직 만들 수 있는 조합이 있다면 돌아가서 등록하거나 재조립할 수 있어요.</p><div class="sheet-actions"><button class="action primary" data-action="end-confirm">판 마치기</button><button class="action secondary" data-action="close">마지막 조합 확인</button></div>');
}

function renderEdit() {
  if (!game.edit) return;
  const scroll = sheet.scrollTop;
  const match = registration(game, selected);
  const bodyCount = game.groups.filter(Boolean).length;
  const required = game.edit;
  sheet.innerHTML = sheetFrame('묶음을 다시 조립해요', `<p class="sheet-intro">풀고 싶은 묶음을 누르세요. 공급대의 패와 바꿔 조합할 수 있어요.</p><div class="edit-slots">${slotsMarkup(true)}</div><p class="edit-summary">몸통 ${bodyCount} / ${required.bodyCount}${required.hadPair ? ` · 머리 ${Number(Boolean(game.pair))} / 1` : ''} <span class="count">같은 수를 채우면 완료</span></p><div class="tile-grid edit-tray">${game.tray.filter(Boolean).map(tileButton).join('')}</div>${selectionMarkup()}<div class="edit-footer"><div class="controls"><button class="action primary full" data-action="register" ${!match.ok ? 'disabled' : ''}>${icon('check')}선택한 묶음 등록</button><button class="action secondary" data-action="cancel-edit">원래대로</button><button class="action secondary" data-action="finish-edit" ${!canFinishReassembly(game) ? 'disabled' : ''}>재조립 완료</button></div><p class="control-caption">재조립 중에는 공급하거나 버릴 수 없어요.</p></div>`, 'cancel-edit');
  sheet.scrollTop = scroll;
}

function renderResult() {
  const won = game.status === 'won';
  const stage = stageOf(game);
  const score = scoreGame(game);
  const next = STAGES[STAGES.findIndex(item => item.id === game.stageId) + 1];
  const records = safeRead(RECORDS, {});
  sheet.innerHTML = sheetFrame(won ? '한 걸음 더 익숙하게' : '이번 연습의 기록', `<div class="result-hero"><div class="result-mark">${icon(won ? 'spark' : 'rebuild')}</div><p class="eyebrow">${won ? 'STAGE CLEAR' : 'TRY AGAIN'}</p><h3>${won ? (stage.scored ? '탕야오를 만들었어요!' : stage.pair ? '한 손이 완성됐어요!' : '몸통 두 개, 완성!') : '패산을 모두 사용했어요'}</h3><p>${won ? (stage.scored ? '1과 9 없이, 2~8로만 만든 조합이에요.' : '이제 다음 모양도 만나볼까요?') : `${occupied(game)}개의 묶음을 만들었어요. 새 패로 다시 도전해 봐요.`}</p>${score ? `<div class="score-total">${score.total.toLocaleString()}<small>점</small></div>` : ''}</div><div class="result-hand">${game.groups.filter(Boolean).map(miniGroup).join('')}${game.pair ? miniGroup(game.pair) : ''}</div>${score ? `<div class="score-breakdown"><div class="score-row"><span>목표 완성</span><strong>+${score.base.toLocaleString()}</strong></div><div class="score-row"><span>남은 패 ${game.wall.length}장 × 10</span><strong>+${score.remaining}</strong></div></div>${score.bonuses.map(bonus => `<div class="bonus-card"><strong>${bonus.name}<span>+${bonus.points}</span></strong><p>${bonus.description}</p></div>`).join('')}<p class="saved-note">내 최고 기록 ${Number(records?.[stage.id]?.best || score.total).toLocaleString()}점<br>퍼즐 점수예요. 실제 마작의 화료 점수와는 달라요.<br>추가 보너스는 등록한 묶음의 모양을 기준으로 해요.</p>` : ''}<div class="result-meta"><span>공급 ${game.supplies}회</span><span>한 장 교체 ${game.exchanges}회</span><span>남은 패 ${game.wall.length}장</span></div><div class="sheet-actions">${won && next ? `<button class="action primary" data-action="stage" data-stage="${next.id}">다음 단계 · ${next.title}${icon('chevron')}</button>` : ''}<button class="action ${won && next ? 'secondary' : 'primary'}" data-action="restart-confirm">${icon('rebuild')}새 패로 다시 하기</button><button class="text-button" data-action="close">완성한 패 살펴보기</button></div>`);
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
  else if (action === 'rows') { prefs.rows = Number(button.dataset.rows); safeWrite(PREFS, prefs); render(); if (activeSheet === 'settings') renderSettings(); }
  else if (action === 'numbers') { prefs.numbers = !prefs.numbers; safeWrite(PREFS, prefs); render(); renderSettings(); }
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
  else if (['help', 'settings', 'stages', 'river', 'restart', 'result', 'end'].includes(action)) openSheet(action);
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
