# 환경 변수

Addfox는 Rsbuild의 `loadEnv`를 사용하여 프로젝트 루트 디렉토리의 `.env` 파일을 로드하고, 기본적으로 `ADDFOX_PUBLIC_`로 시작하는 변수만 클라이언트 코드에 노출합니다.

## 기본 동작

- **기본 접두사**: `ADDFOX_PUBLIC_`
- **클이언트 코드**: background, content, popup, options, sidepanel, devtools 등 Entry
- **로드 파일**: `.env`, `.env.local`, `.env.{mode}`, `.env.{mode}.local`

## 적용 범위

환경 변수는 모든 **클리언트 코드** Entry에 주입되지만, `addfox.config.ts`의 `manifest` 설정에는 적용되지 않습니다 (해당 부분은 빌드 시 환경 사용).

## 내장 변수

Addfox는 다음 변수를 자동으로 주입합니다:

| 변수명 | 설명 |
|--------|------|
| `process.env.BROWSER` | 현재 빌드 대상 브라우저 |
| `process.env.NODE_ENV` | 현재 환경 mode |
| `process.env.ADDFOX_VERSION` | Addfox 버전 번호 |

## 사용 예시

### .env 파일

```bash
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_KEY=secret  # 클라이언트에 노출되지 않음
```

### 코드에서 사용

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
```

## 보안 권장사항

- 클라이언트에 노출할 수 있는 변수는 항상 `ADDFOX_PUBLIC_` 접두사를 사용하세요
- 민감한 정보(예: API 키)는 `ADDFOX_PUBLIC_`로 시작하지 마세요
- `.env.local` 및 `.env.{mode}.local` 파일은 Git에 커밋하지 마세요

## 관련 문서

- [guide/env-prefix](/guide/env-prefix) - 환경 변수 사용 가이드
