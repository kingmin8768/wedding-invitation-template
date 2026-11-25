import PropTypes from 'prop-types';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { getVisitorName, persistVisitorName } from '../lib/visitorSession';

const RsvpSection = ({ onOpenForm, onSubmitSuccess, showAfterPartyAttendance }) => {
  const [showForm, setShowForm] = useState(false);
  const [showPrivacyDetail, setShowPrivacyDetail] = useState(false);
  const [formData, setFormData] = useState({
    side: 'groom',
    attendance: 'yes',
    afterPartyAttendance: 'undecided',
    meal: 'undecided',
    name: getVisitorName(),
    privacyAgreed: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      return;
    }
    if (!formData.privacyAgreed) {
      alert('개인정보 수집 및 활용에 동의해주세요.');
      return;
    }

    try {
      await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } catch {
      const existing = JSON.parse(localStorage.getItem('rsvp_list') || '[]');
      existing.push({ ...formData, createdAt: new Date().toISOString() });
      localStorage.setItem('rsvp_list', JSON.stringify(existing));
    }

    setSubmitted(true);
    setShowForm(false);
    const visitorName = persistVisitorName(formData.name);
    onSubmitSuccess?.({
      attendance: formData.attendance,
      name: visitorName,
    });
  };

  const modal = (
    <div className="rsvp-modal-overlay active" onClick={() => setShowForm(false)}>
      <div className="rsvp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rsvp-modal-header">
          <span className="rsvp-modal-title">참석 여부 전달</span>
          <button
            className="rsvp-modal-close"
            onClick={() => setShowForm(false)}
            aria-label="참석 여부 전달 폼 닫기"
            data-analytics-track="rsvp_close"
            data-analytics-section="rsvp"
            data-analytics-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="rsvp-modal-divider" />

        <form id="rsvpFormInner" onSubmit={handleSubmit} className="rsvp-form">
          <div className="rsvp-field">
            <label className="rsvp-label">
              어느 측 하객이신가요? <span className="required">*</span>
            </label>
            <div className="rsvp-pill-group">
              <button
                type="button"
                className={`rsvp-pill ${formData.side === 'groom' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, side: 'groom' })}
              >
                신랑
              </button>
              <button
                type="button"
                className={`rsvp-pill ${formData.side === 'bride' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, side: 'bride' })}
              >
                신부
              </button>
            </div>
          </div>

          <div className="rsvp-field">
            <label className="rsvp-label">
              참석여부 <span className="required">*</span>
            </label>
            <div className="rsvp-pill-group">
              <button
                type="button"
                className={`rsvp-pill ${formData.attendance === 'yes' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, attendance: 'yes' })}
                data-analytics-track="rsvp_toggle"
                data-analytics-section="rsvp"
                data-analytics-label="참석"
              >
                참석
              </button>
              <button
                type="button"
                className={`rsvp-pill ${formData.attendance === 'no' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, attendance: 'no' })}
                data-analytics-track="rsvp_toggle"
                data-analytics-section="rsvp"
                data-analytics-label="불참석"
              >
                불참석
              </button>
            </div>
          </div>

          {showAfterPartyAttendance && (
            <div className="rsvp-field">
              <label className="rsvp-label">
                애프터 파티 참석 여부 <span className="required">*</span>
              </label>
              <div className="rsvp-pill-group rsvp-pill-group--triple">
                <button
                  type="button"
                  className={`rsvp-pill ${formData.afterPartyAttendance === 'yes' ? 'active' : ''}`}
                  onClick={() =>
                    setFormData({ ...formData, afterPartyAttendance: 'yes' })
                  }
                >
                  참석
                </button>
                <button
                  type="button"
                  className={`rsvp-pill ${formData.afterPartyAttendance === 'no' ? 'active' : ''}`}
                  onClick={() =>
                    setFormData({ ...formData, afterPartyAttendance: 'no' })
                  }
                >
                  불참석
                </button>
                <button
                  type="button"
                  className={`rsvp-pill ${formData.afterPartyAttendance === 'undecided' ? 'active' : ''}`}
                  onClick={() =>
                    setFormData({ ...formData, afterPartyAttendance: 'undecided' })
                  }
                >
                  미정
                </button>
              </div>
            </div>
          )}

          <div className="rsvp-field">
            <label className="rsvp-label">
              식사여부 <span className="required">*</span>
            </label>
            <div className="rsvp-pill-group rsvp-pill-group--triple">
              <button
                type="button"
                className={`rsvp-pill ${formData.meal === 'yes' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, meal: 'yes' })}
              >
                식사함
              </button>
              <button
                type="button"
                className={`rsvp-pill ${formData.meal === 'no' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, meal: 'no' })}
              >
                식사 안함
              </button>
              <button
                type="button"
                className={`rsvp-pill ${formData.meal === 'undecided' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, meal: 'undecided' })}
              >
                미정
              </button>
            </div>
          </div>

          <div className="rsvp-field">
            <label className="rsvp-label">
              성함 <span className="required">*</span>
            </label>
            <input
              type="text"
              className="rsvp-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <label className="rsvp-privacy">
            <input
              type="checkbox"
              checked={formData.privacyAgreed}
              onChange={(e) => setFormData({ ...formData, privacyAgreed: e.target.checked })}
            />
            <span>개인정보 수집 및 활용 동의</span>
            <button
              type="button"
              className="rsvp-privacy-detail"
              onClick={() => setShowPrivacyDetail((prev) => !prev)}
              aria-expanded={showPrivacyDetail}
              data-analytics-track="rsvp_privacy_detail"
              data-analytics-section="rsvp"
              data-analytics-label="자세히보기"
            >
              [자세히보기]
            </button>
          </label>

          {showPrivacyDetail && (
            <div className="rsvp-privacy-note">
              참석 여부 확인과 예식 준비를 위해 성함과 참석 정보만 수집하며, 별도 안내 목적 외에는 사용하지 않습니다.
            </div>
          )}
        </form>

        <div className="rsvp-form-footer">
          <button className="rsvp-submit-btn" type="submit" form="rsvpFormInner">
            전달
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rsvp-section" data-aos="fade-up">
      <h3 className="section-title">참석 여부 전달</h3>

      <div className="rsvp-desc">
        <p>
          소중한 시간을 내어 결혼식에 참석해주시는
          <br />
          모든 분들께 감사드립니다.
        </p>
        <p>
          참석 여부를 미리 전달해주시면
          <br />
          예식 준비에 큰 도움이 됩니다.
        </p>
      </div>

      {submitted ? (
        <p style={{ color: 'var(--color-primary)', marginTop: '20px', fontFamily: 'var(--font-title)' }}>
          참석 여부가 전달되었습니다. 감사합니다! 💕
        </p>
      ) : !showForm ? (
        <button
          className="rsvp-open-btn"
          onClick={() => {
            onOpenForm?.();
            setShowForm(true);
          }}
        >
          참석 여부 전달
        </button>
      ) : (
        createPortal(modal, document.body)
      )}
    </div>
  );
};

RsvpSection.propTypes = {
  onOpenForm: PropTypes.func,
  onSubmitSuccess: PropTypes.func,
  showAfterPartyAttendance: PropTypes.bool,
};

RsvpSection.defaultProps = {
  onOpenForm: undefined,
  onSubmitSuccess: undefined,
  showAfterPartyAttendance: false,
};

export default RsvpSection;
