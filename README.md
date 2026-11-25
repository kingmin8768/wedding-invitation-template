# 모바일 청첩장 풀스택 템플릿 (React + NestJS)

모바일 청첩장, 방명록, 참석 여부(RSVP) 전달, 관리자 미디어 관리, 실시간 경품 추첨(마블 룰렛) 기능을 포함한 풀스택 웹 애플리케이션 오픈소스 템플릿입니다.

## 주요 기능

- **모바일 청첩장**: 인트로 히어로, 혼주/커플 소개, D-Day 카운터, 예식 달력, 웨딩 갤러리(라이트박스), 오시는 길(네이버 지도 연동 & 티맵/카카오내비/네이버지도 길찾기), 축의금 계좌 안내, 애프터 파티 안내, 배경음악(BGM)
- **하객 참여 기능**: 참석 여부(RSVP) 제출, 방명록 작성/조회, 하객 사진 업로드 및 승인 플로우
- **실시간 이벤트 게임**: Socket.IO 및 WebRTC 기반의 호스트-참여자 마블 룰렛 추첨방
- **관리자 대시보드**: 로그인/JWT 쿠키 인증, 슬롯별(히어로/커플/갤러리/푸터) 이미지 업로드·정렬·공개 관리, RSVP/방명록/업로드 승인 및 방문자 로그 조회

## 프로젝트 구조

- `frontend`: Vite + React 18 프론트엔드 (`http://localhost:5173`)
- `backend`: NestJS + TypeORM + SQLite 백엔드 (`http://localhost:3000`)
- `docker-compose.yml`: Nginx + NestJS 프로덕션 컨테이너 구성

## 빠른 시작 (로컬 개발)

```bash
npm install
npm run install:all
npm run dev
```

개발 서버 실행 후 브라우저에서 `http://localhost:5173`으로 접속합니다.  
같은 Wi-Fi 환경의 스마트폰에서 테스트하려면 콘솔에 출력되는 `Frontend network URL`로 접속하세요.

### 주요 스크립트

```bash
npm run dev           # 프론트엔드 + 백엔드 동시 실행
npm run build         # 백엔드 및 프론트엔드 프로덕션 빌드
npm run lint          # ESLint 검사
npm run test          # 백엔드 및 프론트엔드 단위 테스트
npm run test:e2e      # 백엔드 E2E 테스트
```

## 청첩장 정보 커스터마이징

신랑·신부 이름, 혼주 성함, 예식 날짜/장소, 계좌번호, 교통/셔틀버스 안내는 아래 설정 파일 한 곳에서 수정할 수 있습니다.

- [frontend/src/config/invitationConfig.js](frontend/src/config/invitationConfig.js)
- 메타 태그 및 페이지 제목: [frontend/index.html](frontend/index.html)
- 기본 샘플 이미지: `frontend/public/images/` (또는 관리자 페이지에서 직접 이미지 업로드)

## 환경변수 설정

프로덕션 실행 시 `.env.example` 또는 `.env.server.template`을 복사해 `.env`를 작성하세요.

- `APP_ORIGIN`, `CORS_ALLOWED_ORIGINS`: 서비스 도메인
- `VITE_NAVER_MAPS_KEY_ID`: 네이버 클라우드 플랫폼 Maps Client ID (미설정 시 기본 약도 안내 카드가 표시됩니다)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: JWT 서명 키
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: 초기 관리자 계정

## Docker 배포

자세한 배포 방법은 [DEPLOYMENT.md](DEPLOYMENT.md)를 참고하세요.

```bash
cp .env.server.template .env
mkdir -p data/db data/uploads
docker compose up --build -d
```

## 라이선스 및 오픈소스 고지

- 본 프로젝트는 [MIT License](LICENSE)로 배포됩니다.
- 서드파티 코드 및 음원 라이선스 고지는 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)를 참고하세요.
