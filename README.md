# 이재명 정부 국제표준 모니터

Node 서버와 브라우저 프론트를 함께 쓰는 동적 배포 앱입니다. 시민 제보, 공개 검증 보드, 익명 자유게시판, 감사 로그를 공유 저장소로 운영하고, 검토자/운영자 권한은 패스키(WebAuthn)와 서버 세션으로 관리합니다.

## 현재 구조

- 메인 페이지는 서버가 요청마다 상태를 주입해 렌더링합니다.
- 시민 제보, 게시판, 감사 로그는 서버 저장소를 공유합니다.
- `DATABASE_URL`이 있으면 Postgres를 사용하고, 없으면 `storage/db.json` 파일 저장소로 폴백합니다.
- 검토자/운영자 등록은 초대코드 + 패스키로만 열립니다.
- 검토자 표결, 공개 전환, 삭제 같은 민감 동작은 서버 권한 검사와 감사 로그를 거칩니다.

## 파일

- `index.html`: 화면 골격
- `styles.css`: 레이아웃과 시각 디자인
- `data.js`: 대시보드 데이터와 출처
- `app.js`: 렌더링, API 호출, 패스키 로그인 UI
- `server.js`: HTTP 서버, 권한 검사, WebAuthn API
- `storage.js`: 파일/ Postgres 공용 상태 저장 계층
- `render.yaml`: Render 동적 배포 블루프린트
- `storage/db.json`: 파일 저장 폴백 상태

## 실행

```bash
node server.js
```

기본 포트는 `4173`입니다.

```bash
PORT=8080 node server.js
```

## 필수 환경변수

### 권장

- `NODE_ENV=production`
- `WEBAUTHN_RP_NAME=RightOfResist`
- `WEBAUTHN_RP_ID=rightofresist.com`
- `WEBAUTHN_ORIGINS=https://rightofresist.com,https://www.rightofresist.com,https://constitutional-watch-dashboard-starter.onrender.com`
- `REVIEWER_INVITE_CODES=<comma-separated>`
- `OPERATOR_INVITE_CODES=<comma-separated>`

### 선택

- `DATABASE_URL=<postgres connection string>`
- `STORAGE_DIR=/app/storage`
- `SESSION_SECRET=<random long string>`
- `SESSION_TTL_HOURS=168`
- `AUTH_CHALLENGE_TTL_MINUTES=10`

메모:

- `DATABASE_URL`이 없으면 서버는 파일 저장소를 사용합니다.
- `SESSION_SECRET`이 없으면 서버 부팅 시 임시 시크릿을 생성합니다. 배포 재시작 후 세션을 유지하려면 직접 지정하는 편이 낫습니다.
- `REVIEWER_INVITE_CODES`, `OPERATOR_INVITE_CODES`가 비어 있으면 해당 역할 등록은 닫힙니다.

## 패스키 운영 흐름

1. Render 환경변수에 `OPERATOR_INVITE_CODES`를 먼저 넣습니다.
2. 사이트에서 별칭, 권한, 초대코드를 입력하고 `패스키 등록`을 누릅니다.
3. 운영자 등록이 끝나면 같은 방식으로 검토자 초대코드를 배포합니다.
4. 이후 로그인은 같은 별칭으로 `패스키 로그인`만 수행하면 됩니다.

## Render 배포

현재 `render.yaml`은 동적 Node 서비스 + persistent disk 기준으로 맞춰져 있습니다.

- `runtime: docker`
- `plan: starter`
- `healthCheckPath: /health`
- `STORAGE_DIR=/app/storage`
- disk mount: `/app/storage`

추가로 직접 넣어야 하는 값:

- `DATABASE_URL`
- `REVIEWER_INVITE_CODES`
- `OPERATOR_INVITE_CODES`
- `SESSION_SECRET`

권장 순서:

1. Render Postgres를 하나 생성합니다.
2. 그 연결 문자열을 `DATABASE_URL`에 넣습니다.
3. 초대코드와 `SESSION_SECRET`을 환경변수에 넣습니다.
4. 재배포 후 `/health`와 패스키 등록 흐름을 확인합니다.

공식 문서:

- Web services: https://render.com/docs/web-services
- Persistent disks: https://render.com/docs/disks
- Blueprint spec: https://render.com/docs/blueprint-spec

## Docker

```bash
docker build -t constitutional-watch-dashboard .
docker run -d --name constitutional-watch-dashboard -p 4173:4173 constitutional-watch-dashboard
```

## 현재 검증 범위

- `node --check server.js`
- `node --check app.js`
- `node --check data.js`
- `/health` 응답 확인
- `/api/bootstrap` 응답 확인
- `/api/auth/register/options` 응답 확인
- `/api/reports` 생성 스모크 테스트

## 다음 단계

1. Render 환경변수에 `DATABASE_URL`, 초대코드, `SESSION_SECRET`을 실제 값으로 채웁니다.
2. 운영자 1명을 패스키로 등록합니다.
3. 필요하면 이후 단계로 SSE/WebSocket 실시간화와 브리게이딩 탐지를 추가합니다.
