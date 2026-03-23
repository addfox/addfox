# 분석 보고서

Addfox는 **Rsdoctor**를 기반으로 빌드 분석 보고서 기능을 제공하여 패키지 크기, 의존성 구조 및 빌드 병목 현상을 파악하는 데 사용됩니다.

## 적용 시나리오

- 빌드 결과물 크기가 비정상적으로 증가
- 특정 변경 후 빌드가 눈에 띄게 느려짐
- Entry chunk, 의존성 중복 및 정적 리소스 비율 분석을 원함

## 활성화 방식

명령줄:

```bash
addfox build --report
```

또는 구성에서 활성화:

```ts
export default defineConfig({
  report: true,
});
```

## 볼 수 있는 것

- Entry 및 chunk 분할 상황
- 의존성 크기 분포 및 중복 의존성
- 빌드 시간 및 단계별 소요 시간

## 권장 프로세스

1. 먼저 기준 보고서를 한 번 실행합니다.
2. 대규모 변경 후 보고서를 다시 생성합니다.
3. 크기 및 소요 시간 변화를 비교한 후 최적화 방향을 결정합니다.

## 관련 문서

- [구성: report](/ko/config/report)
- [구성: rsbuild](/ko/config/rsbuild)
- [Rsdoctor 공식 문서](https://rsdoctor.rs/)
