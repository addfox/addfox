# outDir

`outDir`은 빌드 출력 디렉토리 이름을 지정하는 데 사용됩니다.

## 개요

- **타입**: `string`
- **기본값**: `"extension"`
- **필수 여부**: 아니오

## 사용법

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  outDir: "dist",  // .addfox/dist/로 출력
});
```

## 전체 출력 경로

최종 출력 경로는 다음 부분으로 구성됩니다:

```
{outputRoot}/{outDir}/
```

- `outputRoot`: `.addfox`로 고정
- `outDir`: 기본값 `"extension"`, 사용자 지정 가능

기본 전체 경로: `.addfox/extension/`

## 예시

### dist로 수정

```ts
export default defineConfig({
  outDir: "dist",
});
```

출력 디렉토리: `.addfox/dist/`

### 빌드 결과물 구조

```
.addfox/
├── dist/                   # 빌드 출력 (outDir: "dist")
│   ├── manifest.json
│   ├── background/
│   │   └── index.js
│   ├── content/
│   │   └── index.js
│   └── popup/
│       ├── index.html
│       └── index.js
└── cache/                  # 빌드 캐시
```

## 주의사항

- `outDir`은 출력 디렉토리의 이름만 영향을 주며, 상위 디렉토리 `.addfox`는 고정입니다
- `outDir`을 수정한 후에는 manifest의 경로가 자동으로 업데이트됩니다
- 개발 시 브라우저가 로드하는 확장 디렉토리도 이 경로입니다

## 관련 설정

- [`zip`](/config/zip) - 패키징 구성
- [guide/output](/guide/output) - 출력 가이드
