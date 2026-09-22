import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, SCORE_VERSION, detectYaku, goalStatus, scoreGame, validSavedGame, register, createGame, stageOf } from '../engine.js';
import { YAKU_HANDS, yakuFixture } from './yaku-fixtures.mjs';

test('all twelve yaku have playable 136-tile stages and award their actual han', () => {
  assert.equal(STAGES.length, 18);
  assert.deepEqual(STAGES.filter(s => s.scored).map(s => s.id).sort(), Object.keys(YAKU_HANDS).sort());
  for (const id of Object.keys(YAKU_HANDS)) {
    const fresh = createGame(id, 777);
    assert.equal(fresh.wall.length, 123);
    assert.ok(validSavedGame(fresh));
    const won = yakuFixture(id);
    assert.ok(validSavedGame(won), id);
    assert.ok(goalStatus(won).complete, id);
    const score = scoreGame(won);
    assert.equal(score.target.id, id);
    assert.equal(score.base, score.target.han * 100);
    assert.equal(score.total, 500 + detectYaku(won).reduce((sum, y) => sum + y.han * 100, 0));
    assert.equal(score.version, SCORE_VERSION);
    const unfinished = structuredClone(won);
    unfinished.status = 'playing';
    unfinished.discards.push(...unfinished.tray.splice(0, 2, ...unfinished.pair));
    unfinished.pair = null;
    assert.ok(validSavedGame(unfinished));
    assert.equal(goalStatus(unfinished).complete, false);
    assert.equal(register(unfinished, unfinished.tray.slice(0, 2).map(t => t.id)).state.status, 'won', id);
  }
});

test('a full ordinary hand cannot clear any of the twelve target stages', () => {
  const ordinary = [[['m1','m2','m3'], ['p2','p3','p4'], ['s5','s6','s7'], ['m8','m8','m8']], ['p9','p9']];
  for (const id of Object.keys(YAKU_HANDS)) {
    const game = yakuFixture(id, 50, ordinary);
    assert.equal(goalStatus(game).full, true);
    assert.equal(goalStatus(game).complete, false, id);
    assert.equal(scoreGame(game), null, id);
    assert.equal(validSavedGame(game), false);
    assert.ok(goalStatus(game).message.length > 0);
  }
});

test('outer hands distinguish sequences, terminals, honours and the head', () => {
  const names = game => detectYaku(game).map(y => y.id);
  const chanta = yakuFixture('chanta');
  assert.ok(!names(chanta).includes('junchan'));
  assert.ok(!names(chanta).includes('honroutou'));
  chanta.pair = [{id:'p5-0',suit:'p',rank:5},{id:'p5-1',suit:'p',rank:5}];
  assert.ok(!names(chanta).includes('chanta'), 'head must contain an outer tile');
  assert.deepEqual(names(yakuFixture('honroutou')).sort(), ['honroutou','toitoi']);
  const allTerminals = yakuFixture('honroutou', 50, [[['m1','m1','m1'], ['m9','m9','m9'], ['p1','p1','p1'], ['p9','p9','p9']], ['s1','s1']]);
  assert.ok(!names(allTerminals).includes('honroutou'), 'all terminals is an excluded special hand');
  assert.ok(!names(allTerminals).includes('junchan'), 'junchan needs a sequence');
  const allHonours = yakuFixture('honroutou', 50, [[['z1','z1','z1'], ['z2','z2','z2'], ['z3','z3','z3'], ['z4','z4','z4']], ['z5','z5']]);
  assert.ok(!names(allHonours).includes('honroutou'));
  assert.ok(!names(allHonours).includes('honitsu'));
});

test('three-colour triplets and sequences are distinct; a straight stays within one suit', () => {
  const names = game => detectYaku(game).map(y => y.id);
  assert.ok(!names(yakuFixture('sanshokuDoukou')).includes('sanshokuDoujun'));
  assert.ok(!names(yakuFixture('sanshokuDoujun')).includes('sanshokuDoukou'));
  const mixed = yakuFixture('ittsu', 50, [[['m1','m2','m3'], ['p4','p5','p6'], ['s7','s8','s9'], ['z1','z1','z1']], ['p9','p9']]);
  assert.equal(goalStatus(mixed).complete, false);
  const wrongRank = yakuFixture('sanshokuDoukou', 50, [[['m5','m5','m5'], ['s5','s5','s5'], ['p6','p6','p6'], ['p1','p2','p3']], ['z4','z4']]);
  assert.equal(goalStatus(wrongRank).complete, false);
});

test('higher shapes do not double-count lower shapes, including four identical sequences', () => {
  const game = yakuFixture('ryanpeikou', 50, [Array.from({length:4}, () => ['m1','m2','m3']), ['m9','m9']]);
  assert.ok(validSavedGame(game));
  assert.deepEqual(detectYaku(game).map(y => y.id).sort(), ['chinitsu','junchan','ryanpeikou']);
  assert.equal(scoreGame(game).total, 1700);
  assert.equal(goalStatus({...game,stageId:'iipeikou'}).complete, true);
  assert.equal(goalStatus({...game,stageId:'chanta'}).complete, false);
  assert.equal(goalStatus({...game,stageId:'honitsu'}).complete, false);
  const onePair = yakuFixture('iipeikou');
  assert.equal(goalStatus({...onePair,stageId:'ryanpeikou'}).complete, false);
});

test('old 108-tile saves resume with v3 scores, while new rounds use v4 and 136 tiles', () => {
  const legacy = yakuFixture('chinitsu');
  delete legacy.rulesVersion;
  for (const field of ['wall','tray','discards']) legacy[field] = legacy[field].map(t => t?.suit === 'z' ? null : t);
  legacy.wall = legacy.wall.filter(Boolean);
  legacy.discards = legacy.discards.filter(Boolean);
  assert.ok(validSavedGame(legacy));
  assert.equal(stageOf(legacy).suits.length, 3);
  assert.equal(scoreGame(legacy).version, 3);
  assert.equal(scoreGame(legacy).base, 1000);
  const fresh = createGame(legacy.stageId, 1);
  assert.equal(fresh.wall.length, 123);
  assert.ok(validSavedGame(fresh));
  assert.equal(validSavedGame({...fresh,rulesVersion:99}), false);
  const unversioned = createGame('ittsu', 1);
  delete unversioned.rulesVersion;
  assert.equal(validSavedGame(unversioned), false);
});
