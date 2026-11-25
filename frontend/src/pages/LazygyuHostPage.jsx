import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LazygyuAdminPanel from '../components/admin/LazygyuAdminPanel';
import { LazygyuRoomAdapter } from '../features/games/roulette/lazygyuRoomAdapter';
import {
  createLazygyuEventStream,
  finishLazygyuRound,
  getLazygyuAdminState,
  stopLazygyuStream,
  uploadLazygyuFrame,
} from '../lib/lazygyuRoom';
import { toRouletteWinnerRank } from '../lib/lazygyuWinnerRank.js';

const FRAME_INTERVAL_MS = 66;
const FRAME_TARGET_WIDTH = 960;
const FRAME_QUALITY = 0.64;

const waitForBoardPaint = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });

const getSourceEntries = (room) => {
  if (
    (room?.status === 'running' || room?.status === 'finished') &&
    Array.isArray(room?.snapshotEntries) &&
    room.snapshotEntries.length > 0
  ) {
    return room.snapshotEntries;
  }

  if (
    (room?.status === 'running' || room?.status === 'finished') &&
    Array.isArray(room?.roundSnapshot) &&
    room.roundSnapshot.length > 0
  ) {
    return room.roundSnapshot;
  }

  return room?.entries || [];
};

const getEntryNames = (room) =>
  getSourceEntries(room).map((entry) =>
    typeof entry === 'string' ? entry : entry.displayName,
  );

