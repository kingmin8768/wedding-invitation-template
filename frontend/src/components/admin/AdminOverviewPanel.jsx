import PropTypes from 'prop-types';

const numberFormatter = new Intl.NumberFormat('ko-KR');

const formatCount = (value) => numberFormatter.format(value || 0);

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AdminOverviewPanel = ({ overview = null }) => {
  const kpis = overview?.metrics?.events;
  const content = overview?.metrics?.content;

  if (!overview || !kpis || !content) {
    return null;
  }

  return (
    <div className="admin-overview">
      <div className="admin-overview__stats">
        <article className="admin-metric-card">
          <span className="admin-metric-card__label">총 이벤트</span>
          <strong>{formatCount(kpis.totalEvents)}</strong>
          <small>누적 행동 로그</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-card__label">최근 24시간</span>
          <strong>{formatCount(kpis.last24hEvents)}</strong>
          <small>하루 기준 수집 로그</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-card__label">최근 7일 세션</span>
          <strong>{formatCount(kpis.uniqueSessionsLast7d)}</strong>
          <small>고유 세션 수</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-card__label">RSVP 응답</span>
          <strong>{formatCount(content.rsvpTotal)}</strong>
          <small>누적 참석 전달</small>
        </article>
      </div>

      <div className="admin-overview__grid">
        <section className="admin-shell__panel admin-shell__panel--wide">
          <div className="admin-panel-heading">
            <div>
              <h3>운영 요약</h3>
              <p>승인 대기와 공개 콘텐츠 현황을 한 번에 봅니다.</p>
            </div>
          </div>
          <div className="admin-summary-grid">
            <div className="admin-summary-item">
              <span>승인 대기 사진</span>
              <strong>{formatCount(content.sharedPhotoPending)}</strong>
            </div>
            <div className="admin-summary-item">
              <span>공개 사진</span>
              <strong>{formatCount(content.sharedPhotoApproved)}</strong>
            </div>
            <div className="admin-summary-item">
              <span>방명록 전체</span>
              <strong>{formatCount(content.guestbookTotal)}</strong>
            </div>
            <div className="admin-summary-item">
              <span>숨김 방명록</span>
              <strong>{formatCount(content.guestbookHidden)}</strong>
            </div>
            <div className="admin-summary-item">
              <span>안내 자료</span>
              <strong>{formatCount(content.invitationAssets)}</strong>
            </div>
            <div className="admin-summary-item">
              <span>청첩장 슬롯 이미지</span>
              <strong>{formatCount(content.invitationMediaAssets)}</strong>
            </div>
          </div>
        </section>

        <section className="admin-shell__panel">
          <div className="admin-panel-heading">
            <div>
              <h3>상위 이벤트</h3>
              <p>가장 많이 발생한 행동 유형입니다.</p>
            </div>
          </div>
          <div className="admin-rank-list">
            {(kpis.topEventTypes || []).map((item) => (
              <div className="admin-rank-row" key={item.eventType}>
                <span>{item.eventType}</span>
                <strong>{formatCount(item.count)}</strong>
              </div>
            ))}
            {(!kpis.topEventTypes || kpis.topEventTypes.length === 0) && (
              <p className="admin-shell__empty">아직 수집된 로그가 없습니다.</p>
            )}
          </div>
        </section>

        <section className="admin-shell__panel">
          <div className="admin-panel-heading">
            <div>
              <h3>상위 섹션</h3>
              <p>어떤 섹션이 가장 많이 조회됐는지 보여줍니다.</p>
            </div>
          </div>
          <div className="admin-rank-list">
            {(kpis.topSections || []).map((item) => (
              <div className="admin-rank-row" key={item.section}>
                <span>{item.section || '미지정'}</span>
                <strong>{formatCount(item.count)}</strong>
              </div>
            ))}
            {(!kpis.topSections || kpis.topSections.length === 0) && (
              <p className="admin-shell__empty">섹션 조회 로그가 아직 없습니다.</p>
            )}
          </div>
        </section>

        <section className="admin-shell__panel admin-shell__panel--wide">
          <div className="admin-panel-heading">
            <div>
              <h3>최근 활동</h3>
              <p>최근 수집된 사용자 행동 로그입니다.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>시각</th>
                  <th>이벤트</th>
                  <th>섹션</th>
                  <th>액션</th>
                  <th>라벨</th>
                  <th>세션</th>
                </tr>
              </thead>
              <tbody>
                {(kpis.recentEvents || []).map((event) => (
                  <tr key={event.id}>
                    <td>{formatDateTime(event.createdAt)}</td>
                    <td>{event.eventType}</td>
                    <td>{event.section || '-'}</td>
                    <td>{event.action || '-'}</td>
                    <td>{event.label || '-'}</td>
                    <td>{event.sessionId || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!kpis.recentEvents || kpis.recentEvents.length === 0) && (
              <p className="admin-shell__empty">최근 활동이 없습니다.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

AdminOverviewPanel.propTypes = {
  overview: PropTypes.shape({
    metrics: PropTypes.shape({
      content: PropTypes.object,
      events: PropTypes.shape({
        totalEvents: PropTypes.number,
        last24hEvents: PropTypes.number,
        uniqueSessionsLast7d: PropTypes.number,
        topEventTypes: PropTypes.arrayOf(
          PropTypes.shape({
            eventType: PropTypes.string,
            count: PropTypes.number,
          }),
        ),
        topSections: PropTypes.arrayOf(
          PropTypes.shape({
            section: PropTypes.string,
            count: PropTypes.number,
          }),
        ),
        recentEvents: PropTypes.arrayOf(PropTypes.object),
      }),
    }),
  }),
};

export default AdminOverviewPanel;
