import PropTypes from 'prop-types';
import { INVITATION_CONFIG } from '../config/invitationConfig';

const RsvpModal = ({ isOpen, onClose, onDismissToday }) => {
  const { couple, wedding, venue } = INVITATION_CONFIG;
  const infoRows = [
    {
      icon: '♡',
      content: (
        <>
          <span className="modal-info-person modal-info-person--groom">신랑</span> {couple.groom.fullName},&nbsp;
          <span className="modal-info-person modal-info-person--bride">신부</span> {couple.bride.fullName}
        </>
      ),
    },
    { icon: '◷', content: wedding.displayDate },
    { icon: '⌖', content: `${venue.name} ${venue.floor}` },
  ];

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="참석 여부 전달 팝업 닫기">
          ×
        </button>

        <div className="modal-body">
          <h3 className="modal-title">참석 여부 전달</h3>

          <p className="modal-desc">
            소중한 시간을 내어 결혼식에 참석해주시는 모든 분들께 감사드립니다.<br />
            참석 여부를 미리 전달해주시면<br />
            예식 준비에 큰 도움이 됩니다.
          </p>

          <hr className="modal-divider" />

          <div className="modal-info-list">
            {infoRows.map((row) => (
              <div key={row.icon} className="modal-info-row">
                <span className="modal-info-icon" aria-hidden="true">{row.icon}</span>
                <div className="modal-info-text">{row.content}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="modal-btn"
            onClick={() => {
              const el = document.getElementById('rsvp');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
              onClose();
            }}
          >
            참석 여부 전달
          </button>

          <label className="modal-dismiss">
            <input type="checkbox" onChange={onDismissToday} />
            <span className="modal-dismiss__check">✓</span>
            <span>오늘하루 보지않기</span>
          </label>
        </div>
      </div>
    </div>
  );
};

RsvpModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDismissToday: PropTypes.func.isRequired,
};

export default RsvpModal;
