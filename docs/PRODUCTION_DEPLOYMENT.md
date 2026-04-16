# Production Deployment Guide

This guide covers deploying the Motorcycle Intercom application to production using Vercel for the frontend and DigitalOcean/AWS for the backend.

## Architecture Overview

```
┌─────────────────┐
│   Vercel (CDN)  │ ← Frontend (Next.js)
└────────┬────────┘
         │
         ↓ HTTPS
┌─────────────────┐
│  DigitalOcean   │ ← Backend API (Express + Socket.io)
│  / AWS EC2      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PostgreSQL     │ ← Database (RDS/DigitalOcean DB)
└─────────────────┘
```

## Prerequisites

- Vercel account
- DigitalOcean/AWS account
- Domain name (optional)
- PostgreSQL database (RDS or managed service)
- SSL certificates (managed by Vercel)

## Frontend Deployment (Vercel)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy Frontend

```bash
# From the project root
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Project name: motorcycle-intercom
# - Link to existing project? No
# - Directory: ./
# - Override settings? No
```

### 4. Configure Environment Variables

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add the following variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-api.com
   ```

### 5. Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed by Vercel
4. Vercel automatically provisions SSL certificates

### 6. Production Deployment

```bash
vercel --prod
```

## Backend Deployment (DigitalOcean)

### Option A: DigitalOcean App Platform (Recommended)

#### 1. Create App

1. Go to DigitalOcean Control Panel → Apps
2. Click "Create App"
3. Select "Deploy a Docker Image"

#### 2. Configure Backend

```yaml
# app.yaml
name: motorcycle-intercom-backend
services:
- name: backend
  image:
    registry_type: DOCKER_HUB
    repository: your-username/motorcycle-intercom-backend
    tag: latest
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "3001"
  - key: DATABASE_URL
    value: ${DATABASE_URL}
  - key: JWT_SECRET
    value: ${JWT_SECRET}
  - key: CORS_ORIGIN
    value: ${CORS_ORIGIN}
  ports:
  - port: 3001
    protocol: HTTP
  health_check:
    http_path: /health
```

#### 3. Deploy

```bash
# Push Docker image to Docker Hub
docker build -t your-username/motorcycle-intercom-backend ./backend
docker push your-username/motorcycle-intercom-backend

