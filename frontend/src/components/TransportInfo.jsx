import { useInvitationConfig } from '../hooks/useInvitationConfig';

const TransportInfo = () => {
  const { config } = useInvitationConfig();
  const { transport } = config;

  return (
    <div className="transport" data-aos="fade-up">
      <h4>• 지하철 이용시 :</h4>
      <p>{transport.subway}</p>

      <h4>• 버스 이용시 :</h4>
      {transport.buses.map((bus) => (
        <p key={bus}>{bus}</p>
      ))}

      {transport.shuttleBus.enabled && (
        <>
          <h4>• 셔틀버스 안내 :</h4>
          {transport.shuttleBus.intro.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>자세한 일정은 아래 사항을 참고 부탁드립니다.</p>
          <div className="transport-bus-schedule">
            {transport.shuttleBus.schedules.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </>
      )}

      <h4>• 주차 :</h4>
      <p>{transport.parking}</p>

      <h4>• 화환 안내 :</h4>
      {transport.wreathNotice.map((line) => (
        <p key={line}>{line}</p>
      ))}

      <div className="note">
        <p>*예식장 주차장이 혼잡할 수 있으니,</p>
        <p>예정보다 여유롭게 출발해 주시기를 부탁드립니다.</p>
        <p>멀리서 귀한 걸음 해주셔서 진심으로 감사드립니다.</p>
      </div>
    </div>
  );
};

export default TransportInfo;
