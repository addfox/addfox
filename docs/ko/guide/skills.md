---
name: addfox-skills
description: Addfox 설치 가능한 Skill 라이브러리 문서. 이 페이지는 c:/programs/skills의 현재 콘텐츠와 일치하며 설치 명령, skill 목록 및 디렉토리 구조를 포함합니다.
---

# Skills

이 페이지의 콘텐츠는 `c:/programs/skills`의 현재 저장소와 일치합니다.

이 저장소는 설치 가능한 Addfox 확장 개발 Skills를 제공합니다.

## 추가 사용법

프로젝트 루트 디렉토리에서 실행:

```bash
# 이 저장소의 모든 skills 설치
npx skills add addmo-dev/skills

# 지정된 skills만 설치
npx skills add addmo-dev/skills --skill migrate-to-addfox
npx skills add addmo-dev/skills --skill addfox-best-practices
npx skills add addmo-dev/skills --skill extension-functions-best-practices
npx skills add addmo-dev/skills --skill addfox-debugging
npx skills add addmo-dev/skills --skill addfox-testing

# 사용 가능한 skills 먼저 나열
npx skills add addmo-dev/skills --list
```

전체 GitHub URL을 사용할 수도 있습니다:

```bash
npx skills add https://github.com/addmo-dev/skills
```

## Skills 목록

| Skill | 용도 |
|-------|------|
| **migrate-to-addfox** | 기존 프로젝트를 WXT, Plasmo, Extension.js 또는 프레임워크 없는 솔루션에서 Addfox로 마이그레이션합니다. |
| **addfox-best-practices** | Addfox 프로젝트 모범 사례: Entry, 구성, manifest, 권한, 크로스 브라우저, 프레임워크 스타일, 메시지 통신 등. |
| **extension-functions-best-practices** | 확장 기능 구현 가이드: 비디오/오디오/이미지/다운로드/AI/번역/비밀번호 관리/Web3 등 기능 시나리오. |
| **addfox-debugging** | Addfox 빌드 및 실행 문제 해결: 터미널, `.addfox/error.md`, `.addfox/meta.md`와 결합하여 위치 파악. |
| **addfox-testing** | Addfox 테스트 실천: 단위 테스트 및 E2E 테스트의 선택, 구성 및 구현 방법. |

## 저장소 구조

```tree
skills/
├── migrate-to-addfox/
│   ├── SKILL.md
│   └── references/
├── addfox-best-practices/
│   ├── SKILL.md
│   ├── reference.md
│   └── rules/
├── extension-functions-best-practices/
│   ├── SKILL.md
│   └── reference.md
├── addfox-debugging/
│   ├── SKILL.md
│   └── reference.md
└── addfox-testing/
    ├── SKILL.md
    └── reference.md
```

## 설명

- Skills는 `skills CLI`를 통해 설치된 후 프로젝트 skill 디렉토리(예: `.cursor/skills/` 또는 `.agents/skills/`)에 복사됩니다.
- 먼저 전체 설치한 다음 팀 요구 사항에 따라 일반적으로 사용하는 skill을 유지할 수 있습니다.
