import { INVITATION_CONFIG } from '../config/invitationConfig';

const FamilyInfo = () => {
  const { groom, bride } = INVITATION_CONFIG.parents;
  const { couple } = INVITATION_CONFIG;

  return (
    <div className="family" data-aos="fade-up">
      <p className="family-line">
        <span className="flower" aria-hidden="true">✿</span>
        <span>{`${groom.father} · ${groom.mother} 의 ${groom.relation} ${couple.groom.firstName}`}</span>
      </p>
      <div style={{ height: '12px' }} />
      <p className="family-line">
        <span className="flower flower--placeholder" aria-hidden="true">✿</span>
        <span>{`${bride.father} · ${bride.mother} 의 ${bride.relation} ${couple.bride.firstName}`}</span>
      </p>
    </div>
  );
};

export default FamilyInfo;
