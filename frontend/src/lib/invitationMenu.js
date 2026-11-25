export const buildInvitationMenuItems = ({ showGuestbook = false } = {}) => [
  { id: 'hero-top', label: '메인' },
  { id: 'invitation', label: '초대글' },
  { id: 'calendar', label: '예식안내' },
  { id: 'location', label: '오시는 길' },
  { id: 'together', label: '결혼식까지' },
  { id: 'gallery', label: '갤러리' },
  ...(showGuestbook ? [{ id: 'after-party', label: '애프터파티' }] : []),
  { id: 'rsvp', label: '참석여부' },
  { id: 'account', label: '계좌번호' },
  ...(showGuestbook ? [{ id: 'guestbook', label: '방명록' }] : []),
  { id: 'footer', label: '엔딩' },
  { id: 'lazygyu', label: '레이지규', path: '/games/lazygyu' },
];
