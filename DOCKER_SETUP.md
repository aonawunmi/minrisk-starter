# MinRisk Docker Setup Guide

## Multi-Tenant Architecture (Option 1)

This guide covers deploying MinRisk using **Database-Level Multi-Tenancy**, where a single container instance serves multiple organizations with data isolation handled by Supabase Row-Level Security (RLS).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Building the Image](#building-the-image)
5. [Running the Container](#running-the-container)
6. [Multi-Tenant Deployment](#multi-tenant-deployment)
7. [Environment Variables](#environment-variables)
8. [Production Deployment](#production-deployment)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Internet Traffic                       │
│   213capital.minrisk.com | fmdq.minrisk.com | ...      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Load Balancer / Reverse Proxy               │
│                   (nginx, Cloudflare)                    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              MinRisk Docker Container                    │
│           (Serves ALL tenants from one instance)         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Nginx Web Server (Port 80)              │   │
│  │     Serves static React build (SPA)             │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Supabase Database (Shared)                  │
│                                                          │
│  Organizations Table:                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ org_id: xxx-xxx-xxx → 213 Capital              │   │
│  │ org_id: yyy-yyy-yyy → FMDQ                      │   │
│  │ org_id: zzz-zzz-zzz → SEC                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  RLS Policies: Users only see their organization's data  │
└──────────────────────────────────────────────────────────┘
```

**Key Points:**
- **One container** serves all clients
- **One Supabase database** with RLS for data isolation
- **User authentication** determines which organization's data they access
- **Cost-effective** and easy to maintain

---

## Prerequisites

### Required Software
- Docker (v20.10+) - [Install Docker](https://docs.docker.com/get-docker/)
- Docker Compose (v2.0+) - Usually included with Docker Desktop
- Git (for cloning the repository)

### Required Accounts
- **Supabase** account with a project created
- **Anthropic** API key for Claude AI features

### Verify Installation
```bash
docker --version
# Docker version 24.0.0 or higher

docker-compose --version
# Docker Compose version v2.20.0 or higher
```

---

## Quick Start

### 1. Clone the Repository
```bash
git clone <your-minrisk-repo>
cd minrisk-starter
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.docker.example .env

# Edit .env with your credentials
nano .env
```

**Required values in `.env`:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### 3. Build and Run
```bash
# Build and start the container
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Access the Application
Open your browser to: **http://localhost**

---

## Building the Image

### Development Build
```bash
docker build -t minrisk:dev .
```

### Production Build with Environment Variables
```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-key \
  --build-arg VITE_ANTHROPIC_API_KEY=your-anthropic-key \
  -t minrisk:v1.0.0 .
```

### Multi-platform Build (for cloud deployment)
```bash
# Build for both AMD64 (Intel/AMD) and ARM64 (Apple Silicon)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/minrisk:v1.0.0 \
  --push .
```

---

## Running the Container

### Using Docker Compose (Recommended)
```bash
# Start in detached mode
docker-compose up -d

# Start with live logs
docker-compose up

# Stop the container
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Using Docker Run
```bash
docker run -d \
  --name minrisk \
  -p 80:80 \
  -e VITE_SUPABASE_URL=https://your-project.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your-key \
  -e VITE_ANTHROPIC_API_KEY=your-key \
  --restart unless-stopped \
  minrisk:v1.0.0
```

### Health Check
```bash
# Check container health
curl http://localhost/health

# Expected response: "healthy"
```

---

## Multi-Tenant Deployment

### How It Works

1. **All organizations use the same Supabase database**
2. **Each organization has a unique `organization_id`**
3. **Supabase RLS policies ensure data isolation**
4. **Users see only their organization's data**

### Adding a New Client/Organization

#### Step 1: Create Organization in Database
```sql
-- Connect to your Supabase database
INSERT INTO organizations (id, name, institution_type, default_regulator, settings)
VALUES (
  uuid_generate_v4(),
  'FMDQ Securities Exchange',
  'Capital Markets',
  'SEC',
  '{"currency": "NGN", "timezone": "Africa/Lagos"}'::jsonb
);
```

#### Step 2: Setup DNS
Point the new subdomain to your container's IP:

```dns
# DNS A Records
213capital.minrisk.com  →  Your-Server-IP
fmdq.minrisk.com        →  Your-Server-IP
sec.minrisk.com         →  Your-Server-IP
```

#### Step 3: Users Sign Up
New users register at their organization's subdomain:
- `https://fmdq.minrisk.com/signup`
- They'll be automatically associated with the organization

**That's it!** The container already serves all domains. No rebuild or restart needed.

### Subdomain Routing

The nginx configuration (`nginx.conf`) accepts all domains:
```nginx
server_name _;  # Accepts any domain
```

Organization identification happens at the **application level** through:
1. User authentication (Supabase Auth)
2. User's `organization_id` in the database
3. RLS policies filtering data by `organization_id`

---

## Environment Variables

### Build-Time Variables (Set during `docker build`)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude AI |

### Runtime Variables (Set during `docker run`)
| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NODE_ENV` | No | Environment mode | `production` |
| `APP_VERSION` | No | Application version | `1.0.0` |

**Note:** Vite environment variables are baked into the build at compile time, so changes require rebuilding the image.

---

## Production Deployment

### Cloud Platforms

#### AWS (ECS/Fargate)
```bash
# 1. Push image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker tag minrisk:v1.0.0 <account-id>.dkr.ecr.us-east-1.amazonaws.com/minrisk:v1.0.0

docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/minrisk:v1.0.0

# 2. Create ECS task definition with environment variables
# 3. Deploy to ECS service
```

#### Google Cloud Run
```bash
# 1. Build and push to GCR
gcloud builds submit --tag gcr.io/your-project/minrisk:v1.0.0

# 2. Deploy to Cloud Run
gcloud run deploy minrisk \
  --image gcr.io/your-project/minrisk:v1.0.0 \
  --platform managed \
  --region us-central1 \
  --set-env-vars VITE_SUPABASE_URL=https://...,VITE_SUPABASE_ANON_KEY=...
```

#### DigitalOcean App Platform
```bash
# 1. Push to Docker Hub or DigitalOcean Container Registry
docker tag minrisk:v1.0.0 your-username/minrisk:v1.0.0
docker push your-username/minrisk:v1.0.0

# 2. Create app via DigitalOcean dashboard
# 3. Set environment variables in the dashboard
```

### SSL/HTTPS Setup

#### Option 1: Cloud Platform SSL (Recommended)
Most cloud platforms provide automatic SSL:
- **AWS**: Use ALB with ACM certificate
- **Google Cloud Run**: Automatic HTTPS
- **DigitalOcean**: Automatic Let's Encrypt certificates

#### Option 2: Nginx + Let's Encrypt
Uncomment the HTTPS section in `nginx.conf` and mount certificates:

```yaml
# docker-compose.yml
services:
  minrisk-web:
    volumes:
      - ./ssl:/etc/nginx/ssl
    ports:
      - "443:443"
```

Generate certificates:
```bash
certbot certonly --standalone -d 213capital.minrisk.com
cp /etc/letsencrypt/live/213capital.minrisk.com/fullchain.pem ./ssl/cert.pem
cp /etc/letsencrypt/live/213capital.minrisk.com/privkey.pem ./ssl/key.pem
```

---

## Monitoring & Maintenance

### View Logs
```bash
# Live logs
docker-compose logs -f minrisk-web

# Last 100 lines
docker-compose logs --tail=100 minrisk-web

# Filter logs
docker-compose logs minrisk-web | grep ERROR
```

### Container Stats
```bash
# Resource usage
docker stats minrisk

# Inspect container
docker inspect minrisk
```

### Updates and Rollbacks

#### Deploy New Version
```bash
# 1. Build new version
docker build -t minrisk:v1.1.0 .

# 2. Tag as latest
docker tag minrisk:v1.1.0 minrisk:latest

# 3. Restart with new version
docker-compose up -d
```

#### Rollback to Previous Version
```bash
# 1. Switch to previous tag
docker tag minrisk:v1.0.0 minrisk:latest

# 2. Restart
docker-compose up -d --force-recreate
```

### Scaling

#### Horizontal Scaling (Multiple Containers)
```yaml
# docker-compose.yml
services:
  minrisk-web:
    deploy:
      replicas: 3  # Run 3 instances
    ports:
      - "80-82:80"  # Map to different host ports
```

Or use a load balancer:
```bash
# Run multiple instances behind nginx load balancer
docker-compose up -d --scale minrisk-web=3
```

---

## Troubleshooting

### Container Won't Start
```bash
# Check logs for errors
docker-compose logs minrisk-web

# Common issues:
# 1. Port 80 already in use
docker ps | grep :80
# Solution: Change port in docker-compose.yml

# 2. Missing environment variables
# Solution: Check .env file exists and has correct values

# 3. Build failed
# Solution: Check Dockerfile and rebuild
docker-compose build --no-cache
```

### Application Not Loading
```bash
# 1. Check if container is running
docker ps

# 2. Check nginx is serving files
docker exec -it minrisk ls -la /usr/share/nginx/html

# 3. Check nginx configuration
docker exec -it minrisk nginx -t

# 4. Check logs
docker-compose logs -f minrisk-web
```

### Performance Issues
```bash
# Check resource usage
docker stats minrisk

# If CPU/Memory is high:
# 1. Set resource limits in docker-compose.yml
services:
  minrisk-web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

# 2. Scale horizontally
docker-compose up -d --scale minrisk-web=3
```

### Database Connection Issues
```bash
# Test Supabase connection from container
docker exec -it minrisk sh
apk add curl
curl -I https://your-project.supabase.co

# Check environment variables are set
docker exec minrisk env | grep VITE_SUPABASE
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Supabase Documentation](https://supabase.com/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## Support

For issues or questions:
1. Check this documentation
2. Review container logs: `docker-compose logs -f`
3. Check [MinRisk GitHub Issues](your-repo-url)
4. Contact: ayodele.onawunmi@gmail.com

---

**Last Updated:** November 12, 2025
**Version:** 1.0.0
