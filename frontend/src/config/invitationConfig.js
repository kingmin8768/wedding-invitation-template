export const INVITATION_CONFIG = {
  couple: {
    groom: {
      fullName: '김민수',
      firstName: '민수',
    },
    bride: {
      fullName: '이지영',
      firstName: '지영',
    },
  },
  parents: {
    groom: {
      father: '김철수',
      mother: '박영희',
      relation: '아들',
    },
    bride: {
      father: '이영수',
      mother: '최미선',
      relation: '딸',
    },
  },
  wedding: {
    year: 2026,
    month: 10,
    day: 17,
    hour: 14,
    minute: 0,
    displayDate: '2026년 10월 17일 토요일 오후 2시 00분',
    monthLabel: '10월',
  },
  venue: {
    name: '샘플 웨딩홀',
    floor: '3층 그랜드홀',
    address: '서울특별시 강남구 테헤란로 123',
    lat: 37.5012743,
    lng: 127.039585,
  },
  afterParty: {
    enabled: true,
    timeText: '오후 4시부터 애프터 파티가 진행됩니다.',
    address: '서울특별시 강남구 테헤란로 125 1층 샘플라운지',
    postscript: '',
  },
  accounts: {
    groom: [
      { bank: '샘플은행', number: '000-000000-00-001', name: '김민수' },
      { bank: '샘플은행', number: '000-000000-00-002', name: '김철수' },
    ],
    bride: [
      { bank: '샘플은행', number: '000-000000-00-003', name: '이지영' },
      { bank: '샘플은행', number: '000-000000-00-004', name: '이영수' },
    ],
  },
  transport: {
    subway: '지하철 2호선 강남역 1번 출구 도보 5분',
    buses: [
      '146번, 341번 : 샘플웨딩홀 앞 하차',
      '360번 : 강남역 정류장 하차',
    ],
    shuttleBus: {
      enabled: true,
      intro: [
        '먼 길 와주시는 하객분들을 위해',
        '편안하게 오실 수 있도록 셔틀버스를 준비했습니다.',
      ],
      schedules: [
        '셔틀버스 : 0000 (샘플관광)',
        '출발지 A 10시 00분 출발',
        '출발지 B 10시 30분 출발',
      ],
    },
    parking: '웨딩홀 건물 지하 주차장 이용 (2시간 무료)',
    wreathNotice: [
      '예식장 규정상 화환 반입이 불가한 홀입니다.',
      '축하해 주시는 마음만 감사히 받겠습니다.',
    ],
  },
  share: {
    title: '민수 ♥ 지영 결혼식에 초대합니다',
    text: '2026년 10월 17일 토요일 오후 2시 00분\n샘플 웨딩홀 3층 그랜드홀',
  },
};
