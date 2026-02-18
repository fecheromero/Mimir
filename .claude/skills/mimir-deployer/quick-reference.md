# Quick Reference Card

Fast lookup for common tasks in local development and production deployment.

## 🚀 Quick Start Commands

### Local Development

```bash
# 1. Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# 2. Start Backend (Terminal 1)
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# 3. Start Worker (Terminal 2)
cd backend && source venv/bin/activate
celery -A app.core.celery_app worker --loglevel=info

# 4. Start Frontend (Terminal 3)
cd frontend
npm run dev
```

### Production Deployment

```bash
# Push to deploy
git add .
git commit -m "Your changes"
git push

# Render and Vercel auto-deploy (~2-3 min)
```

## 📋 Environment URLs

| Environment | Backend | Frontend | Redis |
|-------------|---------|----------|-------|
| **Local** | http://localhost:8000 | http://localhost:5173 | localhost:6379 |
| **Production** | https://xxx.onrender.com | https://xxx.vercel.app | Render managed |

## 🔑 Environment Variables

### Backend (.env)

| Variable | Local | Production |
|----------|-------|------------|
| `LLM_PROVIDER` | `anthropic` | `anthropic` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | `sk-ant-...` |
| `REDIS_URL` | `redis://localhost:6379` | `redis://red-xxx:6379` |
| `FRONTEND_URL` | `http://localhost:5173` | `https://xxx.vercel.app` |
| `BROWSER_EXECUTION_MODE` | `local` | `cloud` (recommended) |

### Frontend (.env)

| Variable | Local | Production (Vercel) |
|----------|-------|---------------------|
| `VITE_API_URL` | `http://localhost:8000` | `https://xxx.onrender.com` |

## 🔧 Common Commands

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Start dev server
uvicorn app.main:app --reload

# Start Celery worker
celery -A app.core.celery_app worker --loglevel=info

# Run tests
pytest

# Format code
black .
```

### Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Git & Deploy

```bash
# Commit changes
git add .
git commit -m "Description"

# Push to trigger auto-deploy
git push

# Check deploy status
# Render: https://dashboard.render.com
# Vercel: https://vercel.com/dashboard
```

## 🐛 Debugging

### Check Services

```bash
# Backend health
curl http://localhost:8000/health         # Local
curl https://xxx.onrender.com/health      # Production

# CORS config
curl http://localhost:8000/debug/cors     # Local
curl https://xxx.onrender.com/debug/cors  # Production

# Redis connection (local)
docker exec -it <container-id> redis-cli
PING  # Should return PONG
```

### View Logs

```bash
# Local - Backend
# Check terminal running uvicorn

# Local - Worker
# Check terminal running celery

# Local - Frontend
# Browser console (F12)

# Production - Backend
# Render Dashboard → Service → Logs

# Production - Frontend
# Vercel Dashboard → Deployment → Logs
```

## 📁 File Locations

### Configuration

```
.
├── .python-version              # Python 3.11
├── backend/
│   ├── .env                     # Backend config (gitignored)
│   ├── requirements.txt         # Python deps
│   └── start.sh                 # Render startup (prod)
├── frontend/
│   ├── .env                     # Frontend config (gitignored)
│   └── package.json             # Node deps
└── .claude/skills/mimir-deployer/  # This skill
```

### Storage

```
backend/app/storage/jobs/        # Job files (ephemeral in prod)
```

## 🔄 Development Workflow

### Making Changes

1. **Edit code** in `backend/app/` or `frontend/src/`
2. **Test locally** (hot reload active)
3. **Commit**: `git commit -am "Change description"`
4. **Push**: `git push`
5. **Auto-deploy** (Render + Vercel)
6. **Verify** production deployment

### Adding Dependencies

**Backend:**
```bash
pip install <package>
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Add <package>"
git push
```

**Frontend:**
```bash
npm install <package>
git add package.json package-lock.json
git commit -m "Add <package>"
git push
```

## 🚨 Emergency Fixes

### CORS Error

```bash
# 1. Check FRONTEND_URL in Render
# Should be: https://xxx.vercel.app (with https://)

# 2. Verify CORS config
curl https://xxx.onrender.com/debug/cors

