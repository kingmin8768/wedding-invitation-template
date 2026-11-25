import { useState, useEffect } from 'react';
import { useInvitationConfig } from '../hooks/useInvitationConfig';

const TogetherCounter = () => {
  const { config } = useInvitationConfig();
  const { wedding, couple } = config;
  const [dayInfo, setDayInfo] = useState({ days: 0, isPast: false });

  useEffect(() => {
    const weddingDate = new Date(
      wedding.year,
      wedding.month - 1,
      wedding.day,
      wedding.hour,
      wedding.minute,
    );

    const updateCounter = () => {
      const now = new Date();
      const diffMs = weddingDate - now;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      setDayInfo({
        days: Math.abs(diffDays),
        isPast: diffDays < 0,
      });
    };

    updateCounter();
    const interval = setInterval(updateCounter, 1000);
    return () => clearInterval(interval);
  }, [wedding.day, wedding.hour, wedding.minute, wedding.month, wedding.year]);

  return (
    <div className="together" data-aos="fade-up">
      <p className="together-label">결혼식까지 남은 날짜</p>
      <p className="together-couple">
        {couple.groom.firstName} <span className="together-heart">♥</span> {couple.bride.firstName}
      </p>
      <div className="dday-inline together-dday-inline">
        <span className="dday-number">{dayInfo.days}</span>
        <span className="dday-copy">
          {dayInfo.isPast ? '일 지났습니다.' : '일 남았습니다.'}
        </span>
      </div>
    </div>
  );
};

export default TogetherCounter;
