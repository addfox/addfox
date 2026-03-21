# Docker Troubleshooting Guide

## Build Issues

### "COPY failed: file not found"

**Cause**: File path wrong or excluded by .dockerignore

**Diagnosis**:
```bash
# Check build context
ls -la path/to/file

# Check .dockerignore
cat .dockerignore | grep filename
```

**Solution**:
- Path is relative to build context (where Dockerfile is)
- Remove from .dockerignore if accidentally excluded
- Check for typos in path

### "returned a non-zero code"

**Cause**: Command in RUN instruction failed

**Diagnosis**:
```bash
# Build with plain progress to see full output
docker build --progress=plain --no-cache .

# Or build interactively up to the failing step
docker build --target [previous-stage] -t debug .
docker run -it debug /bin/sh
# Then manually run the failing command
```

**Solution**:
- Fix the command based on error output
- Check if dependencies are installed
- Verify network access if downloading

### "no space left on device"

**Cause**: Docker disk full

**Solution**:
```bash
# Check usage
docker system df

# Clean up
docker system prune -a      # Remove unused images, containers
docker volume prune         # Remove unused volumes
docker builder prune -a     # Remove build cache
```

### "network unreachable" during build

**Cause**: DNS or network issues in build container

**Solution**:
```bash
# Use host network for build
docker build --network=host .

# Or configure DNS
docker build --dns=8.8.8.8 .
```

## Startup Issues

### Container exits immediately (exit code 0)

**Cause**: No foreground process

**Diagnosis**:
```bash
docker logs [container]
docker inspect [container] --format='{{.Config.Cmd}}'
```

**Solution**:
- Use exec form: `CMD ["npm", "start"]` not `CMD npm start`
- Don't daemonize the process
- Ensure process runs in foreground

### "exec format error"

**Cause**: Image built for different architecture

**Solution**:
```bash
# Check image architecture
docker inspect --format='{{.Architecture}}' [image]

# Build for correct platform
docker build --platform linux/amd64 .

# Or use buildx for multi-platform
docker buildx build --platform linux/amd64,linux/arm64 .
```

### "permission denied"

**Cause**: Non-root user can't access files

**Diagnosis**:
```bash
docker run -it --entrypoint /bin/sh [image]
ls -la /app
id
```

**Solution**:
```dockerfile
# Ensure ownership matches container user
COPY --chown=app:app . .

# Or fix permissions
RUN chown -R app:app /app
```

### "port already allocated"

**Cause**: Port in use on host

**Solution**:
```bash
# Find what's using the port
lsof -i :8080
docker ps --format "{{.Names}}: {{.Ports}}" | grep 8080

# Use different port
docker run -p 8081:8080 [image]
```

## Runtime Issues

### "OOMKilled: true"

**Cause**: Container exceeded memory limit

**Diagnosis**:
```bash
docker inspect [container] --format='{{.State.OOMKilled}}'
docker stats [container]
```

**Solution**:
```bash
# Increase memory limit
docker run --memory=4g [image]

# Or fix memory leak in application
# Profile with tools like clinic.js (Node), VisualVM (Java)
```

### Health check failing

**Cause**: Application not ready or check wrong

**Diagnosis**:
```bash
# Check health status
docker inspect --format='{{json .State.Health}}' [container] | jq

# Test health check manually
docker exec [container] curl -f http://localhost:8080/health
```

**Solution**:
- Increase `start_period` for slow-starting apps
- Fix health endpoint
- Verify port and path are correct

### Container keeps restarting

**Diagnosis**:
```bash
# Stop restart loop
docker update --restart=no [container]

# Check logs
docker logs [container]

# Check exit code
docker inspect --format='{{.State.ExitCode}}' [container]
```

**Common causes**:
- Exit code 1: Application error
- Exit code 137: OOM killed (128 + 9)
- Exit code 143: SIGTERM (128 + 15)

## Network Issues

### Can't reach other containers

**Diagnosis**:
```bash
# Check networks
docker network ls
docker inspect [container] --format='{{json .NetworkSettings.Networks}}' | jq

# Test connectivity
docker exec [container] ping [other-container]
docker exec [container] nslookup [service-name]
```

