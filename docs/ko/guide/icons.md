# 아이콘

브라우저 확장에는 툴 바, 확장 관리 페이지 및 Web Store용 아이콘 세트가 필요합니다.

## 아이콘 크기

Chrome 확장 권장 크기:

| 크기 | 용도 |
|------|------|
| 16x16 | 툴 바 아이콘 (Favicon) |
| 32x32 | 툴 바 아이콘 (Retina) |
| 48x48 | 확장 관리 페이지 |
| 128x128 | Web Store 및 설치 프롬프트 |

Firefox 추가 지원:

| 크기 | 용도 |
|------|------|
| 19x19 | 툴 바 아이콘 |
| 38x38 | 툴 바 아이콘 (Retina) |
| 96x96 | 확장 관리 페이지 |

## 디렉토리 구조

아이콘을 `public/icons/`에 배치합니다:

```tree
public/
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Manifest에서 구성

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png"
    }
  }
}
```

## 아이콘 동적 설정

코드에서 아이콘을 동적으로 변경할 수 있습니다:

```ts
// 툴 바 아이콘 설정
chrome.action.setIcon({
  path: {
    16: "icons/icon-active16.png",
    32: "icons/icon-active32.png",
  },
});

// 제목 설정
chrome.action.setTitle({ title: "Active Mode" });

// 배지 설정
chrome.action.setBadgeText({ text: "3" });
chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
```

## 다크 모드 적응

다양한 테마에 대해 다양한 아이콘 제공:

```ts
// 시스템 테마를 감지하고 해당 아이콘 설정
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  chrome.action.setIcon({
    path: {
      16: "icons/icon-dark16.png",
      32: "icons/icon-dark32.png",
    },
  });
}
```

## 아이콘 설계 권장사항

1. **간결하고 명확함** — 작은 크기에서도 인식 가능해야 함
2. **브랜드 일관성** — 확장 기능 또는 브랜드와 관련이 있어야 함
3. **높은 대비** — 다양한 배경에서 명확하게 보여야 함
4. **텍스트 피하기** — 작은 크기에서 텍스트는 인식하기 어려움
5. **PNG 사용** — 투명한 배경 지원

## SVG 아이콘

Chrome은 SVG 아이콘도 지원합니다:

```json
{
  "icons": {
    "16": "icons/icon16.svg",
    "32": "icons/icon32.svg"
  }
}
```

그러나 일부 시나리오(예: Web Store)에는 여전히 PNG가 필요하므로 둘 다 제공하는 것이 좋습니다.

## 아이콘 생성 도구

- [Figma](https://figma.com/) — 아이콘을 디자인하고 다양한 크기로 낭출
- [Icon Kitchen](https://icon.kitchen/) — 온라인으로 확장 아이콘 생성
- [RealFaviconGenerator](https://realfavicongenerator.net/) — 다양한 크기의 아이콘 생성

## 전체 예시

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "내 확장",
    icons: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    action: {
      default_icon: {
        16: "icons/icon16.png",
        32: "icons/icon32.png",
      },
    },
  },
});
```

## 관련 링크

- [Chrome 아이콘 규격](https://developer.chrome.com/docs/extensions/mv3/user_interface/#icons)
- [Chrome Web Store 아이콘 요구사항](https://developer.chrome.com/docs/webstore/images/#icons)
