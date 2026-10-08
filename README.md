# 클래스노트

Next.js App Router 기반의 학생 활동지 PDF 평가 앱입니다. Google 로그인 → 교사 승인 → 평가 기준 저장 → PDF 업로드 → Gemini 평가 → 평가 기록 조회를 지원합니다. PDF는 Cloud Storage, 평가 기준과 결과는 Firestore에 저장됩니다. Gemini SDK와 Admin SDK는 서버 모듈에서만 사용합니다.

## 로컬 실행

1. Node.js 22 이상을 설치하고 `npm install`을 실행합니다.
2. `.env.example`을 `.env.local`로 복사하고 Firebase 웹 앱 설정 및 Gemini API 키를 입력합니다. Firebase 웹 API 키는 공개 설정이며 Gemini 키는 절대로 `NEXT_PUBLIC_` 변수에 넣지 않습니다.
3. Firebase 프로젝트에서 Authentication의 Google 제공업체, Cloud Firestore, Cloud Storage를 활성화합니다. Authentication의 승인된 도메인에 `localhost`와 배포 도메인을 추가합니다.
4. 서버용 Application Default Credentials를 설정합니다. 로컬에서는 `gcloud auth application-default login` 또는 저장소 외부 서비스 계정 파일을 `GOOGLE_APPLICATION_CREDENTIALS`로 지정합니다. 서비스 계정 JSON이나 키를 커밋하지 않습니다.
5. `npx firebase-tools deploy --only firestore:rules,storage --project PROJECT_ID`로 규칙을 배포합니다.
6. `npm run dev`로 실행하고 Google 로그인합니다. Firebase Authentication 콘솔에서 UID를 확인한 뒤 관리자 터미널에서 `npm run approve-teacher -- UID`를 실행합니다. 이 스크립트는 `.env.local`을 읽으며 ADC 관리자 인증이 필요합니다. 사용자는 로그아웃하고 다시 로그인해야 합니다.

교사 승인은 관리자만 수행합니다. 일반 Google 로그인만으로 평가 권한을 부여하지 않습니다. 모든 API가 Firebase ID 토큰 및 `teacher: true` custom claim을 검증합니다. 클라이언트 Firestore 접근은 차단하며 서버는 UID별 경로만 조회합니다.

## Firebase App Hosting 배포

1. Firebase Blaze 프로젝트에 저장소를 연결하고 App Hosting backend를 생성합니다. 앱 루트 디렉터리는 이 저장소의 루트입니다.
2. `apphosting.yaml`의 `REPLACE_WITH_*` 값을 Firebase 콘솔의 실제 웹 앱 설정으로 교체합니다. Storage 버킷 이름은 콘솔에서 복사합니다 (`PROJECT_ID.firebasestorage.app` 등의 실제 이름).
3. `npx firebase-tools apphosting:secrets:set GEMINI_API_KEY --project PROJECT_ID`로 키를 Secret Manager에 등록하고 `npx firebase-tools apphosting:secrets:grantaccess GEMINI_API_KEY --backend BACKEND_ID --project PROJECT_ID`로 backend 접근을 허용합니다.
4. App Hosting runtime 서비스 계정에 필요한 Firestore 데이터 접근(`roles/datastore.user`), Storage 객체 접근(`roles/storage.objectUser`), 토큰 폐기 확인용 Firebase Auth 사용자 조회(`roles/firebaseauth.viewer`) 권한을 부여합니다. 런타임에서는 ADC를 사용하므로 서비스 계정 JSON 환경 변수는 필요하지 않습니다.
5. 보안 규칙을 배포하고 App Hosting rollout을 시작합니다. 배포 URL을 Authentication 승인된 도메인에 추가하고 교사 권한을 부여합니다.
6. Google Cloud Storage 버킷에 배포 도메인과 로컬 도메인의 CORS를 적용하면 원본 PDF 다운로드가 가능합니다. 예: `gcloud storage buckets update gs://BUCKET --cors-file=storage.cors.json`. 실제 배포 도메인으로 JSON을 수정합니다.

설정 근거: [Firebase App Hosting 환경 변수 및 secrets](https://firebase.google.com/docs/app-hosting/configure), [Gemini PDF 문서 이해](https://ai.google.dev/gemini-api/docs/document-processing).

## 동작과 제한

- 평가 기준 1–20개, 기준별 최대 점수 1–100점. 수정해도 기존 결과는 저장된 기준 스냅샷을 유지합니다.
- PDF 파일 10MB 이하. Storage 규칙에 더해 서버가 MIME, 크기, PDF 헤더 및 소유 경로를 검사합니다.
- 서버가 PDF를 다운로드한 뒤 Gemini에 inline PDF로 전달합니다. 문서 내 지시는 평가 지시로 취급하지 않습니다. 응답을 Zod로 검증하고 기준 ID 중복, 누락, 점수 초과를 거부합니다.
- 교사별 동시 평가 하나, 최소 15초 요청 간격을 Firestore 트랜잭션으로 적용합니다. 실패한 평가의 업로드 파일은 클라이언트에서 삭제를 시도하며 실패 시 남을 수 있습니다. 성공한 PDF는 보존됩니다.
- 기록은 최근 50개를 보여 줍니다. 최종 평가는 교사가 원본과 근거를 검토해야 합니다. 손글씨 판독 정확도는 문서 상태에 따라 달라집니다.
- 학생 개인정보가 포함된 파일은 Cloud Storage와 Gemini API로 전송됩니다. 학교의 데이터 처리 정책에 맞는 실제 제출물을 사용하고 보존 정책을 별도로 운영하세요.

## 검증

`npm run typecheck`, `npm run build`, `npm test`로 코드 검증을 실행합니다. 실제 Firebase/Gemini 연동에는 프로젝트 및 API 키가 필요합니다. 배포 후 서로 다른 교사 계정으로 기준/결과/Storage 경로가 격리되는지, 승인 없는 계정이 거절되는지, 손상된 PDF 및 AI 오류가 적절히 처리되는지 확인합니다.
