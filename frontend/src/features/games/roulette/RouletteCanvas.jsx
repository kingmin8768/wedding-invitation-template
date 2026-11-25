import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import { LazygyuRoomAdapter } from './lazygyuRoomAdapter';
import { getRoundWinnerRank } from '../../../lib/lazygyuWinnerRank.js';

const getBoardNames = (entries, phase, round) => {
  if (
    (phase === 'running' || phase === 'finished') &&
    Array.isArray(round?.snapshotEntries) &&
    round.snapshotEntries.length > 0
  ) {
    return round.snapshotEntries.map((entry) =>
      typeof entry === 'string' ? entry : entry.displayName,
    );
  }

  return entries.map((entry) => entry.displayName);
};

const RouletteCanvas = ({ entries = [], phase = 'closed', round = null }) => {
  const mountRef = useRef(null);
  const adapterRef = useRef(null);
  const lastStateKeyRef = useRef('');
  const names = useMemo(
    () => getBoardNames(entries, phase, round),
    [entries, phase, round],
  );

  useEffect(() => {
    if (!mountRef.current) {
      return undefined;
    }

    const adapter = new LazygyuRoomAdapter();
    adapter.mount(mountRef.current);
    adapterRef.current = adapter;

    return () => {
      lastStateKeyRef.current = '';
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!adapterRef.current) {
      return;
    }

    const stateKey = `${phase || 'idle'}:${round?.id || 'none'}:${round?.seed || 'none'}:${names.join('|')}`;
    if (stateKey === lastStateKeyRef.current) {
      return;
    }

    lastStateKeyRef.current = stateKey;

    if (phase === 'running' && round?.id) {
      adapterRef.current.startRound({
        roundId: round.id,
        seed: round?.seed || '',
        snapshotEntries: names,
        winnerRank: getRoundWinnerRank(round),
      });
      return;
    }

    if (phase === 'finished') {
      return;
    }

    if (phase === 'closed' || phase === 'open' || phase === 'locked') {
      adapterRef.current.resetRoom(names);
    }
  }, [entries, names, phase, round]);

  return (
    <div className="lazygyu-board">
      <div className="lazygyu-board__topline">
        <div>
          <strong>lazygyu live</strong>
        </div>
      </div>

      <div className="lazygyu-board__canvas" ref={mountRef}>
        {!names.length && (
          <div className="lazygyu-board__empty">
            접수가 열리면 여기에 실제 레이지규 공이 쌓입니다.
          </div>
        )}
      </div>

      <div className="lazygyu-board__bottomline">
        <span>현재 누적 공 {names.length}개</span>
        {phase === 'finished' && round?.winnerName && (
          <span>공식 결과: {round.winnerName}</span>
        )}
      </div>
    </div>
  );
};

RouletteCanvas.propTypes = {
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      displayName: PropTypes.string.isRequired,
      id: PropTypes.number,
    }),
  ),
  phase: PropTypes.string,
  round: PropTypes.shape({
    id: PropTypes.number,
    seed: PropTypes.string,
    snapshotEntries: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          displayName: PropTypes.string.isRequired,
        }),
      ]),
    ),
    winnerRank: PropTypes.number,
    winnerName: PropTypes.string,
  }),
};

export default RouletteCanvas;
