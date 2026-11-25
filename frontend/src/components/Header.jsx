import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { buildInvitationMenuItems } from '../lib/invitationMenu';
import { INVITATION_CONFIG } from '../config/invitationConfig';

const Header = ({ bgmPlaying, onBgmToggle, showGuestbook }) => {
  const { couple } = INVITATION_CONFIG;
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setHeaderVisible(scrollY > window.innerHeight * 0.92);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const scrollTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);

    if (!el) {
      return;
    }

    const headerOffset = id === 'hero-top' ? 0 : 58;
    const top = Math.max(window.scrollY + el.getBoundingClientRect().top - headerOffset, 0);
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const openMenuItem = (item) => {
    if (item.path) {
      setMenuOpen(false);
      navigate(item.path);
      return;
    }

    scrollTo(item.id);
  };

  const menuItems = buildInvitationMenuItems({ showGuestbook });

  return (
    <>
      <header className={`header ${headerVisible ? 'visible' : ''}`}>
        <button
          className="header-menu-btn"
          onClick={toggleMenu}
          aria-label="메뉴"
          data-analytics-track="menu_open"
          data-analytics-section="header"
          data-analytics-label="메뉴"
        >
          ☰
        </button>
        <span className="header-title">
          {couple.groom.firstName}<span className="heart">♥</span>{couple.bride.firstName}
        </span>
        <button
          className={`header-bgm-btn ${bgmPlaying ? 'playing' : ''}`}
          onClick={onBgmToggle}
          aria-label={bgmPlaying ? '배경음악 끄기' : '배경음악 켜기'}
          data-analytics-track="bgm_toggle"
          data-analytics-section="header"
          data-analytics-label="배경음악"
        >
          {bgmPlaying ? '♫' : '♪'}
        </button>
      </header>

      <div className={`fullscreen-menu ${menuOpen ? 'active' : ''}`}>
        <button className="fullscreen-menu-close" onClick={() => setMenuOpen(false)}>
          ✕
        </button>
        <nav className="fullscreen-menu-nav">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="fullscreen-menu-item"
              onClick={() => openMenuItem(item)}
            >
              <span>{item.label}</span>
              <span className="fullscreen-menu-arrow">›</span>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Header;

Header.propTypes = {
  bgmPlaying: PropTypes.bool,
  onBgmToggle: PropTypes.func,
  showGuestbook: PropTypes.bool,
};

Header.defaultProps = {
  bgmPlaying: false,
  onBgmToggle: undefined,
  showGuestbook: false,
};
