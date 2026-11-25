import PropTypes from 'prop-types';

const Footer = ({ media }) => {
  const imageSrc = media?.publicUrl || '/images/footer-placeholder.svg';
  const imageAlt = media?.caption || 'Thank You';
  const targetUrl = media?.targetUrl;

  const image = (
    <img
      className="footer-image"
      src={imageSrc}
      alt={imageAlt}
      onError={(event) => {
        event.currentTarget.style.background =
          'linear-gradient(135deg, #4a7c59 0%, #6b8f4e 50%, #87a96b 100%)';
        event.currentTarget.style.minHeight = '400px';
      }}
    />
  );

  return (
    <div className="footer" data-aos="fade-up">
      {targetUrl ? (
        <a
          className="footer-media-link"
          href={targetUrl}
          rel="noopener noreferrer"
          target="_blank"
          data-analytics-track="footer_click"
          data-analytics-section="footer"
          data-analytics-label={imageAlt}
        >
          {image}
        </a>
      ) : (
        image
      )}
      <div className="footer-overlay">
        <h2 className="footer-thankyou">Thank You !</h2>
      </div>
      <p className="footer-copyright">
        BGM.{' '}
        <a
          href="https://commons.wikimedia.org/wiki/File:Canon_in_D_Major_(ISRC_USUAN1100301).mp3"
          rel="noreferrer"
          target="_blank"
        >
          Canon in D Major
        </a>{' '}
        by Kevin MacLeod, licensed under{' '}
        <a href="https://creativecommons.org/licenses/by/3.0/" rel="noreferrer" target="_blank">
          CC BY 3.0
        </a>
      </p>
    </div>
  );
};

Footer.propTypes = {
  media: PropTypes.shape({
    publicUrl: PropTypes.string,
    caption: PropTypes.string,
    targetUrl: PropTypes.string,
  }),
};

export default Footer;
