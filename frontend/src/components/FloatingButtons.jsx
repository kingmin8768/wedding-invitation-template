import PropTypes from 'prop-types';
import { useInvitationConfig } from '../hooks/useInvitationConfig';

const FloatingButtons = ({ onScrollTopClick, onShareResult, showToast }) => {
  const { config } = useInvitationConfig();

  const scrollToTop = () => {
    onScrollTopClick?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = async () => {
    const shareData = {
      title: config.share.title,
      text: config.share.text,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        onShareResult?.('success');
        showToast('청첩장 링크를 공유했어요.');
      } catch {
        onShareResult?.('cancel');
        showToast('공유를 취소했어요.');
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        onShareResult?.('copy');
        showToast('청첩장 링크가 복사되었습니다.');
      } catch {
        onShareResult?.('copy-fail');
        showToast('링크 복사에 실패했습니다.');
      }
    }
  };

  return (
    <div className="floating-btns">
      <button className="floating-btn" onClick={scrollToTop} aria-label="맨 위로">
        ↑
      </button>
      <button className="floating-btn" onClick={handleShare} aria-label="공유하기">
        ⤴
      </button>
    </div>
  );
};

FloatingButtons.propTypes = {
  onScrollTopClick: PropTypes.func,
  onShareResult: PropTypes.func,
  showToast: PropTypes.func.isRequired,
};

FloatingButtons.defaultProps = {
  onScrollTopClick: undefined,
  onShareResult: undefined,
};

export default FloatingButtons;
