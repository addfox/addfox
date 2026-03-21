# Dockerfile Patterns by Language

## Java (Spring Boot / Generic)

```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Gradle
COPY gradle gradle
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon

COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# Maven alternative
# COPY pom.xml .
# RUN mvn dependency:go-offline
# COPY src src
# RUN mvn package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine AS runtime

RUN addgroup -g 1001 app && adduser -u 1001 -G app -D app
USER app

WORKDIR /app
COPY --from=builder --chown=app:app /app/build/libs/*.jar app.jar

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Scala (SBT)

```dockerfile
# Build stage
FROM sbtscala/scala-sbt:eclipse-temurin-21.0.2_13_1.9.9_3.4.1 AS builder
WORKDIR /app

COPY build.sbt .
COPY project project
RUN sbt update

COPY . .
RUN sbt assembly

# Runtime stage
FROM eclipse-temurin:21-jre-alpine AS runtime

RUN addgroup -g 1001 app && adduser -u 1001 -G app -D app
USER app

WORKDIR /app
COPY --from=builder --chown=app:app /app/target/scala-*/app-assembly-*.jar app.jar

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Node.js (Express / NestJS)

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

# Runtime stage
FROM node:20-alpine AS runtime

RUN addgroup -g 1001 app && adduser -u 1001 -G app -D app

WORKDIR /app

COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./

USER app

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["dist/main.js"]
```

## Python (FastAPI / Django)

```dockerfile
# Build stage
FROM python:3.12-slim AS builder
WORKDIR /app

RUN pip install --no-cache-dir poetry
COPY pyproject.toml poetry.lock ./
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes
RUN pip install --no-cache-dir --target=/app/deps -r requirements.txt

COPY . .

# Runtime stage
FROM python:3.12-slim AS runtime

RUN groupadd -g 1001 app && useradd -u 1001 -g app app

WORKDIR /app

COPY --from=builder --chown=app:app /app/deps /app/deps
COPY --from=builder --chown=app:app /app/src ./src

ENV PYTHONPATH=/app/deps
USER app

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

EXPOSE 8000

ENTRYPOINT ["python", "-m", "uvicorn"]
CMD ["src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Go

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# Runtime stage (distroless - most secure)
FROM gcr.io/distroless/static:nonroot AS runtime

COPY --from=builder /app/server /server

USER nonroot:nonroot

EXPOSE 8080

ENTRYPOINT ["/server"]
```

## Rust

```dockerfile
# Build stage
FROM rust:1.75-alpine AS builder
WORKDIR /app

RUN apk add --no-cache musl-dev

COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

COPY . .
RUN touch src/main.rs
RUN cargo build --release

# Runtime stage
FROM scratch AS runtime

COPY --from=builder /app/target/release/app /app

USER 1001:1001

EXPOSE 8080

ENTRYPOINT ["/app"]
```

## .NET (ASP.NET Core)

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder
WORKDIR /app

COPY *.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o out --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime

RUN addgroup -g 1001 app && adduser -u 1001 -G app -D app
USER app

WORKDIR /app
COPY --from=builder --chown=app:app /app/out .

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

EXPOSE 8080

ENTRYPOINT ["dotnet", "App.dll"]
```

## .dockerignore Template

```gitignore
# Git
.git
.gitignore

# IDE
.idea/
.vscode/
*.swp
*.swo

# Dependencies (reinstalled in container)
node_modules/
vendor/
.venv/
__pycache__/

# Build outputs
dist/
build/
target/
bin/
obj/
out/

# Test
coverage/
.pytest_cache/
*.test.js

# Docker
Dockerfile*
docker-compose*
.docker/

# CI/CD
.github/
.gitlab-ci.yml
Jenkinsfile

# Secrets (CRITICAL)
.env
.env.*
*.pem
*.key
secrets/

# Logs
*.log
logs/

# Documentation
docs/
*.md
LICENSE
```
