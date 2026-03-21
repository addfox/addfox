# Docker Compose Patterns

## Production-Ready Template

```yaml
version: '3.8'

services:
  # ===========================================
  # Application
  # ===========================================
  app:
    image: ${REGISTRY:-local}/${APP_NAME:-app}:${VERSION:-latest}
    container_name: ${APP_NAME:-app}
    restart: unless-stopped

    # Security
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true

    # Resources
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

    # Health
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # Network
    networks:
      - frontend
      - backend
    ports:
      - "${APP_PORT:-8080}:8080"

    # Storage
    volumes:
      - app_data:/app/data
      - ./config:/app/config:ro
    tmpfs:
      - /tmp:size=100M

    # Environment
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=${LOG_LEVEL:-info}
    env_file:
      - .env

    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

    # Dependencies
    depends_on:
      database:
        condition: service_healthy
      cache:
        condition: service_healthy

  # ===========================================
  # Database (PostgreSQL)
  # ===========================================
  database:
    image: postgres:16-alpine
    container_name: ${APP_NAME:-app}-db
    restart: unless-stopped

    security_opt:
      - no-new-privileges:true

    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          memory: 1G

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5

    networks:
      - backend
    # No external ports - internal only

    volumes:
      - db_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro

    environment:
      - POSTGRES_DB=${DB_NAME:-app}
      - POSTGRES_USER=${DB_USER:-postgres}
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password

    secrets:
      - db_password

    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "3"

  # ===========================================
  # Cache (Redis)
  # ===========================================
  cache:
    image: redis:7-alpine
    container_name: ${APP_NAME:-app}-cache
    restart: unless-stopped

    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true

    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          memory: 256M

    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

    networks:
      - backend

    volumes:
      - cache_data:/data
    tmpfs:
      - /tmp:size=50M

    command: >
      redis-server
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru

    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"

  # ===========================================
  # Reverse Proxy (Nginx)
  # ===========================================
  nginx:
    image: nginx:alpine
    container_name: ${APP_NAME:-app}-nginx
    restart: unless-stopped

    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 256M

    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3

    networks:
      - frontend
    ports:
      - "80:80"
      - "443:443"

    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    tmpfs:
      - /var/cache/nginx:size=100M
      - /var/run:size=10M

    depends_on:
      app:
        condition: service_healthy

    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

# ===========================================
# Networks
# ===========================================
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access

# ===========================================
# Volumes
# ===========================================
volumes:
  app_data:
  db_data:
  cache_data:

# ===========================================
# Secrets
# ===========================================
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Development Override (docker-compose.dev.yml)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: builder  # Use build stage for hot reload
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DEBUG=*
    ports:
      - "9229:9229"  # Debug port
    command: npm run dev

  database:
    ports:
      - "5432:5432"  # Expose for local tools

  cache:
    ports:
      - "6379:6379"  # Expose for local tools
```

## Production Override (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  app:
    image: ${REGISTRY}/app:${VERSION}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      rollback_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        tag: app.{{.Name}}
```

## Common Service Configurations

### Message Queue (RabbitMQ)

```yaml
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: ${APP_NAME}-mq
    restart: unless-stopped

    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G

    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

    networks:
      - backend
    ports:
      - "15672:15672"  # Management UI (dev only)

    volumes:
      - mq_data:/var/lib/rabbitmq

    environment:
      - RABBITMQ_DEFAULT_USER=${MQ_USER:-rabbit}
      - RABBITMQ_DEFAULT_PASS_FILE=/run/secrets/mq_password

    secrets:
      - mq_password
```

### Elasticsearch

```yaml
  elasticsearch:
    image: elasticsearch:8.12.0
    container_name: ${APP_NAME}-es
    restart: unless-stopped

    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          memory: 4G

    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

    networks:
      - backend

    volumes:
      - es_data:/usr/share/elasticsearch/data

    environment:
      - discovery.type=single-node
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD_FILE=/run/secrets/es_password
      - "ES_JAVA_OPTS=-Xms4g -Xmx4g"

    secrets:
      - es_password

    ulimits:
      memlock:
        soft: -1
        hard: -1
```

### MongoDB

```yaml
  mongodb:
    image: mongo:7
    container_name: ${APP_NAME}-mongo
    restart: unless-stopped

    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G

    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 5

    networks:
      - backend

    volumes:
      - mongo_data:/data/db

    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USER:-admin}
      - MONGO_INITDB_ROOT_PASSWORD_FILE=/run/secrets/mongo_password

    secrets:
      - mongo_password
```

## Usage Commands

```bash
# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# With specific env file
docker compose --env-file .env.production up -d

# Scale
docker compose up -d --scale app=3

# Update single service
docker compose up -d --no-deps app

# View logs
docker compose logs -f --tail=100

# Restart service
docker compose restart app

# Down with volume cleanup
docker compose down -v
```
