# 핫 업데이트 (HMR)

`addfox dev` 명령은 개발 시 핫 업데이트 경험을 제공합니다: 코드를 저장한 후 자동으로 재빌드하고 WebSocket을 통해 브라우저 확장에 리로드를 알립니다.

## 작동 메커니즘

```
소스 코드 변경
    ↓
Rsbuild Watch 재빌드
    ↓
빌드 완료 → WebSocket 알림
    ↓
브라우저 확장 리로드
    ↓
페이지 자동 새로고침
```

## 다양한 Entry의 핫 업데이트 메커니즘

### Background / Service Worker

Background 스크립트는 **확장 리로드** 메커니즘을 사용합니다:

1. 코드 변경 → Rsbuild 재빌드
2. 빌드 완료 → WebSocket이 리로드 명령 전송
3. `chrome.runtime.reload()` 호출하여 전체 확장 리로드
4. Service Worker가 재시작되며 새로운 코드를 로드

:::warning 상태 손실
Service Worker 리로드 후에는 메모리의 상태가 손실됩니다. 데이터를 유지하려면 `chrome.storage` API를 사용하세요.
:::

### Content Script

Content Script는 **재주입** 메커니즘을 사용합니다:

1. 코드 변경 → Rsbuild 재빌드
2. 빌드 완료 → 확장 리로드
3. Content Script가 일치하는 페이지에 자동으로 주입
4. 열린 탭은 구성에 따라 자동으로 새로고침할 수 있습니다 (구성 참조)

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: true,  // content 변경 시 페이지 자동 새로고침, 기본값 true
  },
});
```

:::tip Background와의 차이
Content Script는 웹페이지 환경에서 실행되며, 리로드 후 일치하는 페이지에 다시 주입되므로 확장 관리 페이지를 수동으로 새로고침할 필요가 없습니다.
:::

### Popup / Options / Sidepanel

페이지 유형 Entry는 **Rsbuild HMR** 메커니즘을 사용합니다:

1. 코드 변경 → Rsbuild가 HMR 핫 교체 시도
2. HMR 성공 → 페이지가 부분적으로 업데이트되고 상태가 유지됨
3. HMR 실패 → 자동으로 페이지 새로고침으로 폴백

:::tip HMR 이점
- 더 빠른 업데이트 속도
- 컴포넌트 상태 유지 (예: 양식 입력)
- 더 부드러운 개발 경험

:::

:::warning HTML 템플릿 제한
Rsbuild 메커니즘의 영향으로 인해 HTML 템플릿 파일(예: `popup/index.html`)은 진정한 HMR 핫 교체를 지원하지 않습니다.  
HTML 템플릿을 수정하면 Addfox는 페이지 새로고침 또는 확장 리로드로 폴백합니다.
:::

## Firefox의 특수 처리

Firefox 개발 모드는 **web-ext** 도구를 사용하여 확장을 관리합니다:

- 확장 리로드는 Addfox의 WebSocket이 아닌 `web-ext`에서 처리됩니다
- 처음 시작할 때 Firefox가 자동으로 열리고 확장이 로드됩니다
- 자동 리로드(livereload) 지원

:::info
Firefox로 개발할 때는 Firefox 브라우저가 설치되어 있는지 확인하세요. Addfox는 자동으로 `web-ext`를 호출하여 Firefox의 확장 로드 및 리로드를 처리합니다.
:::

## 사용 방식

```bash
# 개발 서버 시작 (HMR 자동 활성화)
addfox dev

# 대상 브라우저 지정
addfox dev -b chrome
addfox dev -b firefox
```

## 첫 번째 시작 프로세스

`addfox dev`를 실행한 후:

1. 첫 번째 빌드 완료
2. 구성에 따라 브라우저 자동 시작
3. 개발 중인 확장 로드
4. 확장의 popup/options 페이지 자동 열기 (`open`이 구성된 경우)

## 구성 옵션

### 핫 리로드 포트

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    port: 23333,              // WebSocket 포트, 기본값 23333
    autoRefreshContentPage: true,  // content 변경 시 페이지 자동 새로고침, 기본값 true
  },
});
```

## 다음 단계

- [browserPath 구성](/guide/launch) — 개발 시 브라우저 자동 열기 구성
- [monitor 디버깅](/guide/monitor) — 오류 모니터링 패널을 사용하여 디버그
- [config/hot-reload](/config/hot-reload) — 핫 리로드의 전체 구성 옵션
