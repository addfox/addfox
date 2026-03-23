# zip

`zip`은 빌드 완료 후 출력 디렉토리를 zip 파일로 패키징할지 여부를 제어하는 데 사용됩니다.

## 개요

- **타입**: `boolean`
- **기본값**: `true`
- **필수 여부**: 아니오

## 사용법

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  zip: true,   // 빌드 완료 후 패키징
  // zip: false, // 패키징 안 함
});
```

## 출력 위치

패키징 파일 출력 경로:

```
{outputRoot}/{outDir}.zip
```

기본값: `.addfox/extension.zip`

## 예시

### 패키징 비활성화

```ts
export default defineConfig({
  zip: false,
});
```

### 패키징 활성화 (기본값)

```ts
export default defineConfig({
  zip: true,
});
```

또는 구성하지 않음 (기본값 사용).

## 패키징 내용

zip 파일은 빌드 출력의 전체 내용을 포함합니다:

- `manifest.json`
- 모든 Entry 스크립트 및 페이지
- `public/` 디렉토리의 정적 리소스

## 용도

패키징된 zip 파일은 다음에 사용할 수 있습니다:
- Chrome Web Store에 제출
- Firefox Add-ons에 제출
- 배포 및 백업

## 관련 설정

- [`outDir`](/config/out-dir) - 출력 디렉토리 구성
- [guide/zip](/guide/zip) - 패키징 가이드
