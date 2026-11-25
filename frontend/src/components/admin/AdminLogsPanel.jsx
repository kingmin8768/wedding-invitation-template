import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { downloadAdminEventLogsCsv, fetchAdminEventLogs } from '../../lib/eventLogs';

const initialFilters = {
  eventType: '',
  section: '',
  action: '',
  search: '',
  from: '',
  to: '',
  page: 1,
  pageSize: 20,
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('ko-KR');
};

const AdminLogsPanel = ({ accessToken }) => {
  const [filters, setFilters] = useState(initialFilters);
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const loadLogs = useCallback(async (nextFilters) => {
    try {
      setIsLoading(true);
      setError('');
      const data = await fetchAdminEventLogs(accessToken, nextFilters);
      setLogs(data.items || []);
      setMeta(data.meta || null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadLogs(initialFilters);
  }, [loadLogs]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFilters = {
      eventType: String(formData.get('eventType') || ''),
      section: String(formData.get('section') || ''),
      action: String(formData.get('action') || ''),
      search: String(formData.get('search') || ''),
      from: String(formData.get('from') || ''),
      to: String(formData.get('to') || ''),
      pageSize: filters.pageSize,
      page: 1,
    };
    setFilters(nextFilters);
    await loadLogs(nextFilters);
  };

  const handlePageChange = async (nextPage) => {
    const nextFilters = {
      ...filters,
      page: nextPage,
    };
    setFilters(nextFilters);
    await loadLogs(nextFilters);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError('');
      await downloadAdminEventLogsCsv(accessToken, filters);
    } catch (exportError) {
      setError(exportError.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="admin-logs">
      <section className="admin-shell__panel">
        <div className="admin-panel-heading">
          <div>
            <h3>행동 로그 조회</h3>
            <p>이벤트 유형, 섹션, 기간, 검색어로 운영 로그를 조회합니다.</p>
          </div>
          <button
            type="button"
            className="admin-shell__logout"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? '내보내는 중...' : 'CSV 내보내기'}
          </button>
        </div>

        <form className="admin-filter-form" onSubmit={handleSubmit}>
          <label>
            <span>이벤트</span>
            <input
              name="eventType"
              type="text"
              value={filters.eventType}
              onChange={handleChange}
              placeholder="page_view, click"
            />
          </label>
          <label>
            <span>섹션</span>
            <input
              name="section"
              type="text"
              value={filters.section}
              onChange={handleChange}
              placeholder="gallery, guestbook"
            />
          </label>
          <label>
            <span>액션</span>
            <input
              name="action"
              type="text"
              value={filters.action}
              onChange={handleChange}
              placeholder="open, submit"
            />
          </label>
          <label>
            <span>검색어</span>
            <input
              name="search"
              type="text"
              value={filters.search}
              onChange={handleChange}
              placeholder="세션, 라벨, 경로 검색"
            />
          </label>
          <label>
            <span>시작일</span>
            <input name="from" type="date" value={filters.from} onChange={handleChange} />
          </label>
          <label>
            <span>종료일</span>
            <input name="to" type="date" value={filters.to} onChange={handleChange} />
          </label>
          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? '조회 중...' : '로그 조회'}
          </button>
        </form>

        {error && <p className="admin-shell__error">{error}</p>}
      </section>

      <section className="admin-shell__panel">
        <div className="admin-panel-heading">
          <div>
            <h3>조회 결과</h3>
            <p>
              {meta
                ? `총 ${meta.total}건 중 ${meta.page} / ${meta.totalPages} 페이지`
                : '로그를 불러오고 있습니다.'}
            </p>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table admin-table--logs">
            <thead>
              <tr>
                <th>시각</th>
                <th>이벤트</th>
                <th>섹션</th>
                <th>액션</th>
                <th>라벨</th>
                <th>경로</th>
                <th>세션</th>
                <th>사용자</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>{item.eventType}</td>
                  <td>{item.section || '-'}</td>
                  <td>{item.action || '-'}</td>
                  <td>{item.label || '-'}</td>
                  <td>{item.path || '-'}</td>
                  <td>{item.sessionId || '-'}</td>
                  <td>{item.userName || item.userEmail || '비회원'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && logs.length === 0 && (
            <p className="admin-shell__empty">조건에 맞는 로그가 없습니다.</p>
          )}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="admin-pagination">
            <button
              type="button"
              onClick={() => handlePageChange(meta.page - 1)}
              disabled={meta.page <= 1 || isLoading}
            >
              이전
            </button>
            <span>
              {meta.page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages || isLoading}
            >
              다음
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

AdminLogsPanel.propTypes = {
  accessToken: PropTypes.string.isRequired,
};

export default AdminLogsPanel;
