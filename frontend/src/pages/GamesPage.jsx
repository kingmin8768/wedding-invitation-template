import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LazygyuStreamViewport from '../features/games/roulette/LazygyuStreamViewport.jsx';
import { useAuth } from '../hooks/useAuth';
import {
  createLazygyuRoomSocket,
  deleteMyRouletteEntry,
  fetchLazygyuHostTicket,
  fetchMyRouletteEntry,
  fetchRouletteState,
  resetRouletteEvent,
  startRouletteRound,
  updateRouletteSubmissionStatus,
  updateRouletteWinnerMode,
  upsertMyRouletteEntry,
} from '../lib/games';
import { trackInvitationEvent } from '../lib/eventLogs';

const STATUS_COPY = {
  closed: '접수 닫힘',
  open: '접수 중',
  running: '추첨 중',
  finished: '라운드 종료',
};

const WINNER_MODE_COPY = {
  first: '처음 들어온 공 1등',
  last: '마지막 들어온 공 1등',
  custom: '지정한 순위 1등',
};

const GamesPage = () => {
  const { authReady, isAdmin, isAuthenticated, tokens, user } = useAuth();
  const [state, setState] = useState(null);
  const [myEntrySummary, setMyEntrySummary] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [customWinnerRank, setCustomWinnerRank] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [roomSocket, setRoomSocket] = useState(null);

  useEffect(() => {
    fetchRouletteState()
      .then(setState)
      .catch((loadError) => setError(loadError.message));

    trackInvitationEvent({
      eventType: 'game_view',
      section: 'games-lazygyu',
      action: 'view',
      label: 'lazygyu 룸 진입',
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authReady || !tokens?.accessToken) {
      setMyEntrySummary(null);
      return;
    }

    fetchMyRouletteEntry(tokens.accessToken)
      .then((response) => {
        setMyEntrySummary(response || null);
        setDisplayName(response?.latestEntry?.displayName || '');
      })
      .catch(() => {
        setMyEntrySummary(null);
      });
  }, [
    authReady,
    tokens?.accessToken,
    state?.updatedAt,
    state?.entryCount,
    state?.submissionStatus,
  ]);

  useEffect(() => {
    let disposed = false;
    let activeSocket = null;

    const connect = async () => {
      const hostTicket =
        isAdmin && tokens?.accessToken
          ? await fetchLazygyuHostTicket(tokens.accessToken).catch(() => null)
          : null;

      if (disposed) {
        return;
      }

      const socket = createLazygyuRoomSocket(
        (eventType, payload) => {
          if (!payload?.state) {
            return;
          }

          setState(payload.state);

          if (
            eventType === 'round_finished' &&
            payload.state.round?.winnerName
          ) {
            trackInvitationEvent({
              eventType: 'game_result',
              section: 'games-lazygyu',
              action: 'winner',
              label: payload.state.round.winnerName,
              metadata: {
                roundId: payload.state.round.id,
              },
            }).catch(() => {});
          }
        },
        { hostToken: hostTicket?.token },
      );

      socket.on('connect_error', () => {
        window.setTimeout(() => {
          fetchRouletteState().then(setState).catch(() => {});
        }, 1500);
      });

      activeSocket = socket;
      setRoomSocket(socket);
    };

    connect();

    return () => {
      disposed = true;
      setRoomSocket(null);
      activeSocket?.disconnect();
    };
  }, [isAdmin, tokens?.accessToken]);

  const statusLabel = useMemo(
    () => STATUS_COPY[state?.submissionStatus] || '상태 확인 중',
    [state?.submissionStatus],
  );
  const canSubmit = state?.submissionStatus === 'open';
  const recentEntries = useMemo(
    () => [...(state?.entries || [])].slice(-10).reverse(),
    [state?.entries],
  );

  useEffect(() => {
    setCustomWinnerRank(state?.customWinnerRank || 1);
  }, [state?.customWinnerRank]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!tokens?.accessToken) {
      setError('로그인 후 공을 넣을 수 있습니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccessMessage('');
      const saved = await upsertMyRouletteEntry(displayName, tokens.accessToken);
      setDisplayName(saved.displayName);
      setSuccessMessage('공이 1개 추가되었습니다.');
      trackInvitationEvent({
        eventType: 'game_submit',
        section: 'games-lazygyu',
        action: 'add_ball',
        label: saved.displayName,
      }).catch(() => {});
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!tokens?.accessToken) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccessMessage('');
      await deleteMyRouletteEntry(tokens.accessToken);
      setMyEntrySummary(null);
      setDisplayName('');
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runAdminAction = async (action) => {
    if (!tokens?.accessToken) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const nextState = await action(tokens.accessToken);
      if (nextState) {
        setState(nextState);
      }
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="games-room">
      <header className="games-room__topbar">
        <div className="games-room__title">
          <p className="auth-kicker">Online Lazygyu Room</p>
        </div>
        <div className="games-room__meta">
          <span className={`games-status games-status--${state?.submissionStatus || 'idle'}`}>
            {statusLabel}
          </span>
          <span>누적 공 {state?.entryCount || 0}개</span>
          <span>
            기준: {WINNER_MODE_COPY[state?.winnerMode] || '처음 들어온 공 1등'}
            {state?.winnerMode === 'custom' ? ` (${state?.customWinnerRank || 1}번째)` : ''}
          </span>
          <Link className="games-page__back" to="/">
            청첩장으로
          </Link>
          {isAdmin && (
            <Link className="games-page__admin-link" to="/admin/events">
              운영실
            </Link>
          )}
        </div>
      </header>

      <section className="games-room__rulebar">
        <span className="games-room__rule-pill">
          현재 당첨 기준:
          {' '}
          {WINNER_MODE_COPY[state?.winnerMode] || '처음 들어온 공 1등'}
          {state?.winnerMode === 'custom'
            ? ` (${state?.customWinnerRank || 1}번째 공)`
            : ''}
        </span>
        <span className="games-room__rule-pill">
          {isAdmin
            ? '현재 화면이 호스트 보드를 직접 실행합니다.'
            : '현재 화면은 호스트 보드 화면을 시청합니다.'}
        </span>
      </section>

      <section className="games-room__board">
        {state?.round?.status === 'finished' && state.round?.winnerName && (
          <div className="games-room__winner">
            <span>공식 결과</span>
            <strong>{state.round.winnerName}</strong>
          </div>
        )}
        <LazygyuStreamViewport
          entries={state?.entries || []}
          isHost={isAdmin}
          phase={state?.submissionStatus}
          round={state?.round}
          socket={roomSocket}
        />
      </section>

      <section className="games-room__ticker">
        {recentEntries.length > 0 ? (
          recentEntries.map((entry) => (
            <span className="games-room__ticker-item" key={entry.id}>
              {entry.displayName}
            </span>
          ))
        ) : (
          <span className="games-room__ticker-item games-room__ticker-item--empty">
            아직 들어온 공이 없습니다.
          </span>
        )}
      </section>

      <section className="games-room__dock">
        <div className="games-room__entry">
          {!isAuthenticated && (
            <p className="shared-photo-login-note">
              참여하려면{' '}
              <Link to="/login" state={{ from: { pathname: '/games/lazygyu' } }}>
                로그인
              </Link>
              이 필요합니다.
            </p>
          )}

          {isAuthenticated && (
            <form className="games-room__entry-form" onSubmit={handleSubmit}>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={`${user?.email?.split('@')[0] || '참가자'}의 공 이름`}
                disabled={!canSubmit || isSubmitting}
                maxLength={24}
              />
              <button type="submit" disabled={!canSubmit || isSubmitting}>
                공 1개 추가
              </button>
              {(myEntrySummary?.entryCount || 0) > 0 && (
                <button
                  type="button"
                  className="games-entry-form__secondary"
                  disabled={isSubmitting}
                  onClick={handleRemove}
                >
                  내 공 모두 빼기
                </button>
              )}
            </form>
          )}
        </div>

        <div className="games-room__dock-side">
          {(myEntrySummary?.entryCount || 0) > 0 && (
            <span className="games-room__counter">내 공 {myEntrySummary.entryCount}개</span>
          )}

          {isAdmin && (
            <div className="games-room__host-controls">
              <button
                type="button"
                disabled={isSubmitting || state?.submissionStatus === 'running'}
                onClick={() =>
                  runAdminAction((accessToken) =>
                    updateRouletteWinnerMode('first', customWinnerRank, accessToken),
                  )
                }
              >
                처음 1등
              </button>
              <button
                type="button"
                disabled={isSubmitting || state?.submissionStatus === 'running'}
                onClick={() =>
                  runAdminAction((accessToken) =>
                    updateRouletteWinnerMode('last', customWinnerRank, accessToken),
                  )
                }
              >
                마지막 1등
              </button>
              <input
                type="number"
                min="1"
                value={customWinnerRank}
                onChange={(event) => setCustomWinnerRank(Number(event.target.value) || 1)}
                disabled={isSubmitting || state?.submissionStatus === 'running'}
              />
              <button
                type="button"
                disabled={isSubmitting || state?.submissionStatus === 'running'}
                onClick={() =>
                  runAdminAction((accessToken) =>
                    updateRouletteWinnerMode('custom', customWinnerRank, accessToken),
                  )
                }
              >
                {customWinnerRank}번째 1등
              </button>
              <button
                type="button"
                disabled={isSubmitting || state?.submissionStatus === 'open'}
                onClick={() => runAdminAction(updateRouletteSubmissionStatus.bind(null, 'open'))}
              >
                열기
              </button>
              <button
                type="button"
                disabled={isSubmitting || state?.submissionStatus === 'running'}
                onClick={() => runAdminAction(updateRouletteSubmissionStatus.bind(null, 'closed'))}
              >
                닫기
              </button>
              <button
                type="button"
                disabled={isSubmitting || !state?.entryCount || state?.submissionStatus === 'running'}
                onClick={() => runAdminAction(startRouletteRound)}
              >
                시작
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => runAdminAction((accessToken) => resetRouletteEvent(accessToken, false))}
              >
                리셋
              </button>
            </div>
          )}
        </div>
      </section>

      {(error || successMessage) && (
        <section className="games-room__messages">
          {error && <p className="shared-photo-feedback shared-photo-feedback--error">{error}</p>}
          {successMessage && <p className="games-entry-form__success">{successMessage}</p>}
        </section>
      )}
    </div>
  );
};

export default GamesPage;
