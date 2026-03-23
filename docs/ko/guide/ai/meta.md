---
name: addfox-meta
description: meta.md는 권한 구성, Entry 매핑, 빌드 결과물 등 프로젝트의 구조화된 메타데이터를 제공하며, AI가 코드 리팩토링 및 기능 설계의 핵심 근거로 사용합니다.
---

# meta.md

`meta.md`는 Addfox가 AI 어시스턴트를 위한 자세한 구조화된 컨텍스트로, 프로젝트 루트 디렉토리의 `.addfox/` 디렉토리에 위치합니다.

## 1. 핵심 구조

생성된 `meta.md`는 다음 표준 블록을 포함합니다:

### 기본 정보

프레임워크 이름, 프로젝트 이름, 설명, 버전 및 현재 Manifest 버전 번호를 포함합니다.

### 권한 구성

확장이 요청하는 권한을 자세히 나열하며, 다음 세 가지로 분류됩니다:
- **Permissions**: 기본 기능 권한.
- **Host Permissions**: 호스트 권한.
- **Optional Permissions**: 선택적 권한.

### Entry 매핑

가장 중요한 부분으로, 모든 확장 Entry의 자세한 정보를 나열합니다:
- **Source**: 소스 코드 파일의 절대 경로.
- **HTML**: 관련 HTML 템플릿의 경로 (존재하는 경우).
- **JS Output**: 빌드에 의해 생성된 스크립트 경로.
- **Flags**: 해당 Entry의 구성 플래그 (예: `html: true`, `scriptInject: body` 등).

---

> **참고**: 복잡한 아키텍처 조정이나 `addfox.config.ts` 수정 전에 AI가 이 파일을 읽도록 하여 생성된 솔루션이 현재 프로젝트 아키텍처와 호환되는지 확인하세요.
