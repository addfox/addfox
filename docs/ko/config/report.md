# report

`report`는 Rsdoctor 빌드 분석 보고서를 활성화하는 데 사용됩니다.

## 개요

- **타입**: `boolean | RsdoctorReportOptions`
- **기본값**: `false`
- **필수 여부**: 아니오

## 사용법

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  report: true,  // Rsdoctor 보고서 활성화
});
```

## 구성 방식

### 불리언 값

```ts
export default defineConfig({
  report: true,   // 보고서 활성화
  // report: false, // 보고서 비활성화 (기본값)
});
```

### 객체 형식

Rsdoctor 구성 옵션 전달:

```ts
export default defineConfig({
  report: {
    mode: "normal",
    port: 9988,
    disableClientServer: false,
  },
});
```

## Rsdoctor 옵션

| 옵션 | 타입 | 설명 |
|------|------|------|
| `mode` | `"brief" \| "normal" \| "lite"` | 보고서 모드 |
| `port` | `number` | 보고서 서버 포트 |
| `disableClientServer` | `boolean` | 클라이언트 서버 비활성화 여부 |
| `output` | `object` | 출력 구성 |

더 많은 옵션은 [Rsdoctor 문서](https://rsdoctor.rs/config/options/options)를 참조하세요.

## CLI 활성화

```bash
# 보고서 활성화
addfox dev -r
addfox build -r

# 또는 --report 사용
addfox dev --report
```

CLI 파라미터는 구성의 `report` 값을 덮어씁니다.

## 보고서 내용

활성화되면 빌드 완료 후 분석 보고서 페이지가 자동으로 열리며, 다음을 포함합니다:

- 빌드 시간 분석
- 모듈 의존성 관계
- 패키지 크기 분석
- 중복 의존성 감지
- 컴파일 경고 및 오류

## 주의사항

- 보고서 기능은 빌드 시간을 증가시킵니다
- 빌드 문제를 조사할 때 활성화하는 것이 좋습니다
- 프로덕션 빌드에서도 사용할 수 있습니다

## 관련 링크

- [Rsdoctor 공식 문서](https://rsdoctor.rs/)
