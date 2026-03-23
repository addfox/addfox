# manifest

`manifest`는 브라우저 확장의 매니페스트(Manifest)를 선언하는 데 사용되며, 최종 출력 디렉토리의 `manifest.json` 내용입니다.

## 개요

- **타입**: `ManifestConfig | ManifestPathConfig | undefined`
- **기본값**: `undefined` (자동 로드)
- **필수 여부**: 아니오

## 구성 방식

### 1. 인라인 객체 (단일 브라우저)

가장 간단한 구성 방식으로, 하나의 브라우저만 지원하거나 두 브라우저의 구성이 동일한 경우에 적합합니다.

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "내 확장",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 2. 브라우저별 분리 (chromium / firefox)

Chrome과 Firefox가 다른 구성이 필요할 때 사용합니다.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "내 확장",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
    
    firefox: {
      name: "내 확장",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
  },
});
```

### 3. 파일 경로 구성

manifest를 독립적인 JSON 파일에 저장합니다.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

경로는 [`appDir`](/config/app-dir)을 기준으로 합니다.

### 4. 자동 로드 (권장)

`manifest` 구성을 작성하지 않으면 프레임워크가 자동으로 찾습니다:

1. `appDir/manifest.json`, `appDir/manifest.chromium.json`, `appDir/manifest.firefox.json`
2. `appDir/manifest/manifest.json`, `appDir/manifest/manifest.chromium.json`, `appDir/manifest/manifest.firefox.json`

찾은 모든 파일은 기본으로 사용되며, 동일한 디렉토리의 chromium/firefox 파일과 병합됩니다.
## Manifest에서 Entry 소스 파일 직접 지정

addfox 1.x부터는 manifest에서 Entry의 **소스 파일 경로**를 직접 지정할 수 있으며, 프레임워크가 자동으로 인식하고 빌드한 후 경로를 출력물 경로로 교체합니다.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "내 확장",
    version: "1.0.0",
    manifest_version: 3,
    
    // manifest에서 직접 소스 파일 경로 작성
    background: {
      service_worker: "./background/index.ts",  // 소스 파일 경로
    },
    action: {
      default_popup: "./popup/index.tsx",       // 소스 파일 경로
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./content/index.ts"],              // 소스 파일 경로
      },
    ],
  },
});
```

프레임워크는 다음을 수행합니다:
1. 이러한 소스 파일 경로(`.ts`, `.tsx`, `.js`, `.jsx`) 인식
2. 자동으로 entry로 처리
3. 빌드 후 경로를 출력물 경로로 교체 (예: `background/index.js`)

### 지원하는 Entry 필드

manifest의 다음 필드에서 소스 파일 경로를 사용할 수 있습니다:

| 필드 | 설명 |
|------|------|
| `background.service_worker` | MV3 백그라운드 스크립트 |
| `background.scripts` | MV2 백그라운드 스크립트 |
| `background.page` | 백그라운드 페이지 |
| `action.default_popup` | MV3 팝업 페이지 |
| `browser_action.default_popup` | MV2 팝업 페이지 |
| `options_ui.page` / `options_page` | 옵션 페이지 |
| `devtools_page` | 개발자 도구 페이지 |
| `side_panel.default_path` | 사이드바 |
| `sandbox.pages` | 샌드박스 페이지 |
| `chrome_url_overrides.newtab` | 새 탭 페이지 |
| `chrome_url_overrides.bookmarks` | 북마크 페이지 |
| `chrome_url_overrides.history` | 기록 페이지 |
| `content_scripts[].js` | 콘텐츠 스크립트 |

### Entry 해석 우선순위

프레임워크의 Entry 해석 우선순위는 다음과 같습니다:

1. **최고**: `config.entry`에 명시적으로 구성된 Entry
2. **둘째**: manifest에 지정된 소스 파일 경로
3. **셋째**: 자동 발견 (파일 규칙 기반)

이는 다음을 의미합니다:
- `config.entry`에서 Entry를 지정하면 manifest의 소스 파일 경로는 무시됩니다
- `config.entry`를 구성하지 않았지만 manifest에 소스 파일 경로가 있으면 프레임워크는 manifest의 경로를 사용합니다
- 둘 다 없으면 프레임워크가 규칙에 따라 Entry를 자동 발견합니다

```ts
// 예시: config.entry가 최고 우선순위
export default defineConfig({
  entry: {
    // 이 구성은 manifest의 background 소스 파일 경로를 덮어씁니다
    background: "custom-background/index.ts",
  },
  manifest: {
    background: {
      service_worker: "./background/index.ts",  // config.entry에 의해 덮어써짐
    },
  },
});
```

## 타입 정의

```ts
type ManifestConfig = 
  | Record<string, unknown>           // 단일 객체
  | { chromium?: Record<string, unknown>; firefox?: Record<string, unknown> };  // 분리

type ManifestPathConfig = {
  chromium?: string;   // appDir 기준 상대 경로
  firefox?: string;    // appDir 기준 상대 경로
};
```

## 주의사항

1. Entry 경로(예: `popup/index.html`)는 프레임워크가 [`entry`](/config/entry)와 [`outDir`](/config/out-dir)에 따라 자동 계산합니다
2. CLI `-b chrome|firefox`를 사용하여 해당 브랜치를 선택하여 빌드하세요
3. 프레임워크는 자동으로 `background`, `content_scripts`, `action` 등의 Entry 경로를 manifest에 주입합니다
4. manifest에서 소스 파일 경로를 사용할 때는 파일이 존재하는지 확인하세요. 그렇지 않으면 빌드가 실패합니다

## 예시

### 듀얼 브라우저 지원

```ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "탭 관리자",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
    
    firefox: {
      name: "탭 관리자",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
  },
});
```

### 순수 Manifest Entry 구성 (config.entry 없음)

```ts
export default defineConfig({
  // entry를 구성하지 않고 manifest의 소스 파일 경로에 완전히 의존
  manifest: {
    name: "순수Manifest 구성 예시",
    version: "1.0.0",
    manifest_version: 3,
    background: {
      service_worker: "./src/background.ts",
    },
    action: {
      default_popup: "./src/popup.tsx",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./src/content.ts"],
      },
    ],
  },
});
```

## 관련 설정

- [`entry`](/config/entry) - Entry 구성
- [`appDir`](/config/app-dir) - 애플리케이션 디렉토리
- [`outDir`](/config/out-dir) - 출력 디렉토리
