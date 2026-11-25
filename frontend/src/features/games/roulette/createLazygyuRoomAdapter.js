import { LazygyuRoomAdapter } from './lazygyuRoomAdapter';
import { getRoundWinnerRank } from '../../../lib/lazygyuWinnerRank.js';

export const createLazygyuRoomAdapter = (mountElement) => {
  const adapter = new LazygyuRoomAdapter();
  adapter.mount(mountElement);

  return {
    async setRoomState({ phase, entries, round }) {
      const names =
        (phase === 'running' || phase === 'finished') &&
        Array.isArray(round?.snapshotEntries) &&
        round.snapshotEntries.length > 0
          ? round.snapshotEntries.map((entry) =>
              typeof entry === 'string' ? entry : entry.displayName,
            )
          : entries.map((entry) => entry.displayName);

      const nextSeed =
        round?.seed || `${phase || 'idle'}-${names.join('|') || 'empty'}`;

      adapter.setSeed(nextSeed);

      if (phase === 'running' && round?.id) {
        await adapter.startRound({
          roundId: round.id,
          seed: nextSeed,
          snapshotEntries: names,
          winnerRank: getRoundWinnerRank(round),
        });
        return;
      }

      if (phase === 'finished') {
        return;
      }

      await adapter.resetRoom(names);
    },
    destroy() {
      adapter.destroy();
    },
  };
};
