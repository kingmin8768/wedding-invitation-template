import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  addLazygyuEntry,
  createLazygyuEventStream,
  createLazygyuFrameSocket,
  getLazygyuClientKey,
  getLazygyuState,
} from '../lib/lazygyuRoom';

const GUEST_NAME_KEY = 'lazygyuGuestName';

const LazygyuRoomPage = () => {
  const { isAdmin, isAuthenticated, user } = useAuth();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [frameUrl, setFrameUrl] = useState('');
  const frameUrlRef = useRef('');
  const clientKeyRef = useRef('');

  useEffect(() => {
    clientKeyRef.current = getLazygyuClientKey();
    const accountName = user?.displayName || '';
    const guestName =
      typeof window !== 'undefined' ? window.localStorage.getItem(GUEST_NAME_KEY) || '' : '';
    setDisplayName(accountName || guestName);
  }, [user?.displayName]);

  useEffect(() => {
    let ignore = false;
    const events = createLazygyuEventStream();
    const frameSocket = createLazygyuFrameSocket();

    const loadState = async () => {
      try {
        const state = await getLazygyuState(clientKeyRef.current);
        if (!ignore) {
          setRoom(state);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
        }
      }
    };

    loadState();

    events.onmessage = async () => {
      try {
        await loadState();
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    frameSocket.binaryType = 'arraybuffer';
    frameSocket.onmessage = (event) => {
      if (!(event.data instanceof ArrayBuffer)) {
        return;
      }

      const nextUrl = window.URL.createObjectURL(
        new Blob([event.data], { type: 'image/jpeg' }),
      );

      if (frameUrlRef.current) {
        window.URL.revokeObjectURL(frameUrlRef.current);
      }

      frameUrlRef.current = nextUrl;
      setFrameUrl(nextUrl);
    };

    events.onerror = () => {
      events.close();
    };

    return () => {
      ignore = true;
      events.close();
      frameSocket.close();
      if (frameUrlRef.current) {
        window.URL.revokeObjectURL(frameUrlRef.current);
        frameUrlRef.current = '';
      }
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const name = displayName.trim();
    if (!name) {
      setError('이름을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      await addLazygyuEntry(name);
      const nextState = await getLazygyuState(clientKeyRef.current);
      setRoom(nextState);
      if (!isAuthenticated && typeof window !== 'undefined') {
        window.localStorage.setItem(GUEST_NAME_KEY, name);
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lazygyu-room">
      <header className="lazygyu-room__header">
        <div>
          <span className="lazygyu-room__eyebrow">Shared Lazygyu Room</span>
          <h1>운명의 수레바퀴 실시간 추첨</h1>
          <p>원본 lazygyu 엔진이 호스트에서 직접 실행되며, 참가자는 같은 공식 화면을 보면서 이름으로 공을 실시간 추가합니다.</p>
        </div>
        <div className="lazygyu-room__links">
          <Link to="/">청첩장</Link>
          {isAdmin ? <Link to="/admin/events">관리자 제어</Link> : <Link to="/login">관리자 로그인</Link>}
        </div>
      </header>

      <section className="lazygyu-room__screen">
        {room?.streamActive && frameUrl ? (
          <img alt="공식 lazygyu 화면" className="lazygyu-room__frame" src={frameUrl} />
        ) : (
          <div className="lazygyu-room__frame lazygyu-room__frame--placeholder">
            <strong>{room?.streamActive ? '프레임 수신 중' : '공식 화면 대기 중'}</strong>
            <span>
              {room?.streamActive
                ? '호스트가 송출 중입니다. 첫 프레임이 도착하면 여기에서 같은 화면을 보게 됩니다.'
                : '호스트 페이지가 원본 엔진 송출을 시작하면 여기에서 모두가 같은 화면을 보게 됩니다.'}
            </span>
          </div>
        )}
      </section>

      <div className="lazygyu-room__status-strip">
        <span>상태: {room?.status || 'loading'}</span>
        <span>공 개수: {room?.entries?.length || 0}</span>
        <span>당첨 순위: {room?.activeWinnerRank || 1}번째</span>
        <span>스킬: {room?.skillsEnabled ? 'ON' : 'OFF'}</span>
        <span>최근 결과: {room?.officialWinnerName || '-'}</span>
      </div>

      <section className="lazygyu-room__dock">
        <form className="lazygyu-room__entry-form" onSubmit={handleSubmit}>
          <label>
            <span>{isAuthenticated ? '회원 이름' : '이름 입력'}</span>
            <input
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="이름"
              type="text"
              value={displayName}
            />
          </label>
          <button
            disabled={
              submitting ||
              !room?.submissionsOpen ||
              Boolean(
                room?.maxEntriesPerPerson &&
                  room?.viewerEntryCount >= room?.maxEntriesPerPerson,
              )
            }
            type="submit"
          >
            {submitting
              ? '추가 중...'
              : !room?.submissionsOpen
                ? '현재 닫힘'
                : room?.maxEntriesPerPerson &&
                    room?.viewerEntryCount >= room?.maxEntriesPerPerson
                  ? '개수 제한 도달'
                  : '공 1개 추가'}
          </button>
        </form>
        <p className="lazygyu-room__helper">
          1인당 최대 {room?.maxEntriesPerPerson || 2}개까지 넣을 수 있습니다.
          {' '}
          현재 {room?.viewerEntryCount || 0}개 넣었습니다.
        </p>
        {error && <p className="lazygyu-room__error">{error}</p>}
      </section>

      <section className="lazygyu-room__entries">
        <h2>실시간 대기열</h2>
        <div className="lazygyu-room__entry-list">
          {room?.entries?.length ? (
            room.entries.map((entry) => (
              <div className="lazygyu-room__entry-chip" key={entry.id}>
                {entry.displayName}
              </div>
            ))
          ) : (
            <p className="lazygyu-room__empty">아직 들어온 공이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default LazygyuRoomPage;
