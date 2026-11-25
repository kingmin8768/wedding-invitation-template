# 배포 가이드

이 프로젝트는 **단일 컨테이너 All-in-One 구조**(NestJS 백엔드가 `/api`, `/uploads`, `/socket.io`와 빌드된 React SPA를 동시에 서빙)로 동작합니다.

---

## 1. 클라우드 1클릭 배포

### Render (`render.yaml`)

1. 이 저장소를 본인 GitHub 계정으로 **Fork**합니다.
2. Render 대시보드에서 **New → Blueprint**를 선택하고 Fork한 저장소를 연결합니다.
3. `render.yaml`에 정의된 환경변수 중 `ADMIN_PASSWORD`를 입력하고 배포합니다.
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`는 Render가 자동 생성합니다.
   - 무료 플랜(`plan: free`)은 인스턴스 재시작 시 디스크가 초기화되므로, 영구 저장이 필요하면 유료 플랜으로 전환 후 `render.yaml`의 `disk` 블록 주석을 해제하세요.

### Railway (`railway.json`)

1. Railway 대시보드에서 **New Project → Deploy from GitHub repo**를 선택합니다.
2. 루트 `Dockerfile`과 `railway.json`으로 자동 빌드됩니다.
3. **Variables** 탭에서 `ADMIN_EMAIL`, `ADMIN_PASSWORD`를 설정하고, **Volumes** 탭에서 `/app/data` 경로에 볼륨을 마운트하면 DB와 업로드 이미지가 영구 보존됩니다.

### Hugging Face Spaces (Docker)

1. Hugging Face에서 **New Space** 생성 시 **Space SDK: Docker (Blank)** 를 선택합니다.
2. Space 루트의 `README.md` YAML frontmatter에 아래를 추가하고 이 저장소 코드를 푸시합니다:
   ```yaml
   sdk: docker
   app_port: 7860
   ```
3. 컨테이너는 기본 포트 `7860`에서 실행되며, `SPACE_ID` 환경변수가 감지되면 Hugging Face Space iframe 임베딩과 쿠키 설정이 자동으로 활성화됩니다.
4. 관리자 비밀번호는 Space **Settings → Variables and secrets**에 `ADMIN_PASSWORD`를 추가하세요.

---

## 2. Docker Compose 자체 서버 배포

`.env` 파일 없이도 바로 실행할 수 있습니다.

```bash
docker compose up --build -d
docker compose ps
```

운영 환경에서 비밀번호·도메인·네이버 지도를 설정하려면:

```bash
cp .env.server.template .env
# ADMIN_PASSWORD, VITE_NAVER_MAPS_KEY_ID 등을 수정
docker compose up --build -d
```

동작 확인:

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/api/invitation-settings/public
```

---

## 3. 환경변수 동작 방식 (Zero-Config)

단일 컨테이너 배포 시 환경변수를 비워도 서버가 안전하게 기동되도록 설계되어 있습니다.

| 변수 | 미설정 시 기본 동작 | 비고 |
| --- | --- | --- |
| `PORT` | `7860` | 클라우드 플랫폼(`PORT` 자동 주입) 호환 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `/app/data/db/.runtime-secrets.json`에 64자 랜덤 hex 자동 생성·유지 | 명시 설정 시 해당 값 우선 |
| `APP_ORIGIN` / `CORS_ALLOWED_ORIGINS` | 요청 `Host`와 동일한 Origin 자동 허용 | 분리 배포 시에만 명시 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@example.com` / `admin1234` | 운영 시 반드시 변경 권장 |
| `VITE_NAVER_MAPS_KEY_ID` | 네이버 약도 대신 깔끔한 기본 위치 카드 표시 | Docker build arg로 전달 |
| `ALLOW_IFRAME_EMBED` | `SPACE_ID`가 있으면 자동 `true` | iframe 임베드 허용 시 `true` |

---

## 4. 배포 후 백업 및 유지보수

- 모든 SQLite 데이터베이스(`wedding.db`)와 업로드 이미지(`uploads/`)는 `/app/data` 디렉토리에 저장됩니다.
- Docker Compose 사용 시 호스트의 `./data` 폴더를 정기적으로 백업하세요.
- HTTPS 리버스 프록시(Nginx, Caddy, Cloudflare Tunnel 등)를 앞단에 연결할 경우 `X-Forwarded-Proto: https` 헤더가 전달되면 인증 쿠키가 자동으로 `Secure` 모드로 발급됩니다.
