import PropTypes from 'prop-types';
import { useState } from 'react';
import { useInvitationConfig } from '../hooks/useInvitationConfig';

const AccountInfo = ({ showToast }) => {
  const { config } = useInvitationConfig();
  const [groomOpen, setGroomOpen] = useState(false);
  const [brideOpen, setBrideOpen] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('계좌번호가 복사되었습니다.');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('계좌번호가 복사되었습니다.');
    });
  };

  const groomAccounts = config.accounts.groom;
  const brideAccounts = config.accounts.bride;

  const ChevronDown = () => (
    <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
      <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const renderAccounts = (accounts) => (
    <div className="account-list">
      {accounts.map((acc) => (
        <div key={`${acc.bank}-${acc.number}`} className="account-row">
          <div className="account-row-info">
            <span className="account-row-bank">{acc.bank}</span>
            <span className="account-row-number">{acc.number}</span>
          </div>
          <div className="account-row-right">
            <span className="account-row-name">{acc.name}</span>
            <button
              className="account-copy-btn"
              onClick={() => copyToClipboard(acc.number)}
              data-analytics-track="copy"
              data-analytics-section="account"
              data-analytics-label={`${acc.bank} ${acc.name}`}
            >
              복사
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="account" data-aos="fade-up">
      <div className="account-inner">
        <div className="account-flower">✿</div>
        <h3 className="section-title">마음 전하실 곳</h3>

        <div className="account-message">
          <p>
            멀리서도 축하의 마음을 전하고 싶으신 분들을 위해
            <br />
            계좌번호를 안내드립니다.
          </p>
        </div>

        <div className="account-sub-message">
          <p>
            소중한 축하를 보내주셔서 감사드리며,
            <br />
            따뜻한 마음에 깊이 감사드립니다.
          </p>
        </div>

        <div className="account-accordion">
          <button
            className={`account-accordion-btn groom-btn ${groomOpen ? 'active' : ''}`}
            onClick={() => setGroomOpen(!groomOpen)}
          >
            <span className="account-accordion-label"><span className="account-side">신랑</span>측</span>
            <ChevronDown />
          </button>
          <div className={`account-accordion-body ${groomOpen ? 'active' : ''}`}>
            {renderAccounts(groomAccounts)}
          </div>
        </div>

        <div className="account-accordion">
          <button
            className={`account-accordion-btn bride-btn ${brideOpen ? 'active' : ''}`}
            onClick={() => setBrideOpen(!brideOpen)}
          >
            <span className="account-accordion-label"><span className="account-side">신부</span>측</span>
            <ChevronDown />
          </button>
          <div className={`account-accordion-body ${brideOpen ? 'active' : ''}`}>
            {renderAccounts(brideAccounts)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountInfo;

AccountInfo.propTypes = {
  showToast: PropTypes.func.isRequired,
};
