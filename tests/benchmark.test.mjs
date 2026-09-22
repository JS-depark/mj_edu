import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, SCORE_VERSION } from '../engine.js';
import { BENCHMARK, rankScore, rankLabel, starThreshold } from '../benchmark.js';

test('all twelve references contain 10,000 attempts with only cleared scores in the distribution', () => {
  assert.deepEqual(Object.keys(BENCHMARK.stages).sort(), STAGES.filter(s => s.scored).map(s => s.id).sort());
  let clears = 0;
  for (const data of Object.values(BENCHMARK.stages)) {
    assert.equal(data.trials, 10000);
    assert.equal(data.histogram.reduce((s,[,n])=>s+n,0), data.clears);
    data.histogram.forEach(([score, count], i) => {
      assert.ok(Number.isInteger(count) && count > 0);
      assert.ok(score > 0 && score % 10 === 0);
      assert.ok(i === 0 || score > data.histogram[i-1][0]);
    });
    clears += data.clears;
  }
  assert.equal(clears, 118181);
});

test('percentiles use clear-only midranks and monotonic, inclusive star thresholds', () => {
  for (const [id, data] of Object.entries(BENCHMARK.stages)) {
    let below = 0, previousPercentile = -1, previousStars = 1;
    for (const [score, count] of data.histogram) {
      const rank = rankScore(id, score, SCORE_VERSION);
      assert.ok(Math.abs(rank.percentile - (below + count/2) / data.clears * 100) < 1e-10);
      assert.equal(rank.equal, count);
      assert.equal(rank.below + rank.equal + rank.above, data.clears);
      assert.ok(rank.percentile > previousPercentile);
      assert.ok(rank.stars >= previousStars);
      below += count; previousPercentile = rank.percentile; previousStars = rank.stars;
    }
    for (const stars of [2,3]) {
      const threshold = starThreshold(id, stars);
      assert.ok(rankScore(id, threshold, SCORE_VERSION).stars >= stars);
      assert.ok(rankScore(id, threshold - 10, SCORE_VERSION).stars < stars);
    }
    assert.equal(rankScore(id, 0, SCORE_VERSION).stars, 1);
    const higher = rankScore(id, data.histogram.at(-1)[0] + 10, SCORE_VERSION);
    assert.equal(higher.stars, 3);
    assert.equal(rankLabel(higher), '상위 1% 미만');
  }
});

test('tutorials, invalid scores and old scoring rules never receive a new rank', () => {
  for (const id of ['hand','unknown']) assert.equal(rankScore(id, 1000, SCORE_VERSION), null);
  for (const score of [NaN,Infinity,-1,'1000',null]) assert.equal(rankScore('tanyao', score, SCORE_VERSION), null);
  assert.equal(rankScore('tanyao', 1000, 3), null);
  assert.equal(rankScore('tanyao', 1000), null);
  assert.equal(starThreshold('unknown', 2), null);
});
