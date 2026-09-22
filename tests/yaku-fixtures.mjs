import { createGame } from '../engine.js';

export const YAKU_HANDS = {
  tanyao: [[['m2','m3','m4'], ['p3','p4','p5'], ['s6','s7','s8'], ['m6','m6','m6']], ['p2','p2']],
  iipeikou: [[['m1','m2','m3'], ['m1','m2','m3'], ['p4','p5','p6'], ['s9','s9','s9']], ['p7','p7']],
  toitoi: [[['m1','m1','m1'], ['p3','p3','p3'], ['s5','s5','s5'], ['z1','z1','z1']], ['p9','p9']],
  chinitsu: [[['p1','p2','p3'], ['p4','p5','p6'], ['p7','p7','p7'], ['p8','p8','p8']], ['p9','p9']],
  honitsu: [[['m1','m2','m3'], ['m4','m5','m6'], ['m7','m7','m7'], ['z7','z7','z7']], ['z1','z1']],
  ittsu: [[['m1','m2','m3'], ['m4','m5','m6'], ['m7','m8','m9'], ['p2','p2','p2']], ['z2','z2']],
  sanshokuDoujun: [[['m2','m3','m4'], ['s2','s3','s4'], ['p2','p3','p4'], ['z6','z6','z6']], ['p9','p9']],
  chanta: [[['m1','m2','m3'], ['p7','p8','p9'], ['s1','s1','s1'], ['z3','z3','z3']], ['z5','z5']],
  junchan: [[['m1','m2','m3'], ['p7','p8','p9'], ['s1','s1','s1'], ['m9','m9','m9']], ['p1','p1']],
  honroutou: [[['m1','m1','m1'], ['p9','p9','p9'], ['s1','s1','s1'], ['z7','z7','z7']], ['z5','z5']],
  sanshokuDoukou: [[['m5','m5','m5'], ['s5','s5','s5'], ['p5','p5','p5'], ['p1','p2','p3']], ['z4','z4']],
  ryanpeikou: [[['m2','m3','m4'], ['m2','m3','m4'], ['p6','p7','p8'], ['p6','p7','p8']], ['z5','z5']],
};

export function yakuFixture(stageId, wallCount = 50, hand = YAKU_HANDS[stageId]) {
  const game = createGame(stageId, 1234);
  const pool = [...game.wall, ...game.tray];
  const take = code => {
    const index = pool.findIndex(tile => `${tile.suit}${tile.rank}` === code);
    if (index < 0) throw new Error(`Missing tile ${code}`);
    return pool.splice(index, 1)[0];
  };
  game.groups = hand[0].map(group => group.map(take));
  game.pair = hand[1].map(take);
  game.tray = pool.splice(0, 13);
  game.wall = pool.splice(0, wallCount);
  game.discards = pool;
  game.exchanges = pool.length;
  game.status = 'won';
  return game;
}
