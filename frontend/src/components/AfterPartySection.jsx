import { INVITATION_CONFIG } from '../config/invitationConfig';

const AfterPartySection = () => {
  const { afterParty } = INVITATION_CONFIG;

  if (!afterParty.enabled) {
    return null;
  }

  const afterPartyMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(afterParty.address)}`;

  return (
    <div className="after-party" data-aos="fade-up">
      <div className="after-party-card">
        <h3 className="section-title">애프터 파티 안내</h3>

        <div className="after-party-message">
          <p>{afterParty.timeText}</p>
          <p>
            와주신 지인 및 친구들과의 소중한 추억을 나누고자
            <br />
            애프터 파티에 초대합니다.
          </p>
          <p>
            당일의 일정이 괜찮으신 분들께서는
            <br />
            파티에 참여해주셔서
          </p>
          <p>
            부디 못 나눈 이야기들을
            <br />
            함께 나눌 수 있는 자리가 될 수 있기를
            <br />
            소망합니다.
          </p>
        </div>

        {afterParty.postscript ? (
          <p className="after-party-postscript">{afterParty.postscript}</p>
        ) : null}

        <div className="after-party-place">
          <span className="after-party-place__label">장소</span>
          <p>{afterParty.address}</p>
        </div>

        <a
          className="after-party-button"
          href={afterPartyMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-analytics-track="map_click"
          data-analytics-section="after-party"
          data-analytics-label="애프터 파티 오시는 길"
        >
          오시는 길
        </a>
      </div>
    </div>
  );
};

export default AfterPartySection;
