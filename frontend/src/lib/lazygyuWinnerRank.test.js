import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRouletteWinnerRank,
  getRoundWinnerRank,
  toRouletteWinnerRank,
} from './lazygyuWinnerRank.js';

test('applies the winner rank to both the roulette instance and engine options', () => {
  const appliedRanks = [];
  const roulette = {
    setWinningRank(rank) {
      appliedRanks.push(rank);
    },
  };
  const options = { winningRank: 0 };

  const normalizedRank = applyRouletteWinnerRank(roulette, 2, options);

  assert.equal(normalizedRank, 2);
  assert.equal(options.winningRank, 2);
  assert.deepEqual(appliedRanks, [2]);
});

test('converts lazygyu active winner rank to roulette zero-based rank', () => {
  assert.equal(toRouletteWinnerRank(3), 2);
  assert.equal(toRouletteWinnerRank(1), 0);
  assert.equal(toRouletteWinnerRank(undefined), 0);
});

test('uses the server round winner rank for roulette playback', () => {
  assert.equal(getRoundWinnerRank({ winnerRank: 2 }), 2);
  assert.equal(getRoundWinnerRank({ winnerRank: 0 }), 0);
  assert.equal(getRoundWinnerRank(null), 0);
});
