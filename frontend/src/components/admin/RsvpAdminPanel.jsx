import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { fetchAdminRsvps } from '../../lib/admin';

const numberFormatter = new Intl.NumberFormat('ko-KR');

const countValue = (value) => numberFormatter.format(value || 0);

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('ko-KR');
};

const labels = {
  side: {
    groom: '신랑측',
    bride: '신부측',
  },
  attendance: {
    yes: '참석',
    no: '불참',
    undecided: '미정',
  },
  meal: {
    yes: '식사함',
    no: '식사 안함',
    undecided: '식사 미정',
  },
  afterPartyAttendance: {
    yes: '애프터파티 참석',
    no: '애프터파티 불참',
    undecided: '애프터파티 미정',
  },
};

const mapLabel = (group, value) => labels[group]?.[value] || value || '-';

const RsvpAdminPanel = ({ accessToken }) => {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await fetchAdminRsvps(accessToken);
        setEntries(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [accessToken]);

  const summary = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => {
          const guests = Number(entry.guests) || 0;

          acc.total += 1;
          acc.attending += entry.attendance === 'yes' ? 1 : 0;
          acc.notAttending += entry.attendance === 'no' ? 1 : 0;
          acc.mealYes += entry.meal === 'yes' ? 1 : 0;
          acc.afterPartyYes += entry.afterPartyAttendance === 'yes' ? 1 : 0;
          acc.totalGuests += entry.attendance === 'yes' ? guests : 0;
          acc.groomSide += entry.side === 'groom' ? 1 : 0;
          acc.brideSide += entry.side === 'bride' ? 1 : 0;

          return acc;
        },
        {
          total: 0,
          attending: 0,
          notAttending: 0,
          mealYes: 0,
          afterPartyYes: 0,
          totalGuests: 0,
          groomSide: 0,
          brideSide: 0,
        },
      ),
    [entries],
  );

  return (
    <div className="admin-panel-stack">
      <section className="admin-shell__panel">
        <div className="admin-panel-heading">
          <div>
            <h3>RSVP 응답 요약</h3>
            <p>참석, 식사, 애프터파티 기준으로 전체 응답을 집계합니다.</p>
          </div>
        </div>
        <div className="admin-overview__stats">
          <article className="admin-metric-card">
            <span className="admin-metric-card__label">총 응답</span>
            <strong>{countValue(summary.total)}</strong>
            <small>누적 RSVP 제출</small>
          </article>
          <article className="admin-metric-card">
            <span className="admin-metric-card__label">참석</span>
            <strong>{countValue(summary.attending)}</strong>
            <small>예식 참석 예정</small>
          </article>
          <article className="admin-metric-card">
            <span className="admin-metric-card__label">식사함</span>
            <strong>{countValue(summary.mealYes)}</strong>
            <small>식사 예정 응답</small>
          </article>
          <article className="admin-metric-card">
            <span className="admin-metric-card__label">예상 인원</span>
            <strong>{countValue(summary.totalGuests)}</strong>
            <small>참석 응답 기준 합계</small>
          </article>
        </div>
        <div className="admin-summary-grid">
          <div className="admin-summary-item">
            <span>신랑측</span>
            <strong>{countValue(summary.groomSide)}</strong>
          </div>
          <div className="admin-summary-item">
            <span>신부측</span>
            <strong>{countValue(summary.brideSide)}</strong>
          </div>
          <div className="admin-summary-item">
            <span>불참</span>
            <strong>{countValue(summary.notAttending)}</strong>
          </div>
          <div className="admin-summary-item">
            <span>애프터파티 참석</span>
            <strong>{countValue(summary.afterPartyYes)}</strong>
          </div>
        </div>
      </section>

      <section className="admin-shell__panel">
        <div className="admin-panel-heading">
          <div>
            <h3>응답 목록</h3>
            <p>{isLoading ? '불러오는 중...' : `최신순으로 ${countValue(entries.length)}건을 표시합니다.`}</p>
          </div>
        </div>

        {error && <p className="admin-shell__error">{error}</p>}
        {!isLoading && entries.length === 0 && (
          <p className="admin-shell__empty">아직 수집된 RSVP 응답이 없습니다.</p>
        )}

        <div className="admin-panel-stack">
          {entries.map((entry) => (
            <article key={entry.id} className="admin-list-card">
              <div className="admin-list-card__top">
                <div>
                  <strong>{entry.name}</strong>
                  <span>{formatDateTime(entry.createdAt)}</span>
                </div>
              </div>
              <div className="admin-rsvp-meta">
                <span className="admin-rsvp-chip">{mapLabel('side', entry.side)}</span>
                <span className="admin-rsvp-chip">{mapLabel('attendance', entry.attendance)}</span>
                <span className="admin-rsvp-chip">{mapLabel('meal', entry.meal)}</span>
                <span className="admin-rsvp-chip">
                  {mapLabel('afterPartyAttendance', entry.afterPartyAttendance)}
                </span>
                <span className="admin-rsvp-chip">
                  동행 {countValue(Number(entry.guests) || 1)}명
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

RsvpAdminPanel.propTypes = {
  accessToken: PropTypes.string.isRequired,
};

export default RsvpAdminPanel;