# 3. Check browser console for exact error
```

### 404 Not Found

```bash
# Backend logs show 404?
# Check route prefix - should be /api/...

# Verify in frontend/src/services/api.js:
# Routes should have /api prefix:
# ✅ /api/test-cases/generate
# ❌ /test-cases/generate
```

### Service Won't Start

```bash
# Render logs show error?
# Common causes:

# 1. Missing .python-version → Add it
echo "3.11" > .python-version

# 2. Missing env var → Check Render dashboard

# 3. Wrong start command → Should be:
./start.sh
```

### Worker Not Processing

```bash
# Local: Check if Celery worker is running
ps aux | grep celery

# Production: Check Render logs
# Should see: "celery@... ready"

# If missing, check start.sh includes:
# celery -A app.core.celery_app worker --loglevel=info &
```

## 📊 Health Check URLs

### Local

- Backend: http://localhost:8000/health
- API Docs: http://localhost:8000/docs
- CORS Debug: http://localhost:8000/debug/cors
- Frontend: http://localhost:5173

### Production

- Backend: https://xxx.onrender.com/health
- API Docs: https://xxx.onrender.com/docs
- CORS Debug: https://xxx.onrender.com/debug/cors
- Frontend: https://xxx.vercel.app

## 🔐 Security Checklist

- [ ] API keys in `.env` (not committed to git)
- [ ] `.env` in `.gitignore`
- [ ] CORS limited to specific origins (not `*`)
- [ ] HTTPS in production URLs
- [ ] Environment variables set in Render/Vercel dashboards
- [ ] Different API keys for dev/prod (recommended)

## 📚 Documentation Links

### Internal

- Full deployment guide: `SKILL.md`
- Local development: `local-development.md`
- Troubleshooting: `troubleshooting.md`
- Alternative platforms: `alternatives.md`
- Environment variables: `env-templates.md`

### External

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- Celery Docs: https://docs.celeryq.dev
- Vite Docs: https://vitejs.dev

## 🎯 Common Tasks

### Test End-to-End Locally

1. Start all services (Redis, Backend, Worker, Frontend)
2. Open http://localhost:5173
3. Generate test case:
   - Enter ticket description
   - Click "Generate"
   - Wait for results
4. Check all terminals for errors

### Deploy to Production

1. Ensure local works: `git status` (commit all changes)
2. Push: `git push`
3. Wait for deploys:
   - Render: ~2-3 min
   - Vercel: ~1-2 min
4. Test production:
   - Open Vercel URL
   - Try all features
   - Check Render logs for errors

### Rollback Production

**Render:**
1. Dashboard → Service → Manual Deploy
2. Select previous commit
3. Deploy

**Vercel:**
1. Dashboard → Deployments
2. Find previous deployment
3. Click "..." → Promote to Production

### Monitor Production

**Render:**
- Dashboard → Service → Metrics (CPU, Memory)
- Dashboard → Service → Logs (real-time)

**Vercel:**
- Dashboard → Analytics (requests, performance)
- Dashboard → Deployments → Logs

## 💡 Tips & Tricks

### Speed Up Local Development

```bash
# Use cloud browser mode to save CPU/RAM
# In backend/.env:
BROWSER_EXECUTION_MODE=cloud
BROWSER_USE_API_KEY=bu_xxxxx
```

### Keep Render Awake

```bash
# Free tier sleeps after 15 min
# Use external monitor (not recommended, wastes hours)

# Or accept the ~30s cold start
# First request after sleep is slow
```

### Test CORS Locally

```bash
# Simulate production CORS
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:8000/api/test-cases/generate
```

### Clean Redis (Local)

```bash
# Connect to Redis
docker exec -it <container-id> redis-cli

# View all keys
KEYS *

# Delete all (caution!)
FLUSHALL

# Delete specific pattern
KEYS celery-task-meta-* | xargs redis-cli DEL
```

### Preview Production Build Locally

```bash
# Frontend
cd frontend
npm run build
npm run preview
# Opens on http://localhost:4173

# Point to local backend
# .env.local:
VITE_API_URL=http://localhost:8000
```

---

**Last Updated**: 2026-02-18
**For detailed guides, see other files in `.claude/skills/mimir-deployer/`**
