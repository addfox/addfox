# GitLab CI Reference

## Pipeline Structure

```yaml
# .gitlab-ci.yml

# Global configuration
default:
  image: node:20-alpine

  before_script:
    - npm ci --cache .npm --prefer-offline

  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - .npm/
      - node_modules/

# Variables
variables:
  NODE_ENV: production
  DOCKER_TLS_CERTDIR: "/certs"

# Stages
stages:
  - lint
  - build
  - test
  - deploy

# Workflow rules
workflow:
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_MERGE_REQUEST_IID
    - if: $CI_COMMIT_TAG
```

## Job Configuration

### Basic Job

```yaml
build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
```

### Job with Rules

```yaml
deploy-staging:
  stage: deploy
  script:
    - ./deploy.sh staging
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: on_success
    - when: never

deploy-production:
  stage: deploy
  script:
    - ./deploy.sh production
  environment:
    name: production
    url: https://example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
    - when: never
```

### Parallel Jobs

```yaml
test:
  stage: test
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        OS: ["linux", "macos"]
  image: node:${NODE_VERSION}
  script:
    - npm test
```

### Job Dependencies

```yaml
lint:
  stage: lint
  script:
    - npm run lint

build:
  stage: build
  needs: [lint]  # Explicit dependency
  script:
    - npm run build
  artifacts:
    paths:
      - dist/

test:
  stage: test
  needs:
    - job: build
      artifacts: true
  script:
    - npm test
```

## Caching

### Basic Cache

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/
```

### Cache with Fallback

```yaml
cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/
  policy: pull-push  # pull, push, or pull-push
```

### Per-Job Cache

```yaml
build:
  cache:
    key: build-${CI_COMMIT_REF_SLUG}
    paths:
      - dist/
    policy: push

test:
  cache:
    key: build-${CI_COMMIT_REF_SLUG}
    paths:
      - dist/
    policy: pull
```

## Services

```yaml
test:
  stage: test
  services:
    - name: postgres:16
      alias: db
      variables:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: testdb
    - name: redis:7
      alias: cache
  variables:
    DATABASE_URL: postgres://test:test@db:5432/testdb
    REDIS_URL: redis://cache:6379
  script:
    - npm test
```

## Artifacts

### Basic Artifacts

```yaml
build:
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
```

### Artifacts with Reports

```yaml
test:
  script:
    - npm test -- --coverage --reporters=default --reporters=jest-junit
  artifacts:
    when: always
    paths:
      - coverage/
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
```

## Environments

### Environment Configuration

```yaml
deploy-staging:
  stage: deploy
  script:
    - ./deploy.sh staging
  environment:
    name: staging
    url: https://staging.example.com
    on_stop: stop-staging

stop-staging:
  stage: deploy
  script:
    - ./stop.sh staging
  environment:
    name: staging
    action: stop
  when: manual

deploy-production:
  stage: deploy
  script:
    - ./deploy.sh production
  environment:
    name: production
    url: https://example.com
  when: manual
  only:
    - main
```

### Review Apps

```yaml
deploy-review:
  stage: deploy
  script:
    - ./deploy.sh review-$CI_MERGE_REQUEST_IID
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    url: https://review-$CI_MERGE_REQUEST_IID.example.com
    on_stop: stop-review
  rules:
    - if: $CI_MERGE_REQUEST_IID

stop-review:
  stage: deploy
  script:
    - ./stop.sh review-$CI_MERGE_REQUEST_IID
  environment:
    name: review/$CI_MERGE_REQUEST_IID
    action: stop
  when: manual
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

## Variables & Secrets

```yaml
variables:
  # Global variables
  NODE_ENV: production

job:
  variables:
    # Job-specific variables
    DEBUG: "true"
  script:
    # Use CI/CD variables (set in GitLab UI)
    - echo $CI_REGISTRY_USER
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
```

## Docker Builds

### Build and Push

```yaml
build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

### With Kaniko (no Docker daemon)

```yaml
build-image:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:v1.19.2-debug
    entrypoint: [""]
  script:
    - /kaniko/executor
      --context $CI_PROJECT_DIR
      --dockerfile $CI_PROJECT_DIR/Dockerfile
      --destination $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Include & Extend

### Include Templates

```yaml
include:
  # Local file
  - local: '/.gitlab/ci/build.yml'

  # From another project
  - project: 'my-group/my-templates'
    ref: main
    file: '/templates/nodejs.yml'

  # Remote URL
  - remote: 'https://example.com/templates/ci.yml'

  # GitLab templates
  - template: Security/SAST.gitlab-ci.yml
```

### Extend Jobs

```yaml
.base-job:
  image: node:20
  before_script:
    - npm ci
  cache:
    paths:
      - node_modules/

build:
  extends: .base-job
  stage: build
  script:
    - npm run build

test:
  extends: .base-job
  stage: test
  script:
    - npm test
```

## Triggers

### Pipeline Triggers

```yaml
trigger-downstream:
  stage: deploy
  trigger:
    project: my-group/downstream-project
    branch: main
    strategy: depend  # Wait for downstream pipeline
```

### Parent-Child Pipelines

```yaml
generate:
  stage: build
  script:
    - ./generate-config.sh > child.yml
  artifacts:
    paths:
      - child.yml

child-pipeline:
  stage: test
  trigger:
    include:
      - artifact: child.yml
        job: generate
    strategy: depend
```

## Security Scanning

```yaml
include:
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml
  - template: Security/Secret-Detection.gitlab-ci.yml
  - template: Security/Container-Scanning.gitlab-ci.yml

# Override if needed
sast:
  stage: test
  variables:
    SAST_EXCLUDED_PATHS: "spec, test, tests"
```

## Complete Example

```yaml
default:
  image: node:20-alpine

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

cache:
  key:
    files:
      - package-lock.json
  paths:
    - .npm/

stages:
  - lint
  - build
  - test
  - deploy

lint:
  stage: lint
  script:
    - npm ci
    - npm run lint
    - npm run typecheck

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day

test:
  stage: test
  needs:
    - job: build
      artifacts: true
  script:
    - npm ci
    - npm test -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'

deploy-staging:
  stage: deploy
  needs: [test]
  script:
    - ./deploy.sh staging
  environment:
    name: staging
    url: https://staging.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-production:
  stage: deploy
  needs: [deploy-staging]
  script:
    - ./deploy.sh production
  environment:
    name: production
    url: https://example.com
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```
