# Docker Deployment Guide

This guide covers how to deploy the Motorcycle Intercom application using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd motorcycle-intercom
```

2. Create environment files:
```bash
# Frontend .env
cat > .env << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# Backend .env
cat > backend/.env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://intercom_user:intercom_password@postgres:5432/motorcycle_intercom
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CORS_ORIGIN=http://localhost:3000
EOF
```

3. Build and start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

5. View logs:
```bash
docker-compose logs -f
```

6. Stop services:
```bash
docker-compose down
```

## Manual Docker Build

### Build Frontend

```bash
# Build the image
docker build -t motorcycle-intercom-frontend .

# Run the container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3001 \
  motorcycle-intercom-frontend
```

### Build Backend

```bash
cd backend

# Build the image
docker build -t motorcycle-intercom-backend .

# Run the container
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  -e JWT_SECRET=your-secret-key \
  -e CORS_ORIGIN=http://localhost:3000 \
  motorcycle-intercom-backend
```

## Environment Variables

### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (backend/.env)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CORS_ORIGIN=http://localhost:3000
```

## Production Deployment

### Using Docker Compose with Production Settings

1. Update `docker-compose.yml` with production environment variables
2. Use production-grade secrets for JWT and database passwords
3. Configure proper volume mounts for data persistence
4. Set up proper networking and security groups

```bash
# Build with production configuration
docker-compose -f docker-compose.prod.yml up -d
```

### Using Docker Swarm or Kubernetes

For large-scale deployments, consider using:
- Docker Swarm for container orchestration
- Kubernetes for advanced orchestration and scaling

## Docker Compose Services

### postgres
- PostgreSQL 15 database
- Port: 5432
- Volume: postgres_data (persistent storage)
- Health check: Ensures database is ready before other services start

### backend
- Node.js API server
- Port: 3001
- Depends on: postgres (healthy)
- Health check: Ensures API is responding

### frontend
- Next.js application
- Port: 3000
- Depends on: backend (healthy)

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs <service-name>
```

### Database connection issues

Ensure PostgreSQL is healthy:
```bash
docker-compose ps postgres
```

Check database logs:
```bash
docker-compose logs postgres
```

### Port conflicts

If ports 3000, 3001, or 5432 are already in use, modify the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "3001:3001"  # Change to "8080:3001" for example
```

### Rebuild after code changes

```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## Performance Optimization

### Multi-stage builds

The Dockerfiles use multi-stage builds to:
- Reduce final image size
- Separate build dependencies from runtime dependencies
- Improve build caching

### Resource limits

Add resource limits to `docker-compose.yml`:
```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Security Best Practices

1. **Never commit .env files** - Use environment variables in production
2. **Use secrets management** - For JWT secrets and database passwords
3. **Run as non-root user** - Both Dockerfiles use non-root users
4. **Keep images updated** - Regularly update base images
5. **Scan for vulnerabilities** - Use tools like Docker Scout or Trivy
6. **Use minimal base images** - Alpine Linux for smaller attack surface

## Backup and Recovery

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U intercom_user motorcycle_intercom > backup.sql

# Restore
cat backup.sql | docker-compose exec -T postgres psql -U intercom_user motorcycle_intercom
```

### Volume Backup

```bash
# Backup volume
docker run --rm -v motorcycle-intercom_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore volume
docker run --rm -v motorcycle-intercom_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

## Monitoring

### View container stats

```bash
docker stats
```

### View resource usage

```bash
docker-compose top
```

## Cleanup

### Remove all containers and volumes

```bash
docker-compose down -v
```

### Remove unused images

```bash
docker image prune -a
```

### Remove unused volumes

```bash
docker volume prune
```
