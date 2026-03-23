# Content-UI

Addfox は `@addfox/utils` に Content-UI ユーティリティメソッドを組み込んでおり、content script で直接使用することをお勧めします。マウントフローを手動で書くよりも効率的です。

## 注入位置

Content-UI は **content エントリーファイル**（例：`app/content/index.ts` または `app/content/index.tsx`）で注入する必要があります。popup/options/background で呼び出すのではありません。

## 組み込みメソッド

### `defineContentUI(options)`

ネイティブコンテナモードで、マウント関数を返します。

```ts
// app/content/index.ts または app/content/index.tsx
import { defineContentUI } from "@addfox/utils";

const mount = defineContentUI({
  tag: "div",
  target: "body",
  attr: { id: "addfox-content-ui-root" },
  injectMode: "append",
});

function mountUI() {
  const root = mount(); // Element
  root.textContent = "Hello Content-UI";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
```

### `defineShadowContentUI(options)`

Shadow DOM モードで、スタイルの分離に適しています。

```ts
// app/content/index.ts
import { defineShadowContentUI } from "@addfox/utils";

const mount = defineShadowContentUI({
  name: "addfox-content-ui-root",
  target: "body",
  attr: { id: "addfox-content-ui-root" },
});

function mountUI() {
  const root = mount(); // ShadowRoot 内の mount ノード
  const title = document.createElement("div");
  title.textContent = "Content UI (addfox)";
  root.appendChild(title);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
```

### `defineIframeContentUI(options)`

iframe モードで、最高レベルの分離を提供します。

```ts
// app/content/index.ts
import { defineIframeContentUI } from "@addfox/utils";

const mount = defineIframeContentUI({
  target: "body",
  attr: { id: "addfox-content-ui-iframe" },
});

function mountUI() {
  const root = mount(); // iframe ドキュメント内のルートノード
  root.textContent = "Hello from iframe content-ui";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
```

## よく使うパラメータ

- `target`: ターゲットマウント位置（CSS セレクターまたは Element）
- `attr`: 注入ノードの属性（`id`、`class`、`style`、`data-*` など）
- `injectMode`: 注入方法、`append | prepend`
- `tag`: `defineContentUI` のみ必要
- `name`: `defineShadowContentUI` のみ必要（カスタム要素名）

## サンプル

- [addfox-with-content-ui](https://github.com/addfox/addfox/tree/main/examples/addfox-with-content-ui)  
  `defineShadowContentUI` を使用してページパネルを注入
- [addfox-with-content-ui-react](https://github.com/addfox/addfox/tree/main/examples/addfox-with-content-ui-react)  
  `defineContentUI` + React + Tailwind を使用
