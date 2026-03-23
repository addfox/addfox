# Content-UI

Addfox tiene métodos de utilidad Content-UI integrados en `@addfox/utils`, recomendados para usar directamente en content script en lugar de escribir manualmente el proceso de montaje.

## Ubicación de inyección

Content-UI necesita inyectarse en el **archivo de entrada content** (por ejemplo, `app/content/index.ts` o `app/content/index.tsx`), no llamarlo en popup/options/background.

## Métodos integrados

### `defineContentUI(options)`

Modo de contenedor nativo, devuelve una función de montaje.

```ts
// app/content/index.ts o app/content/index.tsx
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

Modo Shadow DOM, adecuado para aislamiento de estilos.

```ts
// app/content/index.ts
import { defineShadowContentUI } from "@addfox/utils";

const mount = defineShadowContentUI({
  name: "addfox-content-ui-root",
  target: "body",
  attr: { id: "addfox-content-ui-root" },
});

function mountUI() {
  const root = mount(); // Nodo de montaje dentro de ShadowRoot
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

Modo iframe, el nivel de aislamiento más alto.

```ts
// app/content/index.ts
import { defineIframeContentUI } from "@addfox/utils";

const mount = defineIframeContentUI({
  target: "body",
  attr: { id: "addfox-content-ui-iframe" },
});

function mountUI() {
  const root = mount(); // Nodo raíz en el documento del iframe
  root.textContent = "Hello from iframe content-ui";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
```

## Parámetros comunes

- `target`: Ubicación de montaje objetivo (selector CSS o Element)
- `attr`: Atributos del nodo de inyección (`id`, `class`, `style`, `data-*`, etc.)
- `injectMode`: Método de inyección, `append | prepend`
- `tag`: Solo `defineContentUI` lo necesita
- `name`: Solo `defineShadowContentUI` lo necesita (nombre de elemento personalizado)

## Ejemplos

- [addfox-with-content-ui](https://github.com/addfox/addfox/tree/main/examples/addfox-with-content-ui)  
  Usar `defineShadowContentUI` para inyectar panel de página
- [addfox-with-content-ui-react](https://github.com/addfox/addfox/tree/main/examples/addfox-with-content-ui-react)  
  Usar `defineContentUI` + React + Tailwind
