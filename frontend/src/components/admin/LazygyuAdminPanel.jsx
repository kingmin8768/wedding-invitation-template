import { Fragment, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  createLazygyuEventStream,
  finishLazygyuRound,
  getLazygyuAdminState,
  removeLazygyuEntry,
  resetLazygyuRoom,
  startLazygyuRound,
  updateLazygyuControl,
} from '../../lib/lazygyuRoom';

const LazygyuAdminPanel = ({ hostLink, showHero = true }) => {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [busyAction, setBusyAction] = useState('');

  useEffect(() => {
    let ignore = false;
    const events = createLazygyuEventStream();

    const load = async () => {
      try {
        const state = await getLazygyuAdminState();
        if (!ignore) {
          setRoom(state);
          setWinnerName(state.officialWinnerName || '');
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
        }
      }
    };

    load();

    events.onmessage = (event) => {
      try {
        const next = JSON.parse(event.data);
        setRoom(next);
        if (next.officialWinnerName) {
          setWinnerName(next.officialWinnerName);
        }
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    events.onerror = () => {
      events.close();
    };

    return () => {
      ignore = true;
      events.close();
    };
  }, []);

  const runAction = async (actionKey, action) => {
    setError('');
    setBusyAction(actionKey);

    try {
      const next = await action();
      setRoom(next);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction('');
    }
  };

  const disabled = !room || Boolean(busyAction);

  return (
    <div className="lazygyu-admin">
      {showHero ? (
        <div className="lazygyu-admin__hero">
          <div>
            <span className="lazygyu-admin__eyebrow">Lazygyu Host Control</span>
            <h3>단일 룸 운영</h3>
            <p>모바일 관리자 조작면입니다. 공식 화면은 호스트 링크에서 원본 lazygyu 엔진이 직접 실행하며 송출합니다.</p>
          </div>
          {hostLink ? (
            <a className="lazygyu-admin__host-link" href={hostLink}>
              호스트 화면 열기
            </a>
          ) : null}
        </div>
      ) : (
        <Fragment />
      )}

      {error && <p className="lazygyu-admin__error">{error}</p>}

      <div className="lazygyu-admin__grid">
        <section className="lazygyu-admin__card">
          <div className="lazygyu-admin__card-head">
            <h4>룸 상태</h4>
            <strong>{room?.status || 'loading'}</strong>
          </div>
          <dl className="lazygyu-admin__facts">
            <div>
              <dt>공 개수</dt>
              <dd>{room?.entries?.length || 0}</dd>
            </div>
            <div>
              <dt>공식 당첨 순위</dt>
              <dd>{room?.activeWinnerRank || 1}번째</dd>
            </div>
            <div>
              <dt>송출 상태</dt>
              <dd>{room?.streamActive ? '송출 중' : '중지'}</dd>
            </div>
          </dl>
        </section>

        <section className="lazygyu-admin__card">
          <div className="lazygyu-admin__toggle-row">
            <span>공 투입 상태</span>
            <strong>{room?.submissionsOpen ? '열림' : '닫힘'}</strong>
          </div>

          <div className="lazygyu-admin__actions">
            <button
              className={room?.submissionsOpen ? 'is-active' : ''}
              disabled={disabled || room?.submissionsOpen}
              onClick={() =>
                runAction('open-submissions', () =>
                  updateLazygyuControl({ submissionsOpen: true }),
                )
              }
              type="button"
            >
              공 투입 열기
            </button>
            <button
              className={!room?.submissionsOpen ? 'is-active' : ''}
              disabled={disabled || !room?.submissionsOpen}
              onClick={() =>
                runAction('close-submissions', () =>
                  updateLazygyuControl({ submissionsOpen: false }),
                )
              }
              type="button"
            >
              공 투입 닫기
            </button>
          </div>

          <div className="lazygyu-admin__toggle-row">
            <span>스킬 활성화</span>
            <button
              className={`lazygyu-admin__toggle ${room?.skillsEnabled ? 'is-on' : ''}`}
              disabled={disabled}
              onClick={() =>
                runAction('toggle-skills', () =>
                  updateLazygyuControl({ skillsEnabled: !room?.skillsEnabled }),
                )
              }
              type="button"
            >
              {room?.skillsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="lazygyu-admin__winner">
            <label>
              <span>공식 당첨 순위</span>
              <select
                disabled={disabled}
                onChange={(event) => {
                  const winnerMode = event.target.value;
                  runAction('winner-mode', () =>
                    updateLazygyuControl({
                      winnerMode,
                      nthWinner: room?.nthWinner || 1,
                    }),
                  );
                }}
                value={room?.winnerMode || 'first'}
              >
                <option value="first">첫번째</option>
                <option value="last">마지막</option>
                <option value="nth">n번째</option>
              </select>
            </label>

            <label>
              <span>n 값</span>
              <input
                disabled={disabled || room?.winnerMode !== 'nth'}
                min="1"
                onChange={(event) => {
                  const value = Number(event.target.value);
                  runAction('nth-winner', () =>
                    updateLazygyuControl({
                      winnerMode: 'nth',
                      nthWinner: Number.isFinite(value) ? value : 1,
                    }),
                  );
                }}
                type="number"
                value={room?.nthWinner || 1}
              />
            </label>
          </div>
        </section>

        <section className="lazygyu-admin__card">
          <div className="lazygyu-admin__actions">
            <button
              disabled={disabled}
              onClick={() => runAction('start-round', startLazygyuRound)}
              type="button"
            >
              게임 시작
            </button>
            <button
              disabled={disabled}
              onClick={() => runAction('reset-room', resetLazygyuRoom)}
              type="button"
            >
              리셋
            </button>
          </div>

          <div className="lazygyu-admin__finish">
            <input
              onChange={(event) => setWinnerName(event.target.value)}
              placeholder="공식 당첨자 이름"
              type="text"
              value={winnerName}
            />
            <button
              disabled={disabled || !winnerName.trim()}
              onClick={() => runAction('finish-round', () => finishLazygyuRound(winnerName))}
              type="button"
            >
              결과 확정
            </button>
          </div>
        </section>
      </div>

      <section className="lazygyu-admin__card">
        <div className="lazygyu-admin__card-head">
          <h4>실시간 공 목록</h4>
          <strong>{room?.entries?.length || 0}개</strong>
        </div>

        <div className="lazygyu-admin__entry-list">
          {room?.entries?.length ? (
            room.entries.map((entry) => (
              <div className="lazygyu-admin__entry" key={entry.id}>
                <span>{entry.displayName}</span>
                <button
                  disabled={disabled}
                  onClick={() => runAction(`remove-${entry.id}`, () => removeLazygyuEntry(entry.id))}
                  type="button"
                >
                  제거
                </button>
              </div>
            ))
          ) : (
            <p className="lazygyu-admin__empty">아직 들어온 공이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
};

LazygyuAdminPanel.propTypes = {
  hostLink: PropTypes.string,
  showHero: PropTypes.bool,
};

export default LazygyuAdminPanel;
