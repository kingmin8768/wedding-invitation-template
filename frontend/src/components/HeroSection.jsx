import PropTypes from 'prop-types';

const HeroSection = ({ media }) => {
  const imageSrc = media?.publicUrl || '/images/hero-placeholder.svg';
  const imageAlt = media?.caption || '웨딩 사진';
  const targetUrl = media?.targetUrl;

  const heroImage = (
    <img
      className="hero-image"
      src={imageSrc}
      alt={imageAlt}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      onError={(event) => {
        event.currentTarget.style.background =
          'linear-gradient(135deg, #87CEEB 0%, #98D8C8 50%, #87CEEB 100%)';
        event.currentTarget.style.minHeight = '100vh';
      }}
    />
  );

  return (
    <section className="hero">
      {targetUrl ? (
        <a
          className="hero-media-link"
          href={targetUrl}
          rel="noopener noreferrer"
          target="_blank"
          data-analytics-track="hero_click"
          data-analytics-section="hero-top"
          data-analytics-label={imageAlt}
        >
          {heroImage}
        </a>
      ) : (
        heroImage
      )}
      <div className="hero-overlay">
        <div className="hero-intro">
          <p className="hero-title">Welcome</p>
          <p className="hero-title">To our Wedding</p>
        </div>
      </div>
    </section>
  );
};

HeroSection.propTypes = {
  media: PropTypes.shape({
    publicUrl: PropTypes.string,
    caption: PropTypes.string,
    targetUrl: PropTypes.string,
  }),
};

export default HeroSection;
