import { useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import AdminLogsPanel from '../components/admin/AdminLogsPanel';
import AdminOverviewPanel from '../components/admin/AdminOverviewPanel';
import AssetAdminPanel from '../components/admin/AssetAdminPanel';
import InvitationMediaAdminPanel from '../components/admin/InvitationMediaAdminPanel';
import InvitationSettingsAdminPanel from '../components/admin/InvitationSettingsAdminPanel';
import GuestbookAdminPanel from '../components/admin/GuestbookAdminPanel';
import RsvpAdminPanel from '../components/admin/RsvpAdminPanel';
import SharedPhotoAdminPanel from '../components/admin/SharedPhotoAdminPanel';
import LazygyuAdminPanel from '../components/admin/LazygyuAdminPanel';
import GamesAdminPanel from '../components/admin/GamesAdminPanel';
import { useAuth } from '../hooks/useAuth';
import { getAdminOverview } from '../lib/auth';
import { createLazygyuRoomSocket, fetchRouletteState } from '../lib/games';

const sections = [
  {
    slug: 'overview',
    label: '대시보드',
    summary: '운영 현황과 승인 대기 항목을 모아보는 공간입니다.',
  },
  {
    slug: 'settings',
    label: '청첩장 내용 설정',
    summary: '신랑·신부, 예식 일시·장소, 계좌번호, 교통 안내를 코드 수정 없이 바로 편집합니다.',
  },
  {
    slug: 'logs',
    label: '행동 로그',
    summary: '이벤트 필터 검색과 CSV 내보내기를 지원합니다.',
  },
  {
    slug: 'guestbook',
    label: '방명록 관리',
    summary: '숨김, 복원, 운영 메모가 들어갈 자리입니다.',
  },
  {
    slug: 'rsvp',
    label: 'RSVP 관리',
    summary: '참석, 식사, 애프터파티 응답을 집계해서 확인합니다.',
  },
  {
    slug: 'photos',
    label: '사진 관리',
    summary: '업로드 승인과 노출 상태를 정리할 섹션입니다.',
  },
  {
    slug: 'assets',
    label: '자료 업로드',
    summary: '청첩장에 노출할 PDF, 이미지, 안내 자료를 관리합니다.',
  },
  {
    slug: 'invitation-media',
    label: '청첩장 이미지 관리',
    summary: '메인, 소개, 갤러리, 푸터 이미지를 슬롯별로 관리합니다.',
  },
  {
    slug: 'events',
    label: '이벤트 탭',
    summary: '랜덤게임과 운영 이벤트 UI를 배치할 자리입니다.',
  },
];

const AdminPage = () => {
  const { section } = useParams();
  const { signOut, tokens, user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchOverview = async () => {
      if (!tokens?.accessToken) {
        return;
      }

      try {
        const data = await getAdminOverview(tokens.accessToken);
        setOverview(data);
      } catch (error) {
        setLoadError(error.message);
      }
    };

    fetchOverview();
    fetchRouletteState().then(setGameState).catch(() => {});
  }, [tokens]);

  useEffect(() => {
    if (!tokens?.accessToken) {
      return undefined;
    }

    const socket = createLazygyuRoomSocket((_eventType, payload) => {
      if (payload?.state) {
        setGameState(payload.state);
      }
    });

    socket.on('connect_error', () => {
      fetchRouletteState().then(setGameState).catch(() => {});
    });

    return () => {
      socket.disconnect();
    };
  }, [tokens?.accessToken]);

  const handleLogout = async () => {
    await signOut();
  };

  const activeSection = section || 'overview';
  const activeSectionData = sections.find((item) => item.slug === activeSection) || sections[0];

  return (
    <div className="admin-shell">
      <div className="admin-shell__header">
        <div>
          <p className="auth-kicker">Wedding Invitation Admin</p>
          <h1 className="admin-shell__title">관리자 페이지</h1>
          <p className="admin-shell__helper">
            운영 지표, 행동 로그, 승인 대기 항목을 한 곳에서 관리합니다.
          </p>
        </div>
        <div className="admin-shell__actions">
          <Link className="admin-shell__link" to="/">
            청첩장 보기
          </Link>
          <button className="admin-shell__logout" onClick={handleLogout} type="button">
            로그아웃
          </button>
        </div>
      </div>

      <div className="admin-shell__profile">
        <div>
          <span className="admin-shell__label">현재 로그인</span>
          <strong>{user?.email?.split('@')[0] || '관리자'}</strong>
        </div>
        <div>
          <span className="admin-shell__label">이메일</span>
          <strong>{user?.email || '-'}</strong>
        </div>
        <div>
          <span className="admin-shell__label">권한</span>
          <strong>{user?.role || 'admin'}</strong>
        </div>
      </div>

      <div className="admin-shell__layout">
        <nav aria-label="관리자 메뉴" className="admin-shell__nav">
          {sections.map((section) => (
            <NavLink
              key={section.slug}
              className={({ isActive }) =>
                `admin-shell__nav-link ${isActive ? 'active' : ''}`
              }
              end={section.slug === 'overview'}
              to={section.slug === 'overview' ? '/admin' : `/admin/${section.slug}`}
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        <section className="admin-shell__content">
          <div className="admin-shell__panel">
            <h2>{activeSectionData.label}</h2>
            <p>{activeSectionData.summary}</p>
            {loadError && <p className="admin-shell__error">{loadError}</p>}
            {!loadError && overview && (
              <ul className="admin-shell__summary-list">
                <li>{overview.message}</li>
                <li>활성 섹션: {Array.isArray(overview.sections) ? overview.sections.join(', ') : '-'}</li>
                <li>로그인 계정: {overview.user?.email || '-'}</li>
              </ul>
            )}
          </div>

          {activeSection === 'guestbook' && tokens?.accessToken && (
            <GuestbookAdminPanel accessToken={tokens.accessToken} />
          )}

          {activeSection === 'rsvp' && tokens?.accessToken && (
            <RsvpAdminPanel accessToken={tokens.accessToken} />
          )}

          {activeSection === 'overview' && <AdminOverviewPanel overview={overview} />}

          {activeSection === 'settings' && tokens?.accessToken && (
            <InvitationSettingsAdminPanel accessToken={tokens.accessToken} />
          )}

          {activeSection === 'events' && <LazygyuAdminPanel hostLink="/host/lazygyu" />}

          {activeSection === 'logs' && tokens?.accessToken && (
            <AdminLogsPanel accessToken={tokens.accessToken} />
          )}

          {activeSection === 'assets' && tokens?.accessToken && (
            <AssetAdminPanel accessToken={tokens.accessToken} />
          )}

          {activeSection === 'photos' && tokens?.accessToken && (
            <SharedPhotoAdminPanel accessToken={tokens.accessToken} />
          )}

          {activeSection === 'invitation-media' && tokens?.accessToken && (
            <InvitationMediaAdminPanel accessToken={tokens.accessToken} />
          )}

          {activeSection === 'events' && tokens?.accessToken && (
            <GamesAdminPanel
              accessToken={tokens.accessToken}
              state={gameState}
              onStateChange={setGameState}
            />
          )}

          {activeSection === 'overview' && (
            <div className="admin-shell__grid">
              {sections.map((section) => (
                <article className="admin-shell__card" key={section.slug}>
                  <span className="admin-shell__card-tag">{section.label}</span>
                  <p>{section.summary}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminPage;
