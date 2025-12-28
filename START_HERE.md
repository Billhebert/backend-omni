# 🚀 OMNI PLATFORM - START HERE

## ⚡ Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env - CHANGE JWT_SECRET to a random 32+ character string!
```

### 3. Setup Database
```bash
# Start PostgreSQL (if not running)
# Then:
npx prisma migrate dev
npx prisma generate
npx tsx prisma/seed.ts
```

### 4. Start Server
```bash
npm run dev
```

✅ **Server running at:** http://localhost:3001
📚 **API Docs:** http://localhost:3001/docs

### 5. Test Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.omni.com",
    "password": "admin123",
    "companyId": "[YOUR_COMPANY_ID]"
  }'
```

Get company ID from database or seed output.

---

## 📦 What's Included

### ✅ Complete Modules
- **Auth** - JWT, refresh tokens, role-based access
- **HRM** - Learning, Performance, Skill Matching
- **CRM** - Contacts, Deals, Pipeline
- **ERP** - Finance, Inventory, Projects
- **Knowledge** - AI-powered Zettelkasten
- **Chat** - AI assistant

### ✅ Production Ready
- Security (Helmet, Rate Limiting)
- Validation (Zod)
- Logging (Pino)
- Docker support
- CI/CD (GitHub Actions)
- API Documentation (Swagger)
- Testing setup (Jest)

---

## 📁 Project Structure

```
omni-backend-full/
├── src/
│   ├── config/         # Env, database, redis
│   ├── middleware/     # Auth, validation
│   ├── utils/          # Logger, crypto, email
│   ├── modules/
│   │   ├── auth/       # Authentication
│   │   ├── hrm/        # Human Resources
│   │   │   ├── learning/
│   │   │   ├── positions/
│   │   │   ├── development/
│   │   │   └── performance/
│   │   ├── crm/        # Customer Relations
│   │   │   ├── contacts/
│   │   │   ├── deals/
│   │   │   └── interactions/
│   │   ├── erp/        # Enterprise Planning
│   │   │   ├── finance/
│   │   │   ├── inventory/
│   │   │   └── projects/
│   │   ├── knowledge/  # AI Knowledge Base
│   │   └── chat/       # AI Chat
│   └── jobs/           # Background workers
├── prisma/
│   ├── schema.prisma   # 23+ tables
│   └── seed.ts         # Initial data
├── tests/              # Test files
├── docker/             # Docker configs
├── docs/               # Documentation
└── scripts/            # Utility scripts
```

---

## 🎯 Next Steps

### Development
1. **Read docs:** `README.md`
2. **API Documentation:** http://localhost:3001/docs
3. **Add features:** Check `src/modules/`

### Production
1. **Read deployment guide:** `docs/DEPLOY.md`
2. **Setup Docker:** `docker-compose up -d`
3. **Configure SSL:** See deployment guide

---

## 🔐 Security Checklist

Before production:
- [ ] Change all secrets in `.env`
- [ ] Set strong JWT_SECRET (min 32 chars)
- [ ] Configure CORS_ORIGIN with your domain
- [ ] Enable rate limiting
- [ ] Setup SSL/HTTPS
- [ ] Configure backups
- [ ] Review security headers

---

## 📚 Documentation

- `README.md` - Main documentation
- `docs/DEPLOY.md` - Deployment guide
- `docs/SETUP_GUIDE.md` - Detailed setup
- API Docs - http://localhost:3001/docs (when running)

---

## 🆘 Troubleshooting

**Port already in use?**
```bash
# Change PORT in .env
PORT=3002
```

**Database connection error?**
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
```

**Migration error?**
```bash
# Reset database
npx prisma migrate reset
```

---

## ✅ Checklist

- [ ] Dependencies installed
- [ ] `.env` configured
- [ ] Database migrated
- [ ] Seed data loaded
- [ ] Server starts successfully
- [ ] Can login with demo credentials
- [ ] API docs accessible

---

## 🎉 All Set!

Your OMNI Platform backend is ready for development!

**Need help?** Check documentation or create an issue.

**Happy coding!** 🚀