const LazygyuHostPage = () => {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [boardReady, setBoardReady] = useState(false);

  const boardMountRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const adapterRef = useRef(null);
  const uploadLoopRef = useRef(0);
  const uploadBusyRef = useRef(false);

  const pushFrame = useCallback(async () => {
    const adapter = adapterRef.current;
    const captureCanvas = captureCanvasRef.current;

    if (!adapter || !captureCanvas) {
      throw new Error('호스트 보드 캔버스를 찾지 못했습니다.');
    }

    await adapter.waitUntilReady();
    const sourceCanvas = adapter.getCanvas();
    if (!sourceCanvas) {
      throw new Error('호스트 보드 캔버스를 찾지 못했습니다.');
    }

    const context = captureCanvas.getContext('2d');
    if (!context) {
      throw new Error('프레임 캡처용 캔버스를 준비하지 못했습니다.');
    }

    const scale = FRAME_TARGET_WIDTH / sourceCanvas.width;
    captureCanvas.width = FRAME_TARGET_WIDTH;
    captureCanvas.height = Math.max(720, Math.round(sourceCanvas.height * scale));
    context.drawImage(sourceCanvas, 0, 0, captureCanvas.width, captureCanvas.height);

    const blob = await new Promise((resolve) => {
      captureCanvas.toBlob(resolve, 'image/jpeg', FRAME_QUALITY);
    });

    if (blob) {
      await uploadLazygyuFrame(blob, 'lazygyu-host.jpg');
    }
  }, []);

  const syncBoard = useCallback(async (nextRoom) => {
    const adapter = adapterRef.current;
    if (!adapter || !nextRoom) {
      return;
    }

    const names = getEntryNames(nextRoom);
    const winnerRank = toRouletteWinnerRank(nextRoom.activeWinnerRank);
    adapter.setSkillsEnabled(nextRoom.skillsEnabled);
    adapter.setWinnerRank(winnerRank);

    if (nextRoom.status === 'running') {
      await adapter.startRound({
        roundId: nextRoom.version || nextRoom.updatedAt || 'running',
        seed: `${nextRoom.version || nextRoom.updatedAt || 'lazygyu'}`,
        snapshotEntries: names,
        winnerRank,
      });
      return;
    }

    if (nextRoom.status === 'finished') {
      return;
    }

    await adapter.resetRoom(names);
  }, []);

  useEffect(() => {
    const target = boardMountRef.current;
    if (!target) {
      return undefined;
    }

    const adapter = new LazygyuRoomAdapter();
    adapter.mount(target);
    adapterRef.current = adapter;

    const removeGoalListener = adapter.addGoalListener(async (event) => {
      const winnerName = event?.detail?.winner?.trim?.();
      if (!winnerName) {
        return;
      }

      try {
        await finishLazygyuRound(winnerName);
      } catch (finishError) {
        setError(finishError.message);
      }
    });

    adapter
      .waitUntilReady()
      .then(() => setBoardReady(true))
      .catch((readyError) => setError(readyError.message));

    return () => {
      removeGoalListener();
      adapter.destroy();
      adapterRef.current = null;
      setBoardReady(false);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const events = createLazygyuEventStream();

    const load = async () => {
      try {
        const state = await getLazygyuAdminState();
        if (!ignore) {
          setRoom(state);
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
      } catch {
        load().catch(() => {});
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

  useEffect(() => {
    if (!boardReady || !room) {
      return;
    }

    syncBoard(room).catch((syncError) => {
      setError(syncError.message);
    });
  }, [boardReady, room, syncBoard]);

  useEffect(
    () => () => {
      if (uploadLoopRef.current) {
        window.clearInterval(uploadLoopRef.current);
      }
      void stopLazygyuStream().catch(() => {});
    },
    [],
  );

  const stopRelay = async () => {
    if (uploadLoopRef.current) {
      window.clearInterval(uploadLoopRef.current);
      uploadLoopRef.current = 0;
    }

    setStreaming(false);

    try {
      await stopLazygyuStream();
    } catch (stopError) {
      setError(stopError.message);
    }
  };

  const startRelay = async () => {
    setError('');

    try {
      const latestRoom = await getLazygyuAdminState();
      setRoom(latestRoom);
      await syncBoard(latestRoom);
      await waitForBoardPaint();
      await pushFrame();

      if (uploadLoopRef.current) {
        window.clearInterval(uploadLoopRef.current);
      }

      uploadLoopRef.current = window.setInterval(() => {
        if (uploadBusyRef.current) {
          return;
        }

        uploadBusyRef.current = true;
        pushFrame()
          .catch((captureError) => {
            setError(captureError.message);
          })
          .finally(() => {
            uploadBusyRef.current = false;
          });
      }, FRAME_INTERVAL_MS);

      setStreaming(true);
    } catch (startError) {
      setError(startError.message);
    }
  };

  const boardNames = getEntryNames(room);

  return (
    <div className="lazygyu-host">
      <header className="lazygyu-host__header">
        <div>
          <span className="lazygyu-room__eyebrow">Official Relay Host</span>
          <h1>원본 lazygyu 호스트 화면</h1>
          <p>이 페이지가 호스트 보드를 직접 실행하고, 참가자들에게 같은 공식 화면을 송출합니다.</p>
        </div>
        <div className="lazygyu-host__links">
          <Link to="/games/lazygyu">시청 화면</Link>
          <Link to="/admin/events">관리자 제어</Link>
        </div>
      </header>

      <div className="lazygyu-host__toolbar">
        <button
          disabled={!boardReady || (!streaming && !room)}
          onClick={streaming ? stopRelay : startRelay}
          type="button"
        >
          {streaming ? '송출 중지' : '송출 시작'}
        </button>
        <span>현재 룸 상태: {room?.status || 'loading'}</span>
        <span>공 개수: {room?.entries?.length || 0}</span>
        <span>공식 당첨 순위: {room?.activeWinnerRank || 1}번째</span>
        <span>보드: {boardReady ? '준비됨' : '준비 중'}</span>
      </div>

      {error && <p className="lazygyu-room__error">{error}</p>}

      <div className="lazygyu-host__stage lazygyu-host__stage--engine">
        <div className="lazygyu-board">
          <div className="lazygyu-board__topline">
            <div>
              <strong>lazygyu live</strong>
            </div>
          </div>
          <div className="lazygyu-board__canvas" ref={boardMountRef} />
          <div className="lazygyu-board__bottomline">
            <span>현재 누적 공 {boardNames.length}개</span>
            {room?.officialWinnerName && <span>공식 결과: {room.officialWinnerName}</span>}
          </div>
        </div>
        <canvas className="lazygyu-host__capture-canvas" ref={captureCanvasRef} />
      </div>

      <section className="lazygyu-host__notes">
        <h2>운영 메모</h2>
        <ul>
          <li>이 호스트 페이지를 노트북 또는 태블릿에서 열어두면 lazygyu 보드가 직접 실행됩니다.</li>
          <li>관리자는 휴대폰의 `/admin/events`에서 공 투입 on/off, 시작, 스킬, 당첨 순위를 제어합니다.</li>
          <li>참가자는 `/games/lazygyu`에서 같은 공식 화면을 보고 이름으로 공을 추가합니다.</li>
        </ul>
      </section>

      <section className="lazygyu-host__controls">
        <div className="lazygyu-host__controls-head">
          <div>
            <span className="lazygyu-room__eyebrow">Live Control Console</span>
            <h2>현장 운영 제어</h2>
            <p>송출 화면을 보면서 바로 공 투입, 추첨 시작, 결과 확정, 리셋까지 처리할 수 있습니다.</p>
          </div>
          <Link to="/admin/events">보조 관리자 화면</Link>
        </div>
        <LazygyuAdminPanel showHero={false} />
      </section>
    </div>
  );
};

export default LazygyuHostPage;
