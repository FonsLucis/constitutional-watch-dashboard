# 이재명 정부 국제표준 모니터

Node 백엔드와 브라우저 프론트를 함께 쓰는 동적 배포 시안입니다. 서버를 띄우면 시민 제보, 공개 검증 보드, 익명 자유게시판, 감사 로그가 서버 JSON 저장소를 공유하고, 메인 페이지도 요청 시점에 서버가 직접 조합해서 내려줍니다.

## 파일

- `index.html`: 화면 골격
- `styles.css`: 레이아웃과 시각 디자인
- `data.js`: 대시보드 데이터와 출처
- `app.js`: 렌더링과 필터/검색 로직
- `server.js`: 공유 저장용 Node 서버
- `render.yaml`: Render 동적 배포 블루프린트
- `storage/db.json`: 서버 저장 데이터 파일

## 현재 설계 원칙

- 감시 구간은 2025년 6월 4일 이후 이재명 정부
- 국내 기관 자료는 상태판단 점수에 넣지 않는 제로트러스트 모드
- 국제표준, 국제지표, 자유민주권 외신 기준, 국민 원자료를 우선
- 폭력·시설파괴·무장·보복·허위정보 유포를 금지
- SNS는 원본 링크와 교차검증 없이는 점수에 반영하지 않음

## 실행

```bash
node server.js
```

기본 포트는 `4173` 입니다.

```bash
PORT=8080 node server.js
```

## 배포 형태

현재 기본 배포 기준은 `동적 배포용 Node 애플리케이션 서비스`입니다.

- 메인 페이지는 서버가 요청마다 부트스트랩 상태를 주입해 렌더링
- 나머지 프론트 자산도 서버가 직접 제공
- 시민 제보, 익명 게시판, 감사 로그는 `storage/db.json` 에 저장
- 프론트는 초기 서버 렌더 상태 + `/api/bootstrap` + 액션별 API로 변경사항을 반영
- 여러 사용자가 같은 데이터셋을 공유 가능
- 로그인 세션과 방문자 식별은 아직 프로토타입 수준
- Docker 기준으로는 `storage` 볼륨을 분리해 데이터 지속성을 확보

## Render로 올리기

Render 공식 문서 기준으로 웹 서비스는 `0.0.0.0`에 바인딩된 포트를 열어야 하고, 기본 `PORT`는 `10000`입니다. 또한 디스크를 붙이지 않으면 파일시스템이 휘발성이고, 디스크를 붙인 서비스는 단일 인스턴스 제약이 있습니다. 현재 프로젝트는 이 조건을 전제로 맞춰져 있습니다.

- 웹 서비스 포트/호스트 요구: https://render.com/docs/web-services
- 디스크 마운트와 지속성: https://render.com/docs/disks
- Blueprint `render.yaml`, `healthCheckPath`, `disk` 필드: https://render.com/docs/blueprint-spec

절차:

1. GitHub에 이 저장소를 올립니다.
2. Render에서 `New > Blueprint`를 선택합니다.
3. 해당 저장소를 연결하면 [render.yaml](/C:/Users/User/constitutional-watch-dashboard/render.yaml)에 정의된 웹 서비스가 잡힙니다.
4. 서비스 플랜은 `starter`로 유지합니다.
   이유: Render 문서상 persistent disk는 paid web service에 붙여야 합니다.
5. 디스크 마운트 경로는 `/app/storage`로 생성됩니다.
6. 배포가 끝나면 `https://<service>.onrender.com/health`가 `200`인지 확인합니다.
7. 이후 커스텀 도메인을 연결합니다.

현재 `render.yaml` 기본값:

- `runtime: docker`
- `plan: starter`
- `region: singapore`
- `healthCheckPath: /health`
- `PORT=10000`
- `HOST=0.0.0.0`
- `STORAGE_DIR=/app/storage`
- disk mount: `/app/storage`

## 빠른 배포

### 1. Docker

```bash
docker build -t constitutional-watch-dashboard .
docker run -d --name constitutional-watch-dashboard -p 4173:4173 constitutional-watch-dashboard
```

브라우저에서 `http://<server-ip>:4173` 으로 접속하면 됩니다.

### 2. 동적 배포 패키지 만들기

PowerShell에서 아래를 실행하면 업로드용 ZIP이 생성됩니다.

```powershell
.\deploy-dynamic.ps1
```

생성 결과:

- `constitutional-watch-dashboard-dynamic.zip`

## 실시간화하려면

1. `storage/db.json` 파일 저장을 DB(SQLite/PostgreSQL)로 교체
2. 현재 프로토타입 인증을 서버 세션 또는 토큰 기반으로 이동
3. SSE 또는 WebSocket을 붙여 폴링 없이 다중 사용자 실시간 동기화 추가
4. 관리자 승인, 브리게이딩 탐지, 감사 로그 서명 저장 추가
5. 리뷰어 승격, 초대제, passkey/WebAuthn 로그인으로 권한 모델 강화
