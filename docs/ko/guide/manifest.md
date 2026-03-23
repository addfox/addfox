# Manifest 구성

`manifest`는 브라우저 확장의 매니페스트(Manifest)를 선언하는 데 사용되며, 최종 출력 디렉토리의 `manifest.json` 내용입니다.

세 가지 구성 방식을 지원합니다:
- **인라인 객체**: 구성에서 직접 manifest 콘텐츠 작성
- **브라우저별 분리**: Chrome 및 Firefox의 manifest를 별도로 구성
- **파일 경로**: manifest 파일의 위치 지정

또한 **완전히 생략**할 수 있으며, 프레임워크가 소스 코드 디렉토리에서 자동으로 로드합니다.

## 타입 및 기본 동작

- **타입**: `ManifestConfig | ManifestPathConfig | undefined`
- **기본 동작**: 구성되지 않은 경우 프레임워크는 `appDir` 또는 그 하위 디렉토리 `manifest/`에서 자동으로 찾습니다:
  - `manifest.json` — 기본 구성 (단일 브라우저 또는 공통 부분)
  - `manifest.chromium.json` — Chrome 오버라이드 구성
  - `manifest.firefox.json` — Firefox 오버라이드 구성

빌드 시 프레임워크는 CLI에 지정된 대상 브라우저(`-b chrome|firefox`)에 따라 병합하여 `outputRoot/outDir/manifest.json`에 출력합니다.

## 구성 방식

### 1. 단일 객체 (단일 브라우저 또는 공통 구성)

모든 필드를 하나의 객체에 작성하면 프레임워크가 자동으로 Entry 경로를 주입합니다.

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "내 확장",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
  },
});
```

프레임워크는 Entry 구성에 따라 자동으로 생성 및 주입합니다:
- `action.default_popup` → `popup/index.html`
- `background.service_worker` → `background/index.js`
- `content_scripts` → `content/index.js`

> Entry 경로(예: `popup/index.html`)는 프레임워크가 [entry](/ko/guide/entry/file-based) 및 [outDir](/ko/config/out-dir)에 따라 자동 계산하므로 manifest의 필드 의미만 올바르게 유지하면 됩니다.

### 2. 브라우저별 분리 (chromium / firefox)

Chrome과 Firefox가 다른 manifest 구성이 필요할 때:

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
      permissions: ["storage"],
    },
    firefox: {
      name: "내 확장",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      permissions: ["storage"],
    },
  },
});
```

빌드 시 CLI 파라미터에 따라 해당 브랜치를 선택합니다:
- `addfox dev -b chrome` → `chromium` 브랜치 사용
- `addfox dev -b firefox` → `firefox` 브랜치 사용

### 3. 경로 구성 (appDir 기준)

manifest를 독립적인 JSON 파일에 저장합니다:

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

파일 경로는 [`appDir`](/ko/config/app-dir)을 기준으로 합니다.

### 4. 완전히 생략 (자동 로드)

`manifest` 구성을 작성하지 않으면 프레임워크는 다음 순서로 찾습니다:

1. `appDir/manifest.json`
2. `appDir/manifest/manifest.json`
3. `appDir/manifest/manifest.chromium.json`
4. `appDir/manifest/manifest.firefox.json`

**권장하는 파일 구조**:

```
app/
├── manifest/
│   ├── manifest.json           # 기본 구성
│   ├── manifest.chromium.json  # Chrome 오버라이드
│   └── manifest.firefox.json   # Firefox 오버라이드
├── background/
├── content/
└── popup/
```

## 전체 예시

### 듀얼 브라우저 지원 구성

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    chromium: {
      name: "탭 관리자",
      version: "1.0.0",
      description: "브라우저 탭을 효율적으로 관리하세요",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
    
    firefox: {
      name: "탭 관리자",
      version: "1.0.0",
      description: "브라우저 탭을 효율적으로 관리하세요",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
  },
});
```

## 관련 설정

- [entry](/ko/guide/entry/file-based) — Entry 발견 규칙
- [appDir](/ko/config/app-dir) — 애플리케이션 디렉토리 구성
- [outDir](/ko/config/out-dir) — 출력 디렉토리 구성