# Deploy to DigitalOcean
doctl apps create --spec app.yaml
```

### Option B: DigitalOcean Droplet

#### 1. Create Droplet

- Image: Ubuntu 22.04 LTS
- Plan: Basic (4GB RAM, 2 vCPUs minimum)
- Enable SSH keys

#### 2. Connect to Droplet

```bash
ssh root@your-droplet-ip
```

#### 3. Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### 4. Clone Repository

```bash
git clone <your-repository-url>
cd motorcycle-intercom
```

#### 5. Configure Environment

```bash
# Create .env file
cat > backend/.env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CORS_ORIGIN=https://your-frontend-domain.vercel.app
EOF
```

#### 6. Deploy with Docker Compose

```bash
docker-compose up -d
```

#### 7. Configure Nginx (Optional)

```nginx
# /etc/nginx/sites-available/motorcycle-intercom
server {
    listen 80;
    server_name your-backend-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/motorcycle-intercom /etc/nginx/sites-enabled/

# Test and restart nginx
nginx -t
systemctl restart nginx
```

#### 8. Configure SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain certificate
certbot --nginx -d your-backend-domain.com

# Auto-renewal is configured automatically
```

## Backend Deployment (AWS EC2)

### 1. Launch EC2 Instance

- AMI: Ubuntu 22.04 LTS
- Instance Type: t3.medium (2 vCPUs, 4GB RAM)
- Security Group: Allow HTTP (80), HTTPS (443), Custom TCP (3001)
- Key Pair: Create and download

### 2. Connect to Instance

```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

### 3. Install Dependencies

```bash
# Same as DigitalOcean Droplet setup
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 4. Clone and Deploy

```bash
git clone <your-repository-url>
cd motorcycle-intercom
# Configure environment variables
docker-compose up -d
```

### 5. Configure Load Balancer (Optional)

For high availability, use AWS Application Load Balancer (ALB):
1. Create ALB in EC2 console
2. Configure target group pointing to EC2 instances
3. Configure health checks on /health endpoint
4. Set up SSL certificate with AWS Certificate Manager

## Database Setup

### Option A: AWS RDS

1. Go to RDS console
2. Create PostgreSQL database
3. Configure:
   - Engine: PostgreSQL 15
   - Instance class: db.t3.micro (dev) or db.t3.medium (prod)
   - Storage: 20GB minimum
   - VPC: Create new VPC or use existing
   - Security group: Allow access from EC2 instance
4. Note connection string for environment variable

### Option B: DigitalOcean Managed Database

1. Go to Databases → Create Database
2. Select PostgreSQL
3. Configure:
   - Plan: Basic (4GB RAM, 2 vCPUs)
   - Region: Same as app
   - Cluster name: motorcycle-intercom-db
4. Add Trusted Sources: App/Droplet IP
5. Note connection string for environment variable

### Option C: Self-hosted PostgreSQL

Use the PostgreSQL container in docker-compose.yml (for development/testing only).

## Environment Variables

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### Backend (DigitalOcean/AWS)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

## Monitoring and Logging

### Vercel Monitoring

- Access logs in Vercel dashboard
- Analytics for traffic and performance
- Error tracking built-in

### Backend Monitoring

```bash
# View logs
docker-compose logs -f backend

# View container stats
docker stats
```

### Application Monitoring

Consider adding:
- Sentry for error tracking
- DataDog or New Relic for APM
- Log aggregation with Papertrail or Loggly

## Scaling

### Frontend (Vercel)

- Vercel automatically scales based on traffic
- Edge caching for static assets
- Serverless functions for API routes

### Backend Scaling

#### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3  # Run 3 instances
```

#### Load Balancing

- Use AWS ALB or DigitalOcean Load Balancer
- Configure health checks
- Enable auto-scaling groups (AWS)

### Database Scaling

- Use read replicas for read-heavy workloads
- Upgrade instance class for more resources
- Enable connection pooling

## Security Best Practices

1. **Use environment variables** - Never commit secrets
2. **Enable HTTPS** - SSL/TLS for all endpoints
3. **Secure JWT secrets** - Use strong, randomly generated secrets
4. **Database security** - Use managed database services
5. **Regular updates** - Keep dependencies updated
6. **Firewall rules** - Only allow necessary ports
7. **Rate limiting** - Implement API rate limiting
8. **Input validation** - Validate all user inputs
9. **CORS configuration** - Only allow trusted origins
10. **Backup strategy** - Regular database backups

## Backup Strategy

### Database Backups

```bash
# AWS RDS: Automated backups enabled by default
# DigitalOcean: Enable automated backups in database settings

# Manual backup
docker-compose exec postgres pg_dump -U intercom_user motorcycle_intercom > backup.sql
```

### Application Backups

```bash
# Backup Docker volumes
docker run --rm -v motorcycle-intercom_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

## Cost Estimation

### Vercel (Frontend)
- Hobby: $0/month (limited)
- Pro: $20/month (more bandwidth, faster builds)
- Enterprise: Custom pricing

### DigitalOcean (Backend + DB)
- App Platform: $12-60/month (depending on plan)
- Droplet: $24-96/month (depending on size)
- Managed Database: $15-120/month (depending on plan)

### AWS (Backend + DB)
- EC2: $30-100/month (t3.medium to t3.large)
- RDS: $15-150/month (db.t3.micro to db.t3.medium)
- ALB: $18/month
- Data transfer: Additional costs

## Troubleshooting

### Frontend Issues

**Build failures:**
- Check Vercel build logs
- Ensure all dependencies are in package.json
- Verify environment variables

**Runtime errors:**
- Check browser console
- Verify API URL is correct
- Check CORS configuration

### Backend Issues

**Container won't start:**
- Check logs: `docker-compose logs backend`
- Verify environment variables
- Check database connection

**Database connection issues:**
- Verify DATABASE_URL is correct
- Check database security group allows connection
- Ensure database is running

**Socket.io connection issues:**
- Check WebSocket support in load balancer
- Verify CORS configuration
- Check firewall rules

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker image
        run: |
          docker build -t your-username/motorcycle-intercom-backend ./backend
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push your-username/motorcycle-intercom-backend
      - name: Deploy to DigitalOcean
        run: |
          doctl apps create --spec app.yaml
```

## Rollback Procedure

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

### Docker Rollback

```bash
# Stop current containers
docker-compose down

# Pull previous image version
docker pull your-username/motorcycle-intercom-backend:previous-tag

# Restart with previous version
docker-compose up -d
```

## Support

For deployment issues:
- Vercel: https://vercel.com/support
- DigitalOcean: https://docs.digitalocean.com/support
- AWS: https://aws.amazon.com/support
