# MinRisk Docker - Quick Start

## Status: Ready to Build ✅

Docker Desktop is installed and running. All configuration files have been created.

---

## Quick Build Commands

### Option 1: Using Full Path (Works Now)

```bash
# 1. Navigate to project
cd "/Users/AyodeleOnawunmi/Library/CloudStorage/OneDrive-FMDQSecuritiesExchange/Desktop/AY/CODING/MinRisk/Project File - MinRisk/minrisk-starter"

# 2. Create .env file
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://cnywkjfkhnwptceluvzs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNueXdramZraG53cHRjZWx1dnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDk1NTksImV4cCI6MjA3MzUyNTU1OX0.XSt2QsEfyRMgn6_YL-vJcTyM2nt_6AUOucBiaZDCTzg
VITE_ANTHROPIC_API_KEY=placeholder
NODE_ENV=production
EOF

# 3. Build the image (5-10 minutes)
/usr/local/bin/docker build -t minrisk:latest .

# 4. Run the container
/usr/local/bin/docker run -d --name minrisk -p 8080:80 minrisk:latest

# 5. Open in browser
open http://localhost:8080
```

### Option 2: Fix PATH and Use docker Normally

```bash
# Add docker to PATH (in your terminal or ~/.zshrc)
export PATH="/usr/local/bin:$PATH"

# Then use docker normally
docker build -t minrisk:latest .
docker run -d --name minrisk -p 8080:80 minrisk:latest
```

---

## What Was Created Today

1. ✅ `Dockerfile` - Production-ready multi-stage build
2. ✅ `docker-compose.yml` - Easy orchestration
3. ✅ `nginx.conf` - Production web server config
4. ✅ `.dockerignore` - Optimized build
5. ✅ `docker-entrypoint.sh` - Startup script
6. ✅ `.env.docker.example` - Configuration template
7. ✅ `DOCKER_SETUP.md` - Complete documentation

---

## Multi-Tenant Architecture

**Approach:** Database-Level Multi-Tenancy (Option 1)

- One container serves ALL clients
- One Supabase database with RLS isolation
- Add new clients by creating new organization_id in database
- Cost-effective and easy to maintain

---

## Common Commands

```bash
# Check running containers
/usr/local/bin/docker ps

# View logs
/usr/local/bin/docker logs minrisk

# Stop container
/usr/local/bin/docker stop minrisk

# Remove container
/usr/local/bin/docker rm minrisk

# Rebuild after code changes
/usr/local/bin/docker build -t minrisk:latest .
/usr/local/bin/docker stop minrisk && /usr/local/bin/docker rm minrisk
/usr/local/bin/docker run -d --name minrisk -p 8080:80 minrisk:latest
```

---

## Next Steps

**When ready to deploy:**

1. Test the Docker build locally (commands above)
2. Choose a cloud platform (AWS, Google Cloud, DigitalOcean)
3. Push image to container registry
4. Deploy to production
5. Setup domain and SSL

See `DOCKER_SETUP.md` for detailed deployment instructions.

---

## Notes

- Docker Desktop: ✅ Running
- Docker Version: 28.5.1
- Build Time: ~5-10 minutes (first time)
- Image Size: ~50MB (optimized)
- Port: 8080 (to avoid conflict with npm run dev on 5174)

---

**Ready to build when you are!**
