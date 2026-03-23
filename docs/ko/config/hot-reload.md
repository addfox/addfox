# hotReload

`hotReload`는 개발 시 핫 리로드 동작을 구성하는 데 사용됩니다.

## 개요

- **타입**: `{ port?: number; autoRefreshContentPage?: boolean }`
- **기본값**: `{ port: 23333, autoRefreshContentPage: true }`
- **필수 여부**: 아니오

## 사용법

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  hotReload: {
    port: 23333,                    // WebSocket 포트
    autoRefreshContentPage: false,   // content 변경 시 페이지 자동 새로고침
  },
});
```

## 구성 항목

### port

- **타입**: `number`
- **기본값**: `23333`
- **설명**: WebSocket 서버 포트, 개발 시 확장과 통신에 사용

```ts
export default defineConfig({
  hotReload: {
    port: 3000,  // 3000 포트 사용
  },
});
```

### autoRefreshContentPage

- **타입**: `boolean`
- **기본값**: `true`
- **설명**: content script 변경 후 현재 탭을 자동으로 새로고침할지 여부

```ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: false,  // 페이지 자동 새로고침 안 함
  },
});
```

## 작동 원리

1. `addfox dev`가 WebSocket 서버 시작 (기본 포트 23333)
2. 확장이 WebSocket으로 서버와 연결 설정
3. 코드 변경 → 재빌드 → WebSocket이 리로드 명령 전송
4. 확장이 자동으로 reload되고 페이지가 새로고침됨

:::tip Background와 Content의 차이
- **Background** 변경: 전체 확장 리로드, Service Worker 재시작
- **Content** 변경: 확장 리로드 + 페이지에 다시 주입

:::

## 관련 설정

- [guide/hmr](/guide/hmr) - 핫 업데이트 가이드
