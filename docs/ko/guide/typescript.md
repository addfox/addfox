# TypeScript

Addfox는 Rsbuild를 기반으로 하며 기본적으로 TypeScript 기능을 제공하므로 `.ts` / `.tsx`를 사용하기 위해 추가 컴파일 체인을 연결할 필요가 없습니다.

## 내장 지원 기능

- **즉시 사용 가능한 컴파일**: `.ts`, `.tsx` 파일을 자동으로 처리합니다.
- **타입 검사 분리**: 빌드 프로세스는 컴파일 및 패키징에 집중합니다. 개발 단계에서 `tsc --noEmit` 또는 IDE를 통해 타입 검사를 수행할 수 있습니다.
- **다중 Entry 협업**: `background`, `content`, `popup`, `options` 등의 Entry에서 직접 TypeScript를 사용할 수 있습니다.

## 경로 별칭 (tsconfig 직접 인식)

Addfox는 `tsconfig.json`(또는 `tsconfig.base.json`)의 `compilerOptions.baseUrl` 및 `compilerOptions.paths`를 직접 인식하여 모듈 해석에 사용합니다.  
즉, 일반적인 경로 별칭 구성을 Addfox 구성에 별도로 작성할 필요가 없습니다.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"],
      "@shared/*": ["shared/*"]
    }
  }
}
```

그런 다음 코드에서 직접 사용할 수 있습니다:

```ts
import { getEnv } from "@/shared/env";
import { logger } from "@shared/logger";
```

## 권장사항

- 프로젝트 루트에서 `tsconfig` 경로 별칭을 통합하여 유지보수하여 여러 곳에서 중복 구성을 피하세요.
- CI에 `tsc --noEmit`을 추가하여 타입 문제가 조기에 노출되도록 하세요.

## 참조

- [Rsbuild TypeScript 가이드](https://rsbuild.rs/zh/guide/basic/typescript)
