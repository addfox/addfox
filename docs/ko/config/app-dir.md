# appDir

`appDir`은 애플리케이션 소스 코드 디렉토리를 지정하며, Entry 자동 발견 및 manifest 자동 로딩의 기준 경로입니다.

## 개요

- **타입**: `string`
- **기본값**: `"app"`
- **필수 여부**: 아니오

## 사용법

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  appDir: "src",  // src 디렉토리를 앱 루트로 사용
});
```

## 역할

`appDir`을 설정하면 다음 동작에 영향을 줍니다:

1. **Entry 발견** — `appDir` 디렉토리에서 Entry를 자동 발견
2. **entry 경로 해석** — `entry` 설정의 경로는 `appDir`을 기준으로 함
3. **manifest 로딩** — `appDir` 또는 그 하위 디렉토리에서 manifest 파일 로드

## 예시

### src 디렉토리 사용

```ts
// addfox.config.ts
export default defineConfig({
  appDir: "src",
});
```

디렉토리 구조:

```tree
my-extension/
├── src/                    # 애플리케이션 소스 코드
│   ├── background/
│   │   └── index.ts
│   ├── content/
│   │   └── index.ts
│   ├── popup/
│   │   └── index.tsx
│   └── manifest.json
├── addfox.config.ts
└── package.json
```

### 프로젝트 루트 디렉토리 사용

```ts
// addfox.config.ts
export default defineConfig({
  appDir: ".",  // 프로젝트 루트 디렉토리 사용
});
```

## 주의사항

- `appDir`은 절대 경로로 해석됩니다 (프로젝트 루트 디렉토리 기준)
- 기본값 `"app"` 또는 일반적으로 사용되는 `"src"`를 유지하는 것이 팀 협업에 유리합니다
- `appDir`을 수정한 후에는 `entry`의 경로도相应 업데이트하세요

## 관련 설정

- [`entry`](/config/entry) - Entry 설정
- [`manifest`](/config/manifest) - 확장 Manifest 설정
- [guide/app-dir](/guide/app-dir) - 디렉토리 구조 가이드
