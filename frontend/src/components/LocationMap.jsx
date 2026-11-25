import { useEffect, useRef, useState } from 'react';
import { INVITATION_CONFIG } from '../config/invitationConfig';

const NAVER_MAPS_KEY_ID =
  import.meta.env.VITE_NAVER_MAPS_KEY_ID?.trim() ||
  import.meta.env.VITE_NAVER_MAPS_CLIENT_ID?.trim() ||
  '';

let naverMapsLoaderPromise;

const loadNaverMapsScript = () => {
  if (window.naver?.maps) {
    return Promise.resolve(window.naver.maps);
  }

  if (!NAVER_MAPS_KEY_ID) {
    return Promise.reject(new Error('NAVER_MAPS_KEY_ID_MISSING'));
  }

  if (naverMapsLoaderPromise) {
    return naverMapsLoaderPromise;
  }

  naverMapsLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-naver-maps-script="true"]');

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.naver?.maps), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('NAVER_MAPS_SCRIPT_LOAD_FAILED')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAPS_KEY_ID)}`;
    script.async = true;
    script.defer = true;
    script.dataset.naverMapsScript = 'true';
    script.onload = () => {
      if (window.naver?.maps) {
        resolve(window.naver.maps);
        return;
      }

      reject(new Error('NAVER_MAPS_UNAVAILABLE'));
    };
    script.onerror = () => reject(new Error('NAVER_MAPS_SCRIPT_LOAD_FAILED'));
    document.head.appendChild(script);
  });

  return naverMapsLoaderPromise;
};

const LocationMap = () => {
  const { venue } = INVITATION_CONFIG;

  const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${venue.name} ${venue.address}`)}`;
  const kakaoNaviUrl = `https://map.kakao.com/link/to/${encodeURIComponent(venue.name)},${venue.lat},${venue.lng}`;
  const tmapUrl = `tmap://route?goalname=${encodeURIComponent(venue.name)}&goalx=${venue.lng}&goaly=${venue.lat}`;
  const navButtons = [
    { id: 'tmap', label: '티맵', href: tmapUrl, icon: '/images/tmap_icon.png' },
    { id: 'kakao', label: '카카오내비', href: kakaoNaviUrl, icon: '/images/kakao_icon.png' },
    { id: 'naver', label: '네이버지도', href: naverMapUrl, icon: '/images/navermap_icon_2.png' },
  ];
  const mapElementRef = useRef(null);
  const [mapStatus, setMapStatus] = useState(NAVER_MAPS_KEY_ID ? 'loading' : 'missing');

  useEffect(() => {
    let isMounted = true;

    const renderMap = async () => {
      try {
        const maps = await loadNaverMapsScript();

        if (!isMounted || !mapElementRef.current || !maps) {
          return;
        }

        const position = new maps.LatLng(venue.lat, venue.lng);
        const map = new maps.Map(mapElementRef.current, {
          center: position,
          zoom: 16,
          zoomControl: true,
          zoomControlOptions: {
            position: maps.Position.TOP_RIGHT,
          },
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
        });

        new maps.Marker({
          position,
          map,
          title: `${venue.name} ${venue.floor}`,
        });

        new maps.InfoWindow({
          content: `
            <div style="padding:10px 12px;min-width:170px;font-size:13px;line-height:1.5;color:#333;">
              <strong style="display:block;margin-bottom:2px;">${venue.name}</strong>
              <span style="display:block;color:#666;">${venue.floor}</span>
            </div>
          `,
          anchorSize: new maps.Size(0, 0),
          borderWidth: 0,
          backgroundColor: '#fff',
          disableAnchor: true,
          pixelOffset: new maps.Point(0, -12),
        }).open(map, position);

        setMapStatus('ready');
      } catch {
        if (isMounted) {
          setMapStatus('error');
        }
      }
    };

    renderMap();

    return () => {
      isMounted = false;
    };
  }, [venue.address, venue.floor, venue.lat, venue.lng, venue.name]);

  return (
    <div className="location" data-aos="fade-up">
      <h3 className="section-title">오시는 길</h3>

      <div className="location-top-box">
        <div className="location-top-box__row">
          <span className="location-place-name">{venue.name}</span>
        </div>
        <span className="location-place-hall">{venue.floor}</span>
        <span className="location-place-address">{venue.address}</span>
      </div>

      <div className="location-map-wrap">
        <div className="location-map">
          <div ref={mapElementRef} className="location-map__canvas" />

          {mapStatus !== 'ready' && (
            <div className="location-map__fallback" aria-live="polite">
              <span className="location-map__badge">NAVER MAP</span>
              <strong className="location-map__venue">{venue.name}</strong>
              <span className="location-map__hall">{venue.floor}</span>
              <span className="location-map__address">{venue.address}</span>
              <span className="location-map__status">
                {mapStatus === 'missing' && '지도 키를 연결하면 네이버 약도가 표시됩니다.'}
                {mapStatus === 'loading' && '네이버지도를 불러오는 중입니다.'}
                {mapStatus === 'error' && '지도를 불러오지 못했습니다. 아래 버튼으로 길찾기를 이용해주세요.'}
              </span>
            </div>
          )}
        </div>

        <a
          href={naverMapUrl}
          className="location-map-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="네이버지도에서 크게 보기"
          data-analytics-track="map_click"
          data-analytics-section="location"
          data-analytics-label="네이버지도에서 크게 보기"
        >
          네이버지도에서 크게 보기
        </a>
      </div>

      <div className="location-nav-btns">
        {navButtons.map((button) => (
          <a
            key={button.id}
            href={button.href}
            className="location-nav-btn"
            target="_blank"
            rel="noopener noreferrer"
            data-analytics-track="map_click"
            data-analytics-section="location"
            data-analytics-label={button.label}
          >
            <span className="location-nav-btn__icon">
              <img src={button.icon} alt="" aria-hidden="true" />
            </span>
            {button.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export default LocationMap;
