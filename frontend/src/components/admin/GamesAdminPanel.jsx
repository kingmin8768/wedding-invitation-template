import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminRouletteEntries,
  removeAdminRouletteEntry,
  resetRouletteEvent,
  startRouletteRound,
  updateRouletteSubmissionStatus,
  updateRouletteWinnerMode,
} from '../../lib/games';

const GamesAdminPanel = ({ accessToken, hostLink, onStateChange, state }) => {
  const [entries, setEntries] = useState([]);
  const [customRank, setCustomRank] = useState(state?.customWinnerRank || 1);
  const [error, setError] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      setError('');
      const nextEntries = await fetchAdminRouletteEntries(accessToken);
      setEntries(Array.isArray(nextEntries) ? nextEntries : []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    loadEntries();
  }, [
    accessToken,
    loadEntries,
    state?.updatedAt,
    state?.entryCount,
    state?.submissionStatus,
  ]);

  useEffect(() => {
    setCustomRank(state?.customWinnerRank || 1);
  }, [state?.customWinnerRank]);

  const runAction = async (action) => {
    try {
      setIsWorking(true);
      setError('');
      const nextState = await action();
      if (nextState) {
        onStateChange?.(nextState);
      }
      await loadEntries();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="admin-panel-stack">
      <div className="admin-shell__panel">
        <h3>라이브 이벤트 제어</h3>
        <p>
          접수를 열고 닫고, 같은 참가자 스냅샷으로 라운드를 시작합니다.
        </p>
        {hostLink && (
          <a className="lazygyu-admin__host-link" href={hostLink}>
            호스트 화면 열기
          </a>
        )}
        <div className="games-admin-actions">
          <button
            type="button"
            disabled={isWorking || state?.submissionStatus === 'running'}
            onClick={() =>
              runAction(() =>
                updateRouletteWinnerMode('first', state?.customWinnerRank || 1, accessToken),
              )
            }
          >
            처음 들어온 공 1등
          </button>
          <button
            type="button"
            disabled={isWorking || state?.submissionStatus === 'running'}
            onClick={() =>
              runAction(() =>
                updateRouletteWinnerMode('last', state?.customWinnerRank || 1, accessToken),
              )
            }
          >
            마지막 들어온 공 1등
          </button>
          <input
            type="number"
            min="1"
            value={customRank}
            onChange={(event) => setCustomRank(Number(event.target.value) || 1)}
            disabled={isWorking || state?.submissionStatus === 'running'}
          />
          <button
            type="button"
            disabled={isWorking || state?.submissionStatus === 'running'}
            onClick={() =>
              runAction(() =>
                updateRouletteWinnerMode('custom', customRank, accessToken),
              )
            }
          >
            {customRank}번째 공 1등
          </button>
        </div>
        <div className="games-admin-actions">
          <button
            type="button"
            disabled={isWorking || state?.submissionStatus === 'open'}
            onClick={() =>
              runAction(() =>
                updateRouletteSubmissionStatus('open', accessToken),
              )
            }
          >
            접수 열기
          </button>
          <button
            type="button"
            disabled={isWorking || state?.submissionStatus === 'running'}
            onClick={() =>
              runAction(() =>
                updateRouletteSubmissionStatus('closed', accessToken),
              )
            }
          >
            접수 닫기
          </button>
          <button
            type="button"
            disabled={isWorking || !entries.length || state?.submissionStatus === 'running'}
            onClick={() => runAction(() => startRouletteRound(accessToken))}
          >
            추첨 시작
          </button>
          <button
            type="button"
            disabled={isWorking}
            onClick={() => runAction(() => resetRouletteEvent(accessToken, false))}
          >
            라운드 초기화
          </button>
          <button
            type="button"
            disabled={isWorking}
            onClick={() => runAction(() => resetRouletteEvent(accessToken, true))}
          >
            참가자 전체 비우기
          </button>
        </div>
        {error && <p className="admin-shell__error">{error}</p>}
      </div>

      <div className="admin-panel-stack">
        {entries.map((entry) => (
          <article className="admin-list-card" key={entry.id}>
            <div className="admin-list-card__top">
              <div>
                <strong>{entry.displayName}</strong>
                <span>{entry.submittedByEmail || '참가자'}</span>
              </div>
              <div className="admin-list-card__actions">
                <button
                  type="button"
                  disabled={isWorking || state?.submissionStatus === 'running'}
                  onClick={() =>
                    runAction(async () => {
                      await removeAdminRouletteEntry(entry.id, accessToken);
                      return null;
                    })
                  }
                >
                  제거
                </button>
              </div>
            </div>
          </article>
        ))}
        {entries.length === 0 && (
          <p className="admin-shell__empty">현재 등록된 핀볼이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

GamesAdminPanel.propTypes = {
  accessToken: PropTypes.string.isRequired,
  hostLink: PropTypes.string,
  onStateChange: PropTypes.func,
  state: PropTypes.shape({
    customWinnerRank: PropTypes.number,
    entryCount: PropTypes.number,
    submissionStatus: PropTypes.string,
    winnerMode: PropTypes.string,
    updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  }),
};

GamesAdminPanel.defaultProps = {
  hostLink: '',
  onStateChange: undefined,
  state: null,
};

export default GamesAdminPanel;
