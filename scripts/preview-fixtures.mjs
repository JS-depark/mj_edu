// Isolated UI previews: a separate loopback origin protects normal saved games.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { STAGES, createGame, validSavedGame } from '../engine.js';

const fixtures = {};
function fixture(stage, groups, pair, discards, status) {
  const game = createGame(stage, 1234);
  const pool = [...game.tray, ...game.wall];
  const take = code => {
    const index = pool.findIndex(tile => `${tile.suit}${tile.rank}` === code);
    if (index < 0) throw new Error(`Missing ${code}`);
    return pool.splice(index, 1)[0];
  };
  game.groups = game.groups.map((_, i) => groups[i]?.map(take) || null);
  game.pair = pair?.map(take) || null;
  game.tray = pool.splice(0, 13);
  game.discards = pool.splice(0, discards);
  game.wall = pool;
  game.exchanges = discards;
  game.status = status;
  if (!validSavedGame(game)) throw new Error('Invalid preview fixture');
  return game;
}
fixtures.bonus = fixture('tanyao', [['m2','m3','m4'], ['m2','m3','m4'], ['m5','m6','m7'], ['m5','m6','m7']], ['m8','m8'], 20, 'won');
fixtures.tutorial = fixture('shapes', [['m2','m3','m4'], ['m5','m5','m5']], null, 0, 'won');
fixtures.river = fixture('tanyao', [['m2','m3','m4'], ['s5','s6','s7']], null, 36, 'playing');
fixtures.lost = fixture('tanyao', [], null, 95, 'lost');
fixtures.sort = fixture('hand', [['m2','m3','m4']], null, 3, 'playing');
fixtures.honors = fixture('honors', [], null, 0, 'playing');
fixtures.intro = createGame('sequences', 4444);
fixtures.pairs = fixture('pairs', [['m2','m3','m4'], ['m5','m5','m5']], ['m7','m7'], 0, 'won');
fixtures.oldscore = fixtures.bonus;
fixtures.sequence = fixture('sequences', [], null, 0, 'playing');
fixtures.triplet = fixture('triplets', [], null, 0, 'playing');
const assets = new Map([['/app.js','text/javascript'], ['/engine.js','text/javascript'], ['/styles.css','text/css'], ['/favicon.svg','image/svg+xml']]);
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/') {
      const game = fixtures[url.searchParams.get('case')];
      let html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
      if (game) {
        const firstVisit = url.searchParams.get('case') === 'intro';
        const prefs = firstVisit ? {} : { introSeen: true, lessonsSeen: STAGES.map(stage => stage.id) };
        const records = url.searchParams.get('case') === 'oldscore' ? { tanyao: { completed: true, best: 9990 } } : {};
        const storage = firstVisit ? "localStorage.removeItem('chagok-v1');" : `localStorage.setItem('chagok-v1', ${JSON.stringify(JSON.stringify(game))});`;
        html = html.replace('<script type="module"', `<script>${storage}localStorage.setItem('chagok-preferences-v1',${JSON.stringify(JSON.stringify(prefs))});localStorage.setItem('chagok-records-v1',${JSON.stringify(JSON.stringify(records))});</script><script type="module"`);
      }
      response.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store' });
      response.end(html);
      return;
    }
    const type = assets.get(url.pathname) || (/^\/assets\/tiles\/(?:(?:Man|Pin|Sou)[1-9]|Ton|Nan|Shaa|Pei|Haku|Hatsu|Chun)\.svg$/.test(url.pathname) ? 'image/svg+xml' : null);
    if (!type) { response.writeHead(404); response.end(); return; }
    const body = await readFile(new URL(`..${url.pathname}`, import.meta.url));
    response.writeHead(200, { 'Content-Type':`${type}; charset=utf-8`, 'Cache-Control':'no-store' });
    response.end(body);
  } catch { response.writeHead(404); response.end(); }
}).listen(4174, '127.0.0.1', () => console.log('UI previews: http://127.0.0.1:4174/?case=bonus (bonus, tutorial, river, lost, sort)'));
