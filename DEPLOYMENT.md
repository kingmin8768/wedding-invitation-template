# 배포 가이드 (Docker Compose)

이 문서는 Docker 및 Docker Compose 환경에서 모바일 청첩장 애플리케이션을 배포하는 기본 절차를 안내합니다.

## 아키텍처 구성

- `frontend`: Nginx가 빌드된 정적 파일을 서빙하고 `/api`, `/socket.io`, `/uploads` 요청을 `backend` 컨테이너로 프록시
- `backend`: NestJS API 및 WebSocket 서버 (SQLite + 파일 업로드 저장)
- 영속 볼륨:
  - `./data/db/wedding.db`
  - `./data/uploads/`

기본 외부 포트는 `8081`입니다.

## 필수 환경변수

`.env.example` 또는 `.env.server.template`을 참고해 루트에 `.env` 파일을 생성합니다.

주요 설정 값:

- `FRONTEND_PORT`: 외부 노출 포트 (기본 `8081`)
- `APP_ORIGIN`: 서비스 접속 도메인 (예: `https://your-domain.example.com`)
- `CORS_ALLOWED_ORIGINS`: 허용할 Origin 목록 (보통 `APP_ORIGIN`과 동일)
- `VITE_NAVER_MAPS_KEY_ID`: 네이버 지도 API Key ID (선택)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: `openssl rand -hex 32` 등으로 생성한 충분히 긴 랜덤 시크릿
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: 초기 관리자 로그인 계정

## 수동 배포

```bash
cp .env.server.template .env
# .env 파일을 열어 시크릿, 도메인, 관리자 비밀번호를 반드시 수정하세요.
mkdir -p data/db data/uploads
docker compose up --build -d
docker compose ps
```

동작 확인:

```bash
curl http://localhost:8081/
curl http://localhost:8081/api/invitation-media/public
```

## 운영 주의사항

- `backend` 컨테이너는 외부에 직접 노출하지 않고 `frontend` Nginx 프록시 뒤에만 두는 구성을 권장합니다.
- 운영 환경에서는 `JWT_*` 시크릿과 `ADMIN_PASSWORD` 기본값을 반드시 교체해야 합니다.
- 데이터베이스와 업로드 이미지가 `./data/db`, `./data/uploads`에 저장되므로 백업 대상에 포함하고 삭제하지 마세요.
- HTTPS를 적용하려면 Nginx, Caddy, Cloudflare Tunnel 등 리버스 프록시를 앞단에 연결해 `FRONTEND_PORT`로 라우팅하세요.
