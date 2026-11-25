import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { fetchAdminGuestbook, updateGuestbookVisibility } from '../../lib/admin';

const GuestbookAdminPanel = ({ accessToken }) => {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEntries = async () => {
      try {
        setError('');
        const data = await fetchAdminGuestbook(accessToken);
        setEntries(data);
      } catch (loadError) {
        setError(loadError.message);
      }
    };

    loadEntries();
  }, [accessToken]);

  const handleVisibility = async (entry) => {
    try {
      await updateGuestbookVisibility(entry.id, !entry.isHidden, accessToken);
      const data = await fetchAdminGuestbook(accessToken);
      setEntries(data);
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  return (
    <div className="admin-panel-stack">
      {error && <p className="admin-shell__error">{error}</p>}
      {entries.map((entry) => (
        <article key={entry.id} className="admin-list-card">
          <div className="admin-list-card__top">
            <div>
              <strong>{entry.name}</strong>
              <span>{new Date(entry.createdAt).toLocaleString('ko-KR')}</span>
            </div>
            <button type="button" onClick={() => handleVisibility(entry)}>
              {entry.isHidden ? '복원' : '숨김'}
            </button>
          </div>
          <p>{entry.message}</p>
          <small>{entry.isHidden ? '현재 공개 화면에서 숨김 처리됨' : '현재 공개 화면에 노출 중'}</small>
        </article>
      ))}
      {entries.length === 0 && <p className="admin-shell__empty">아직 등록된 방명록이 없습니다.</p>}
    </div>
  );
};

GuestbookAdminPanel.propTypes = {
  accessToken: PropTypes.string.isRequired,
};

export default GuestbookAdminPanel;
