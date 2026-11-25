import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { FALLBACK_PUBLIC_INVITATION_MEDIA } from '../lib/invitationMedia';

const Gallery = ({ media }) => {
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const lightboxRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchDeltaXRef = useRef(0);

  const images = media?.gallery?.length ? media.gallery : FALLBACK_PUBLIC_INVITATION_MEDIA.gallery;

  const visibleImages = expanded ? images : images.slice(0, 6);

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
      return;
    }

    touchStartXRef.current = event.touches[0]?.clientX ?? 0;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
      return;
    }

    const currentX = event.touches[0]?.clientX ?? 0;
    touchDeltaXRef.current = currentX - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaXRef.current) < 45) {
      touchDeltaXRef.current = 0;
      return;
    }

    if (touchDeltaXRef.current < 0) {
      nextImage();
    } else {
      prevImage();
    }

    touchDeltaXRef.current = 0;
  };

  useEffect(() => {
    const lightboxElement = lightboxRef.current;

    if (!lightboxElement) {
      return undefined;
    }

    const preventGestureZoom = (event) => {
      event.preventDefault();
    };

    const preventMultiTouchZoom = (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    lightboxElement.addEventListener('gesturestart', preventGestureZoom);
    lightboxElement.addEventListener('gesturechange', preventGestureZoom);
    lightboxElement.addEventListener('gestureend', preventGestureZoom);
    lightboxElement.addEventListener('touchmove', preventMultiTouchZoom, { passive: false });

    return () => {
      lightboxElement.removeEventListener('gesturestart', preventGestureZoom);
      lightboxElement.removeEventListener('gesturechange', preventGestureZoom);
      lightboxElement.removeEventListener('gestureend', preventGestureZoom);
      lightboxElement.removeEventListener('touchmove', preventMultiTouchZoom);
    };
  }, [lightboxOpen]);

  return (
    <>
      <div className="gallery-section" data-aos="fade-up">
        <h3 className="section-title">갤러리</h3>

        <div className="gallery-grid">
          {visibleImages.map((img, i) => (
            <div key={img.id ?? `${img.publicUrl}-${i}`} className="gallery-grid-item">
              {img.targetUrl ? (
                <a
                  href={img.targetUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  data-analytics-track="gallery_click"
                  data-analytics-section="gallery"
                  data-analytics-label={img.caption || `웨딩 사진 ${i + 1}`}
                >
                  <img
                    src={img.publicUrl || FALLBACK_PUBLIC_INVITATION_MEDIA.gallery[i % FALLBACK_PUBLIC_INVITATION_MEDIA.gallery.length].publicUrl}
                    alt={img.caption || `웨딩 사진 ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.style.background = `hsl(${200 + i * 15}, 30%, ${85 + (i % 3) * 3}%)`;
                      event.currentTarget.style.minHeight = '120px';
                    }}
                  />
                </a>
              ) : (
                <button
                  type="button"
                  className="gallery-grid-item__button"
                  onClick={() => openLightbox(i)}
                  data-analytics-track="gallery_open"
                  data-analytics-section="gallery"
                  data-analytics-label={img.caption || `웨딩 사진 ${i + 1}`}
                >
                  <img
                    src={img.publicUrl || FALLBACK_PUBLIC_INVITATION_MEDIA.gallery[i % FALLBACK_PUBLIC_INVITATION_MEDIA.gallery.length].publicUrl}
                    alt={img.caption || `웨딩 사진 ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.style.background = `hsl(${200 + i * 15}, 30%, ${85 + (i % 3) * 3}%)`;
                      event.currentTarget.style.minHeight = '120px';
                    }}
                  />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          className={`gallery-more-btn ${expanded ? 'expanded' : ''}`}
          onClick={() => setExpanded(!expanded)}
          data-analytics-track="gallery_toggle"
          data-analytics-section="gallery"
          data-analytics-label={expanded ? '접기' : '더 보기'}
        >
          {expanded ? '접기' : '더 보기'}
          <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
            <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Lightbox */}
      <div
        ref={lightboxRef}
        className={`lightbox ${lightboxOpen ? 'active' : ''}`}
        onClick={closeLightbox}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button className="lightbox-close" onClick={closeLightbox} data-analytics-track="gallery_close" data-analytics-section="gallery" data-analytics-label="닫기">×</button>
        <button className="lightbox-prev" onClick={(e) => { e.stopPropagation(); prevImage(); }} data-analytics-track="gallery_prev" data-analytics-section="gallery" data-analytics-label="이전">‹</button>
        <img
          src={
            images[currentIndex]?.publicUrl ||
            FALLBACK_PUBLIC_INVITATION_MEDIA.gallery[currentIndex % FALLBACK_PUBLIC_INVITATION_MEDIA.gallery.length].publicUrl
          }
          alt={images[currentIndex]?.caption || `웨딩 사진 ${currentIndex + 1}`}
          decoding="async"
          draggable="false"
          onClick={(e) => e.stopPropagation()}
        />
        <button className="lightbox-next" onClick={(e) => { e.stopPropagation(); nextImage(); }} data-analytics-track="gallery_next" data-analytics-section="gallery" data-analytics-label="다음">›</button>
      </div>
    </>
  );
};

Gallery.propTypes = {
  media: PropTypes.shape({
    gallery: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        publicUrl: PropTypes.string,
        caption: PropTypes.string,
        targetUrl: PropTypes.string,
      }),
    ),
  }),
};

export default Gallery;
