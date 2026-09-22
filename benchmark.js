import { BENCHMARK } from './benchmark-data.js';
import { SCORE_VERSION, RULES_VERSION } from './engine.js';

export { BENCHMARK };

// Midrank gives equal scores equal treatment, without arbitrarily breaking ties.
// Only successful bot runs are in the denominator; this is not a player ranking.
export function rankScore(stageId, score, scoreVersion) {
  const reference = BENCHMARK.stages[stageId];
  if (!reference || scoreVersion !== SCORE_VERSION || scoreVersion !== BENCHMARK.scoreVersion || RULES_VERSION !== BENCHMARK.rulesVersion || !Number.isFinite(score) || score < 0) return null;
  let below = 0, equal = 0;
  for (const [value, count] of reference.histogram) {
    if (value < score) below += count;
    else if (value === score) equal = count;
    else break;
  }
  const above = reference.clears - below - equal;
  const topPercent = (above + equal / 2) / reference.clears * 100;
  return { benchmarkId: BENCHMARK.id, topPercent, percentile: 100 - topPercent, stars: topPercent <= 10 ? 3 : topPercent <= 50 ? 2 : 1, below, equal, above, clears: reference.clears, trials: reference.trials };
}

export function starThreshold(stageId, stars) {
  const reference = BENCHMARK.stages[stageId];
  if (!reference || ![2, 3].includes(stars)) return null;
  for (let score = 0; score <= reference.histogram.at(-1)[0] + 10; score += 10) {
    if (rankScore(stageId, score, SCORE_VERSION)?.stars >= stars) return score;
  }
}

export const rankLabel = rank => rank.topPercent < 1 ? '상위 1% 미만' : `상위 ${Number(rank.topPercent.toFixed(1))}%`;
