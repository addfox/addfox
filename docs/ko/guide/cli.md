# CLI

이 페이지는 `addfox` CLI가 지원하는 명령과 파라미터를 요약합니다.

## 기본 사용법

```bash
addfox <command> [options]
```

## package.json에서 scripts 구성

```json
{
  "scripts": {
    "dev": "addfox dev",
    "dev:firefox": "addfox dev -b firefox",
    "build": "addfox build",
    "build:chrome": "addfox build -b chrome",
    "test": "addfox test"
  }
}
```

## 명령

| 명령 | 설명 |
|------|------|
| `dev` | 개발 모드 시작 (핫 업데이트 지원). |
| `build` | 프로덕션 빌드 실행. |
| `test` | 테스트 실행 (파라미터는 rstest에 전달됨). |

> `addfox test`는 `rstest.config.*` 또는 `addfox.config`의 [`test`](/config/test) 필드에서 설정을 읽습니다. 둘 다 존재하면 `rstest.config.*`가 우선합니다.

## 일반 파라미터 (기본값 + 구성 매핑)

| 파라미터 | 내장 기본값 | 대응 `addfox.config` 필드 | 설명 |
|------|------------|---------------------------|------|
| `-b, --browser <browser>` | `chromium` | 직접 필드 없음 (대상 및 시작에 영향) | 대상/시작 브라우저 지정, 아래 [지원 브라우저 목록](#지원-브라우저-목록) 참조. |
| `--keep-browser-profile` | `false` | `keepBrowserProfile` | 실행 사이에 브라우저 profile 유지 (기본값: 매 실행마다 새 profile 사용). |
| `--no-keep-browser-profile` | `false` (현재 명령 전용) | `keepBrowserProfile` | 이번 실행에는 새 브라우저 profile 사용. |
| `-r, --report` | `false` | `report` | Rsdoctor 빌드 분석 보고서 활성화. |
| `--no-open` | `false` (즉 기본 자동 열기) | 직접 필드 없음 | 빌드 또는 개발 시 브라우저를 자동으로 열지 않음. |
| `--debug` | `false` | `debug` | 디버그 모드 활성화 (개발 시 오류 모니터링 등 기능). |
| `--help` | - | - | 도움말 표시. |
| `--version` | - | - | 버전 번호 표시. |

> `-c, --cache`와 `--no-cache`는 `--keep-browser-profile` / `--no-keep-browser-profile`의 deprecated 별칭이며, 여전히 동작하지만 터미널에 deprecated 경고를 출력합니다.

## 지원 브라우저 목록

`-b, --browser` 파라미터는 다음 브라우저를 지원합니다:

| 브라우저 | 설명 |
|--------|------|
| `chromium` | Chromium (기본값) |
| `chrome` | Google Chrome |
| `edge` | Microsoft Edge |
| `brave` | Brave Browser |
| `vivaldi` | Vivaldi |
| `opera` | Opera |
| `santa` | Santa Browser |
| `arc` | Arc Browser |
| `yandex` | Yandex Browser |
| `browseros` | BrowserOS |
| `custom` | 사용자 지정 브라우저 (구성에서 `browser.custom` 지정 필요) |
| `firefox` | Mozilla Firefox |

## 예시

```bash
# Chromium 개발 모드
addfox dev -b chromium

# Firefox 개발 + 디버그
addfox dev -b firefox --debug

# 프로덕션 빌드
addfox build -b chrome

# 빌드하지만 브라우저를 자동으로 열지 않음
addfox build -b chrome --no-open

# 빌드 분석 보고서 생성
addfox build -r
```

## 설명

- `--debug`는 주로 `dev` 모드에 작용합니다.
- 기본적으로 매 실행마다 새 profile을 사용합니다. 로그인 상태 등을 유지하려면 `--keep-browser-profile`을 사용하거나 구성 파일에 `keepBrowserProfile: true`를 설정하세요(브라우저별로 `browser.<name>.keepBrowserProfile`로 재정의할 수도 있습니다).
- `-b/--browser`에는 별도의 config 필드가 없으며, 명령 수준 선택에 속합니다.
