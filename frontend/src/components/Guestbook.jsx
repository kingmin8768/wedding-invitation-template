import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

const Guestbook = ({ defaultName, onSubmitSuccess, onWriteOpen, showToast }) => {
  const [entries, setEntries] = useState([]);
  const [writeMode, setWriteMode] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [formData, setFormData] = useState(() => ({
    name: defaultName || '',
    password: '',
    message: '',
  }));

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    if (!defaultName) {
      return;
    }

    setFormData((current) => {
      if (current.name.trim()) {
        return current;
      }

      return {
        ...current,
        name: defaultName,
      };
    });
  }, [defaultName]);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/guestbook');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
        return;
      }
    } catch {
      // fallback to localStorage
    }
    const local = JSON.parse(localStorage.getItem('guestbook') || '[]');
    setEntries(local);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim()) {
      showToast('이름과 메시지를 입력해주세요.');
      return;
    }

    const newEntry = {
      id: Date.now(),
      name: formData.name,
      message: formData.message,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEntry,
          password: formData.password,
        }),
      });
      if (res.ok) {
        fetchEntries();
        setFormData({ name: '', password: '', message: '' });
        setWriteMode(false);
        onSubmitSuccess?.({
          entryId: res.headers.get('x-entry-id') || null,
          name: formData.name,
        });
        showToast('축하 메시지가 등록되었습니다.');
        return;
      }
    } catch {
      // fallback
    }

    const local = JSON.parse(localStorage.getItem('guestbook') || '[]');
    local.unshift(newEntry);
    localStorage.setItem('guestbook', JSON.stringify(local));
    setEntries(local);
    setFormData({ name: '', password: '', message: '' });
    setWriteMode(false);
    onSubmitSuccess?.({
      entryId: newEntry.id,
      name: formData.name,
    });
    showToast('축하 메시지가 등록되었습니다.');
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const visibleEntries = showAll ? entries : entries.slice(0, 5);
  const canExpand = entries.length > 5;

  return (
    <div className="guestbook" data-aos="fade-up">
      <h3 className="section-title">방명록</h3>

      <div className="guestbook-list">
        {visibleEntries.map((entry) => (
          <div key={entry.id} className="guestbook-item">
            <div className="guestbook-item-header">
              <span className="guestbook-item-name">{entry.name}</span>
              <span className="guestbook-item-date">{formatDate(entry.createdAt)}</span>
            </div>
            <p className="guestbook-item-text">{entry.message}</p>
          </div>
        ))}

        {entries.length === 0 && !writeMode && (
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.88rem', marginTop: '20px' }}>
            첫 번째 축하 메시지를 남겨주세요! 💌
          </p>
        )}
      </div>

      {writeMode ? (
        <form onSubmit={handleSubmit} className="guestbook-form" style={{ marginTop: '20px' }}>
          <label>이름</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="이름"
            autoComplete="name"
            required
          />
          <label>비밀번호</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="삭제 시 필요합니다"
            autoComplete="new-password"
            required
          />
          <label>축하 메시지</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="축하 메시지를 남겨주세요"
            autoComplete="off"
            required
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="guestbook-view-all"
              onClick={() => setWriteMode(false)}
              style={{ flex: 1 }}
              data-analytics-track="guestbook_cancel"
              data-analytics-section="guestbook"
              data-analytics-label="취소"
            >
              취소
            </button>
            <button
              type="submit"
              className="guestbook-submit"
              style={{ flex: 1, marginTop: 0 }}
            >
              등록
            </button>
          </div>
        </form>
      ) : (
        <div className="guestbook-btns">
          <button
            className="guestbook-view-all"
            onClick={() => canExpand && setShowAll((prev) => !prev)}
            disabled={!canExpand}
            aria-expanded={showAll}
            data-analytics-track="guestbook_toggle"
            data-analytics-section="guestbook"
            data-analytics-label={showAll ? '접기' : '전체보기'}
          >
            {showAll ? '접기' : '전체보기'}
          </button>
          <button
            className="guestbook-write"
            onClick={() => {
              onWriteOpen?.();
              setWriteMode(true);
            }}
          >
            작성
          </button>
        </div>
      )}
    </div>
  );
};

Guestbook.propTypes = {
  defaultName: PropTypes.string,
  onSubmitSuccess: PropTypes.func,
  onWriteOpen: PropTypes.func,
  showToast: PropTypes.func.isRequired,
};

Guestbook.defaultProps = {
  defaultName: '',
  onSubmitSuccess: undefined,
  onWriteOpen: undefined,
};

export default Guestbook;
