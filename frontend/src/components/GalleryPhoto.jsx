import PropTypes from 'prop-types';

const GalleryPhoto = ({ media }) => {
  const imageSrc = media?.publicUrl || '/images/couple-placeholder.svg';
  const imageAlt = media?.caption || '커플 사진';
  const targetUrl = media?.targetUrl;

  const image = (
    <img
      src={imageSrc}
      alt={imageAlt}
      onError={(event) => {
        event.currentTarget.style.background = 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)';
        event.currentTarget.style.height = '400px';
        event.currentTarget.style.display = 'flex';
      }}
    />
  );

  return (
    <div className="gallery-photo" data-aos="fade-up">
      {targetUrl ? (
        <a
          className="gallery-photo-link"
          href={targetUrl}
          rel="noopener noreferrer"
          target="_blank"
          data-analytics-track="gallery_click"
          data-analytics-section="greeting"
          data-analytics-label={imageAlt}
        >
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
};

GalleryPhoto.propTypes = {
  media: PropTypes.shape({
    publicUrl: PropTypes.string,
    caption: PropTypes.string,
    targetUrl: PropTypes.string,
  }),
};

export default GalleryPhoto;
