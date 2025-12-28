# 🚀 Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Qdrant (optional, for AI features)

## Environment Setup

1. **Production Server**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql-14

# Install Redis
sudo apt-get install redis-server
```

2. **Clone Repository**
```bash
git clone https://github.com/your-org/omni-backend.git
cd omni-backend
```

3. **Configure Environment**
```bash
cp .env.example .env
nano .env

# Set production values:
# - NODE_ENV=production
# - Strong JWT secrets
# - Production database URL
# - CORS_ORIGIN with your domain
```

4. **Install Dependencies**
```bash
npm ci --production
```

5. **Database Migration**
```bash
npx prisma migrate deploy
npx prisma generate
```

6. **Build**
```bash
npm run build
```

7. **Start with PM2**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server.js --name omni-backend

# Save PM2 config
pm2 save

# Setup auto-restart on boot
pm2 startup
```

## Docker Deployment

```bash
# Build image
docker build -t omni-backend:latest .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.omni.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.omni.com
```

## Monitoring

```bash
# PM2 monitoring
pm2 monit

# Logs
pm2 logs omni-backend
tail -f logs/omni.log
```

## Backup

```bash
# Database backup
pg_dump -U postgres omni_db > backup_$(date +%Y%m%d).sql

# Automated backups (cron)
0 2 * * * /usr/bin/pg_dump -U postgres omni_db > /backups/omni_$(date +\%Y\%m\%d).sql
```

## Health Check

```bash
curl https://api.omni.com/health
```

Should return:
```json
{"status":"ok","timestamp":"...","uptime":123}
```
