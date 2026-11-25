export const normalizeRouletteWinnerRank = (rank) => {
  const numericRank = Number(rank);
  if (!Number.isFinite(numericRank)) {
    return 0;
  }

  return Math.max(Math.trunc(numericRank), 0);
};

export const toRouletteWinnerRank = (activeWinnerRank) =>
  normalizeRouletteWinnerRank((Number(activeWinnerRank) || 1) - 1);

export const getRoundWinnerRank = (round) =>
  normalizeRouletteWinnerRank(round?.winnerRank);

export const applyRouletteWinnerRank = (
  roulette,
  rank,
  engineOptions,
) => {
  const normalizedRank = normalizeRouletteWinnerRank(rank);

  if (engineOptions) {
    engineOptions.winningRank = normalizedRank;
  }

  roulette?.setWinningRank?.(normalizedRank);
  return normalizedRank;
};
