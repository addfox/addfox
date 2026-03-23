# 환경 변수

Addfox는 `.env` 파일을 통해 환경 변수를 관리할 수 있으며, 클라이언트 코드에서 안전하게 사용할 수 있습니다.

## 기본 사용법

프로젝트 루트 디렉토리에 `.env` 파일을 생성합니다:

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_API_KEY=secret_key_here
```

## 기본 접두사

Addfox는 기본적으로 `ADDFOX_PUBLIC_`로 시작하는 환경 변수만 노출합니다:

```ts
// app/popup/index.tsx
console.log(process.env.ADDFOX_PUBLIC_API_URL);   // ✅ "https://api.example.com"
console.log(process.env.ADDFOX_PUBLIC_APP_NAME);  // ✅ "My Extension"
console.log(process.env.ADDFOX_PRIVATE_API_KEY);  // ❌ undefined
console.log(process.env.PRIVATE_API_KEY);         // ❌ undefined
```

## 적용 범위

환경 변수는 모든 **클리언트 코드** Entry에 주입됩니다:

- **background** — Service Worker / Background script
- **content** — Content Script
- **popup** — 팝업 페이지
- **options** — 옵션 페이지
- **sidepanel** — 사이드바
- **devtools** — 개발자 도구

:::tip 서버와 클라이언트의 차이
- `manifest` 구성의 `process.env.*`는 **빌드 시** 해석됩니다 (서버)
- Entry 코드의 `process.env.*`는 **런타임**에 사용 가능합니다 (클리언트)

:::

## 내장 변수

Addfox는 다음과 같은 내장 변수를 자동으로 주입하며, `.env`에서 정의할 필요가 없습니다:

| 변수명 | 설명 | 예시 값 |
|--------|------|--------|
| `process.env.BROWSER` | 현재 빌드 브라우저 | `chrome`, `firefox` |
| `process.env.NODE_ENV` | 현재 환경 | `development`, `production` |
| `process.env.ADDFOX_VERSION` | Addfox 버전 번호 | `1.0.0` |

## 다양한 환경

### 개발 환경

`.env.development` 생성:

```bash
# .env.development
ADDFOX_PUBLIC_API_URL=http://localhost:3000
ADDFOX_PUBLIC_DEBUG=true
```

### 프로덕션 환경

`.env.production` 생성:

```bash
# .env.production
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_DEBUG=false
```

### 환경 파일 우선순위

1. `.env.{mode}.local` — 로컬 특정 모드 (가장 높은 우선순위, Git에 커밋하지 않음)
2. `.env.{mode}` — 특정 모드
3. `.env.local` — 로컬 환경 (Git에 커밋하지 않음)
4. `.env` — 기본값 (가장 낮은 우선순위)

## 전체 예시

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_FEATURE_FLAG=true
ADDFOX_PRIVATE_DATABASE_URL=secret
```

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: process.env.ADDFOX_PUBLIC_APP_NAME || "My Extension",
  },
});
```

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
const showFeature = process.env.ADDFOX_PUBLIC_FEATURE_FLAG === "true";
```

## 주의사항

- 환경 변수 값은 모두 문자열입니다
- 불리언 값은 수동으로 변환해야 합니다: `process.env.ADDFOX_PUBLIC_DEBUG === "true"`
- `.env` 파일을 수정한 후에는 개발 서버를 다시 시작해야 합니다
- 클라이언트 코드에서 `ADDFOX_PUBLIC_` 접두사가 없는 변수를 사용하지 마세요. 그들은 `undefined`가 됩니다
