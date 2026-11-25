# 모바일 청첩장 풀스택 템플릿 (React + NestJS)

모바일 청첩장, 방명록, 참석 여부(RSVP) 전달, 관리자 미디어·내용 편집, 실시간 경품 추첨(마블 룰렛) 기능을 하나의 앱으로 패키징한 **1클릭 배포 가능 오픈소스 청첩장 템플릿**입니다.

---

## ⚡ 1분 딸깍 배포

프론트엔드(React) + 백엔드(NestJS + SQLite + WebSocket)가 **단일 Docker 이미지(`Dockerfile`)** 로 통합되어 있어, 별도 서버 설정 없이 바로 배포할 수 있습니다.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/kingmin8768/wedding-invitation-template)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/github?repo=https://github.com/kingmin8768/wedding-invitation-template)

### 1) Render (무료 플랜 가능 · `render.yaml` 내장)
1. 위 **Deploy to Render** 버튼을 누르거나, 이 저장소를 Fork한 뒤 [Render Blueprint](https://render.com/deploy?repo=https://github.com/kingmin8768/wedding-invitation-template)에서 연결하면 [`render.yaml`](render.yaml)을 읽어 자동 빌드/배포됩니다.
2. 배포 시 `ADMIN_PASSWORD`만 원하는 비밀번호로 입력하세요. (`JWT_*` 시크릿은 자동 생성됩니다.)

### 2) Railway (`railway.json` 내장)
1. 위 **Deploy on Railway** 버튼을 누르거나, Fork한 저장소를 [Railway](https://railway.com/new/github?repo=https://github.com/kingmin8768/wedding-invitation-template)에서 선택합니다.
2. 루트 [`railway.json`](railway.json)과 [`Dockerfile`](Dockerfile)을 자동 인식하여 헬스체크(`/api/health`)까지 즉시 배포됩니다.
3. 데이터 영속화가 필요하면 `/app/data` 경로에 Railway Volume을 연결하세요.

### 3) Hugging Face Spaces (무료 Docker 호스팅)
1. Hugging Face에서 **New Space → SDK: Docker (Blank)** 로 생성합니다.
2. Space의 `README.md` 상단 YAML 메타데이터에 `app_port: 7860`만 추가하고 이 저장소 코드를 푸시하면 자동으로 빌드·실행됩니다.
   - 기본 포트 `7860`, 비루트(`/app/data`) 쓰기 권한, `SPACE_ID` 기반 iframe 허용이 기본 내장되어 있습니다.

### 4) 로컬 / 개인 서버 Docker 1줄 실행
`.env` 파일을 만들지 않아도 기본 설정으로 즉시 실행됩니다.

```bash
docker compose up --build -d
```

실행 후 `http://localhost:8081` 에서 청첩장을 확인할 수 있습니다.

---

## 🎨 배포 직후 코드 수정 없이 청첩장 완성하기

코드를 한 줄도 고치지 않고 웹 브라우저에서 바로 내 청첩장으로 꾸밀 수 있습니다.

1. `/login` 페이지에서 관리자 계정으로 로그인합니다.
   - 기본값: `admin@example.com` / `admin1234` (운영 환경에서는 `ADMIN_PASSWORD` 환경변수 설정 권장)
2. `/admin/settings` (**청첩장 내용 설정**) 에서 신랑·신부 이름, 혼주 성함, 예식 일시·장소, 계좌번호, 교통/셔틀버스 안내, 애프터파티 정보를 입력하고 저장합니다.
3. `/admin/invitation-media` (**청첩장 이미지 관리**) 에서 메인, 커플 소개, 갤러리, 푸터 사진을 업로드합니다.

---

## 주요 기능

- **모바일 청첩장**: 인트로 히어로, 혼주/커플 소개, D-Day 카운터, 예식 달력, 웨딩 갤러리(라이트박스), 오시는 길(네이버 지도 연동 & 티맵/카카오내비/네이버지도 길찾기), 축의금 계좌 안내, 애프터 파티 안내, 배경음악(BGM)
- **하객 참여 기능**: 참석 여부(RSVP) 제출, 방명록 작성/조회, 하객 사진 업로드 및 승인 플로우 (`/friend` 경로로 지인 전용 방명록·애프터파티 노출)
- **실시간 이벤트 게임**: Socket.IO 및 WebRTC 기반의 호스트-참여자 마블 룰렛 추첨방 (`/games/lazygyu`, `/host/lazygyu`)
- **관리자 대시보드 (`/admin`)**:
  - **청첩장 내용 설정**: 코드 수정 없이 DB에 저장·초기화
  - **청첩장 이미지 관리**: 슬롯별(히어로/커플/갤러리/푸터) 업로드·정렬·노출 관리
  - **RSVP / 방명록 / 업로드 / 방문자 로그** 관리 및 CSV 내보내기

---

## 로컬 개발 (Node.js)

```bash
npm install
npm run install:all
npm run dev
```

- 프론트엔드: `http://localhost:5173`
- 백엔드 API: `http://localhost:3000`
- 같은 Wi-Fi 스마트폰 테스트: 콘솔에 출력되는 `Frontend network URL` 접속

### 주요 스크립트

```bash
npm run dev           # 프론트엔드 + 백엔드 동시 실행
npm run build         # 백엔드 및 프론트엔드 프로덕션 빌드
npm run lint          # ESLint 검사
npm run test          # 백엔드 및 프론트엔드 단위 테스트
npm run test:e2e      # 백엔드 E2E 테스트
```

---

## 환경변수 (선택)

단일 컨테이너 배포에서는 **모든 환경변수가 선택 사항**입니다. (`JWT_*` 시크릿은 미설정 시 `/app/data/db/.runtime-secrets.json`에 자동 생성·보관되며, CORS는 동일 호스트를 자동 허용합니다.)

운영 강화를 원할 때만 [`.env.example`](.env.example) / [`.env.server.template`](.env.server.template)을 참고하세요.

- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: 초기 관리자 로그인 계정
- `VITE_NAVER_MAPS_KEY_ID`: 네이버 클라우드 플랫폼 Maps Client ID (미설정 시 기본 약도 카드 표시)
- `APP_ORIGIN`, `CORS_ALLOWED_ORIGINS`: 프론트/백엔드 도메인을 분리 배포할 때만 지정

자세한 배포 가이드는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참고하세요.

---

## 라이선스 및 오픈소스 고지

- 본 프로젝트는 [MIT License](LICENSE)로 배포됩니다.
- 서드파티 코드 및 음원 라이선스 고지는 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)를 참고하세요.