**Solution**:
- Ensure containers on same network
- Use service names, not container names or IPs
- Check if target service is healthy

### "connection refused"

**Cause**: Service not listening or wrong port

**Diagnosis**:
```bash
# Check if port is listening inside container
docker exec [container] netstat -tlnp
docker exec [container] ss -tlnp

# Check from another container
docker exec [other-container] curl -v http://[service]:8080
```

**Solution**:
- Verify service is binding to 0.0.0.0, not 127.0.0.1
- Check correct port number
- Wait for service to be ready (use depends_on with condition)

### DNS resolution fails

**Diagnosis**:
```bash
docker exec [container] cat /etc/resolv.conf
docker exec [container] nslookup google.com
```

**Solution**:
```bash
# Use Docker's built-in DNS
docker run --dns=127.0.0.11 [image]

# Or specify external DNS
docker run --dns=8.8.8.8 [image]
```

## Volume Issues

### "permission denied" on volume

**Cause**: UID mismatch between container and host

**Diagnosis**:
```bash
# Check host permissions
ls -la /path/to/volume

# Check container user
docker exec [container] id
```

**Solution**:
```bash
# Option 1: Match UID in container
RUN adduser -u $(stat -c %u /host/path) app

# Option 2: Fix host permissions
sudo chown -R 1001:1001 /path/to/volume

# Option 3: Use named volumes (Docker manages permissions)
docker volume create mydata
docker run -v mydata:/app/data [image]
```

### Data not persisting

**Diagnosis**:
```bash
# Check mount type
docker inspect [container] --format='{{json .Mounts}}' | jq

# Verify volume exists
docker volume ls
docker volume inspect [volume]
```

**Solution**:
- Use named volumes, not anonymous
- Ensure mount path matches where app writes
- Don't recreate volumes on `down -v`

### Volume is empty

**Cause**: Mount path shadows container data

**Solution**:
- Copy data to volume before mounting
- Or initialize data in entrypoint script
```bash
# Entrypoint pattern
if [ ! -f /data/initialized ]; then
    cp -r /app/default-data/* /data/
    touch /data/initialized
fi
```

## Performance Issues

### Container is slow

**Diagnosis**:
```bash
# Check resources
docker stats [container]

# Check processes
docker top [container]

# Profile inside container
docker exec [container] top
docker exec [container] iostat
```

**Common causes**:
- CPU throttling: increase `--cpus`
- Memory pressure: increase `--memory`
- I/O bottleneck: check volume driver, use faster storage
- Network latency: check DNS, network mode

### High disk usage

**Diagnosis**:
```bash
docker system df -v
```

**Solution**:
```bash
# Clean unused resources
docker system prune -a --volumes

# Limit log size
docker run --log-opt max-size=100m --log-opt max-file=3 [image]

# Use multi-stage builds for smaller images
```

## Quick Reference: Exit Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 0 | Success | Process exited normally (might be a problem if unexpected) |
| 1 | Generic error | Application error |
| 126 | Permission denied | Can't execute command |
| 127 | Command not found | Wrong CMD/ENTRYPOINT |
| 137 | SIGKILL (128+9) | OOM killed or `docker kill` |
| 139 | SIGSEGV (128+11) | Segmentation fault |
| 143 | SIGTERM (128+15) | `docker stop` graceful shutdown |

## Quick Reference: Diagnostic Commands

```bash
# Container info
docker ps -a                                    # List all containers
docker logs [container]                         # View logs
docker logs --tail 100 -f [container]          # Follow recent logs
docker inspect [container]                      # Full container details
docker stats [container]                        # Live resource usage
docker top [container]                          # Running processes

# Image info
docker images                                   # List images
docker history [image]                          # Show layers
docker inspect [image]                          # Image details

# Network info
docker network ls                               # List networks
docker network inspect [network]                # Network details
docker exec [container] cat /etc/hosts         # Container hosts file

# Storage info
docker volume ls                                # List volumes
docker system df                                # Disk usage
docker inspect -f '{{json .Mounts}}' [c]       # Container mounts

# Interactive debugging
docker exec -it [container] /bin/sh            # Shell into container
docker run -it --entrypoint /bin/sh [image]    # Override entrypoint
docker run -it --rm nicolaka/netshoot          # Network debugging tools
```
