# Docker Security Checklist

## Image Security

### Base Image Selection

- [ ] **Use official images** from trusted sources (Docker Hub verified, gcr.io/distroless)
- [ ] **Pin to specific version** - never use `:latest`
  ```dockerfile
  # Bad
  FROM node:latest

  # Good
  FROM node:20.11.0-alpine
  ```
- [ ] **Prefer minimal images**: distroless > alpine > slim > full
- [ ] **Check for vulnerabilities** before using:
  ```bash
  docker scout cves node:20.11.0-alpine
  trivy image node:20.11.0-alpine
  ```

### Build Security

- [ ] **Multi-stage builds** - don't include build tools in runtime image
- [ ] **No secrets in build args or ENV**
  ```dockerfile
  # Bad - secret visible in image history
  ARG DB_PASSWORD
  ENV DB_PASSWORD=$DB_PASSWORD

  # Good - use runtime secrets
  # Pass at runtime: docker run -e DB_PASSWORD=xxx
  ```
- [ ] **Use BuildKit secrets for build-time secrets**
  ```dockerfile
  RUN --mount=type=secret,id=npmrc,dst=/root/.npmrc npm install
  ```
  ```bash
  docker build --secret id=npmrc,src=.npmrc .
  ```
- [ ] **COPY instead of ADD** (ADD can extract archives, fetch URLs)
- [ ] **Verify downloaded files** with checksums
  ```dockerfile
  RUN curl -fsSL https://example.com/file.tar.gz -o file.tar.gz \
      && echo "abc123... file.tar.gz" | sha256sum -c - \
      && tar -xzf file.tar.gz
  ```

### Non-Root User

- [ ] **Create and use non-root user**
  ```dockerfile
  # Alpine
  RUN addgroup -g 1001 app && adduser -u 1001 -G app -D app
  USER app

  # Debian/Ubuntu
  RUN groupadd -g 1001 app && useradd -u 1001 -g app app
  USER app

  # Distroless (already non-root)
  USER nonroot:nonroot
  ```
- [ ] **Set proper file ownership**
  ```dockerfile
  COPY --chown=app:app . .
  ```

### .dockerignore

- [ ] **Exclude sensitive files**
  ```gitignore
  .env
  .env.*
  *.pem
  *.key
  secrets/
  .git/
  ```

## Runtime Security

### Container Configuration

- [ ] **Drop all capabilities, add only what's needed**
  ```yaml
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE  # Only if needed for ports < 1024
  ```

- [ ] **Prevent privilege escalation**
  ```yaml
  security_opt:
    - no-new-privileges:true
  ```

- [ ] **Read-only filesystem** (where possible)
  ```yaml
  read_only: true
  tmpfs:
    - /tmp:size=100M
    - /var/run:size=10M
  ```

- [ ] **Resource limits** (prevent DoS)
  ```yaml
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G
      pids: 100  # Prevent fork bombs
  ```

### Network Security

- [ ] **Use custom networks** (not default bridge)
  ```yaml
  networks:
    frontend:
      driver: bridge
    backend:
      driver: bridge
      internal: true  # No external access
  ```

- [ ] **Internal network for backend services**
  ```yaml
  services:
    api:
      networks:
        - frontend
        - backend
    database:
      networks:
        - backend  # Internal only, no frontend
  ```

- [ ] **Expose only necessary ports**
  ```yaml
  # Bad - expose database to host
  ports:
    - "5432:5432"

  # Good - internal only
  # (no ports directive, accessible via service name on internal network)
  ```

### Secrets Management

- [ ] **Never hardcode secrets**
  ```yaml
  # Bad
  environment:
    - DB_PASSWORD=mysecret

  # Good - file-based secrets
  secrets:
    - db_password
  environment:
    - DB_PASSWORD_FILE=/run/secrets/db_password
  ```

- [ ] **Use Docker secrets or external vault**
  ```yaml
  secrets:
    db_password:
      file: ./secrets/db_password.txt  # Local
      # Or for Swarm:
      # external: true
  ```

- [ ] **Mount secrets as files, not environment variables**
  - Environment variables can leak in logs, error messages, child processes

### Volumes Security

- [ ] **Use read-only mounts where possible**
  ```yaml
  volumes:
    - ./config:/app/config:ro
    - /etc/ssl/certs:/etc/ssl/certs:ro
  ```

- [ ] **Never mount Docker socket** (unless absolutely necessary)
  ```yaml
  # DANGEROUS - gives full Docker access
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  ```

- [ ] **Named volumes for sensitive data** (not bind mounts)

## Scanning & Monitoring

### Vulnerability Scanning

- [ ] **Scan images before deployment**
  ```bash
  # Docker Scout (built-in)
  docker scout cves myimage:tag

  # Trivy
  trivy image myimage:tag

  # Grype
  grype myimage:tag
  ```

- [ ] **Integrate scanning in CI/CD**
  ```yaml
  # GitHub Actions example
  - name: Scan image
    uses: aquasecurity/trivy-action@master
    with:
      image-ref: myimage:tag
      severity: 'CRITICAL,HIGH'
      exit-code: '1'
  ```

- [ ] **Set acceptable thresholds**
  - Production: 0 CRITICAL, 0 HIGH
  - Development: 0 CRITICAL

### Runtime Monitoring

- [ ] **Health checks defined**
  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  ```

- [ ] **Logging configured**
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "100m"
      max-file: "5"
  ```

- [ ] **Monitor for anomalies**
  - Unexpected outbound connections
  - Unusual resource usage
  - Process execution

## Quick Security Audit

```bash
#!/bin/bash
# docker-security-audit.sh

IMAGE=$1

echo "=== Security Audit for $IMAGE ==="

echo -e "\n[1] Checking for vulnerabilities..."
docker scout cves $IMAGE 2>/dev/null || trivy image $IMAGE

echo -e "\n[2] Checking user..."
docker inspect $IMAGE --format='User: {{.Config.User}}'

echo -e "\n[3] Checking exposed ports..."
docker inspect $IMAGE --format='Ports: {{.Config.ExposedPorts}}'

echo -e "\n[4] Checking environment variables..."
docker inspect $IMAGE --format='{{range .Config.Env}}{{println .}}{{end}}'

echo -e "\n[5] Checking for secrets in history..."
docker history $IMAGE --no-trunc | grep -iE 'password|secret|key|token'

echo -e "\n[6] Image size..."
docker images $IMAGE --format='Size: {{.Size}}'
```

## Compliance Checklist

| Requirement | Check | Priority |
|-------------|-------|----------|
| Non-root user | `docker inspect --format='{{.Config.User}}'` | CRITICAL |
| No secrets in image | `docker history --no-trunc` | CRITICAL |
| Pinned base image | Check Dockerfile | HIGH |
| Vulnerability scan passed | `trivy image` | HIGH |
| Resource limits set | Check compose/run | HIGH |
| Health check defined | `docker inspect` | MEDIUM |
| Read-only filesystem | Check compose/run | MEDIUM |
| Capabilities dropped | Check compose/run | MEDIUM |
| Internal network for backend | Check network config | MEDIUM |
| Logging configured | Check compose/run | LOW |
