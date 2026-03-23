# 테스트

Addfox는 **Rstest**에 대한 테스트 지원을 내장하며, `addfox test`를 통해 테스트를 실행하는 것을 권장합니다.

## 먼저 의존성 확인

테스트를 실행하기 전에 필요한 의존성이 설치되어 있는지 확인하세요:

```bash
pnpm add -D @rstest/core
```

브라우저 측 E2E를 실행하려면 다음을 추가하세요:

```bash
pnpm add -D @rstest/browser playwright
```

## 통합 명령

우선 순위:

```bash
addfox test
```

이 명령은 Addfox의 테스트 워크플로우를 따륾며 수동으로 하위 수준 명령을 조합할 필요가 없습니다.

## 단위 테스트 (Unit)

적합한 경우:

- 유틸리티 함수
- 메시지 처리 로직
- 상태 및 저장소 처리

일반적인 이름:

- `*.test.ts`
- `*.spec.ts`

## E2E 테스트

적합한 경우:

- 확장 로드 프로세스 검증
- popup/content/background 종단 간 상호 작용
- 핵심 사용자 경로 회귀

CI 또는 릴리스 전에 완전한 E2E를 한 번 실행하는 것이 좋습니다.

## 최소 구성 예시

```ts
// rstest.config.ts
import { defineConfig } from "@rstest/core";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.spec.ts"],
  },
});
```

## 권장 scripts

```json
{
  "scripts": {
    "test": "addfox test"
  }
}
```

## 참조 링크

- [Rstest 공식 문서](https://rstest.dev/)
- [Rstest 브라우저 테스트 문서](https://rstest.dev/guide/browser-testing)
