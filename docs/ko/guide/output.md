Addfox의 빌드 결과물은 기본적으로 `.addfox/extension/` 아래의 브라우저별 하위 디렉토리(예: `extension-chromium` 또는 `extension-firefox`)에 출력됩니다.

## 기본 출력 구조

```tree
.addfox/
├── extension/
│   ├── extension-chromium/  # Chromium 결과물
│   │   ├── manifest.json
│   │   ├── background/
│   │   │   └── index.js
│   │   ├── content/
│   │   │   ├── index.js
│   │   │   └── index.css
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   ├── options/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   └── icons/
│   │       └── icon*.png
│   └── extension-firefox/   # Firefox 결과물
└── cache/                   # 개발 캐시
```

## 사용자 지정 출력 디렉토리

`outDir` 구성을 통해 출력 디렉토리 이름을 수정할 수 있습니다:

```ts
// addfox.config.ts
export default defineConfig({
  outDir: "dist",  // .addfox/dist/로 출력
});
```

## 출력 내용 설명

### JavaScript 파일

- 모든 Entry 스크립트는 Rsbuild에 의해 패키징된 결과물
- 코드 변환, 압축 포함 (프로덕션 모드)
- Source map (개발 모드)

### HTML 파일

- Rsbuild에 의해 자동 생성되거나 사용자 지정 템플릿 사용
- 해당 Entry 스크립트가 주입됨
- **자동 생성**된 페이지 (사용자 지정 `index.html` 없음)는 **`<div id="root"></div>`**를 포함합니다. **`<title>`**은 확장 **`manifest.name`**과 일치하며, **페이지 아이콘**은 **`<link rel="icon">`**을 통해 **`manifest.icons`**에서 참조됩니다. 사용자 지정 HTML 템플릿을 사용할 때는 title과 아이콘을 직접 유지해야 합니다.

### CSS 파일

- Entry 스크립트에서 `import`한 스타일
- PostCSS 처리 (Tailwind 등이 구성된 경우)

### Manifest

- 최종 생성된 `manifest.json`
- 모든 Entry 경로 및 구성 포함

### 정적 리소스

- `public/` 디렉토리의 파일이 있는 그대로 복사됨
- 확장 아이콘, 국제화 파일 등

## 개발 vs 프로덕션

### 개발 모드 (`addfox dev`)

- `.addfox/extension/`에 출력
- Source map 포함
- 코드가 압축되지 않음
- 브라우저가 이 디렉토리를 직접 로드

### 프로덕션 모드 (`addfox build`)

- 마찬가지로 `.addfox/extension/`에 출력
- 코드 압축 최적화
- zip 파일 생성 가능 (기본 활성화)

## 패키징

빌드 완료 후 기본적으로 zip으로 패키징됩니다:

```tree
.addfox/
├── extension/          # 빌드 출력
└── extension.zip       # 패키징 파일 (배포용)
```

`zip: false`로 비활성화할 수 있습니다:

```ts
export default defineConfig({
  zip: false,
});
```

## 관련 설정

- [`outDir`](/config/out-dir) - 출력 디렉토리 이름
- [`zip`](/config/zip) - 패키징 구성
