# 오류 모니터링

Addfox는 개발 모드에서 오류 모니터링 기능을 주입할 수 있으며, 다중 Entry 런타임 오류를 터미널 및 모니터링 페이지에 집계하여 빠르게 위치를 파악할 수 있도록 합니다.

## 핵심 가치

- `background`, `content`, `popup`, `options`, `sidepanel` 등의 Entry 오류 자동 캡처
- 터미널 출력 구조화된 오류 블록 (Entry, 메시지, 위치, 스택), AI 분석에 더 적합
- 모니터링 페이지(`/_addfox-monitor/`)에서 오류 목록 및 세부 정보 보기 제공

## 활성화 방식

`addfox dev`에서 활성화:

```ts
// addfox.config.ts
export default defineConfig({
  debug: true,
});
```

또는 명령줄에서 임시로 활성화:

```bash
addfox dev --debug
```

## 터미널 AI 친화적 출력

모니터링이 켜져 있으면 Addfox는 터미널에서 AI 사용에 편리한 오류 컨텍스트를 출력하며, 일반적으로 다음을 포함합니다:

- Entry (entry)
- 오류 메시지 (message)
- 발생 위치 (location)
- 스택 (stack)

이 오류 블록을 직접 AI에 복사하여 컨텍스트 보충 비용을 줄일 수 있습니다.

## Firefox 설명

Firefox 확장 실행 메커니즘은 Chromium과 다릅니다 (특히 백그라운드 스크립트 수명 주기 및 디버그 채널). 따라서 오류 모니터링 동작은 Chromium에서와 완전히 동일하지 않을 수 있습니다.  
Firefox에서 일관성 없는 표시가 발견되면 브라우저의 기본 디버그 페이지(`about:debugging`)와 함께 교차 확인하는 것이 좋습니다.

## 주의사항

- 개발 모드(`addfox dev`)에만 적용됩니다
- 프로덕션 빌드는 모니터링 주입을 제거합니다
- 오류 데이터는 기본적으로 로컬에서만 볼 수 있으며 자동으로 업로드되지 않습니다

## 관련 설정

- [`debug`](/ko/config/debug) - 오류 모니터링 구성
