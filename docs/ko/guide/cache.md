# 캐시

Addfox는 개발 속도를 높이기 위해 프로젝트에 `.addfox/cache` 디렉토리를 생성합니다.

## `.addfox/cache`에 저장되는 것

- **`cache/build/`** — Rspack 영구 빌드 캐시. 기본적으로 활성화되어 있으며 리빌드와 dev 재시작을 가속합니다. [`buildCache`](/config/cache)로 구성할 수 있습니다.
- **`cache/browser-profile/`** — Chromium user-data(profile) 디렉토리. 기본적으로 모든 `addfox dev` 실행은 **새로운 profile**로 시작하며, [`keepBrowserProfile`](/config/cache)(최상위 구성, 브라우저별 재정의, 또는 `--keep-browser-profile` CLI 플래그)를 활성화한 경우에만 실행 사이에 profile이 유지됩니다.

실제 파일은 플랫폼과 모드에 따라 다를 수 있지만 목표는 동일합니다: **반복되는 cold 초기화 방지**.

## 왜 중요한가

- **더 빠른 리빌드**: 영구 빌드 캐시는 변경되지 않은 모듈의 재컴파일을 건너뜁니다.
- **선택적 profile 유지**: `keepBrowserProfile`을 활성화하면 확장 설치 상태, 설정, 로그인 세션이 `addfox dev` 실행 사이에 유지됩니다.

## 언제 캐시를 정리하는가

다음과 같은 경우 `.addfox/cache`를 삭제하세요:

- 브라우저 profile 동작이 예상과 다를 때
- 확장 로드 상태가 일치하지 않을 때
- 완전히 새로운 상태에서 디버깅해야 할 때

해당 디렉토리는 안전하게 삭제할 수 있으며, Addfox는 다음 실행 시 다시 생성합니다.

## 관련 설정

- [`keepBrowserProfile` / `buildCache`](/config/cache) - 캐시 구성
