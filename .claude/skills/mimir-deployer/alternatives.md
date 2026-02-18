# Alternative Deployment Platforms

If Render's free tier limitations are too restrictive, here are alternatives.

## Render Free Tier Limitations Summary

- ✅ Web Service: Available (512MB RAM, sleeps after 15min)
- ✅ Redis: Available (25MB storage)
- ❌ Background Workers: NOT available (requires paid plan)
- ❌ Persistent storage: Ephemeral only
- **Workaround**: Run Celery worker in same process as FastAPI

---

## Alternative 1: Railway (Recommended Alternative)

**Free Tier**: $5 USD credit/month (then pay-as-you-go)

### Pros:
- ✅ Supports Background Workers on free credit
- ✅ Better resource limits (1GB RAM per service)
- ✅ No sleep after inactivity
- ✅ Persistent storage (1GB)
- ✅ Great GitHub integration
- ✅ PostgreSQL included if needed

### Cons:
- Limited to $5/month credit (~550 hours)
- After credit: $0.000231/GB-second

### Setup:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Init project
railway init

# Deploy
railway up
```

Railway auto-detects Docker Compose, so you can deploy with minimal changes.

**Estimated costs**: $5 credit lasts ~3 weeks of full uptime, free for personal use if you turn off when not using.

---

## Alternative 2: Fly.io

**Free Tier**:
- 3 shared-cpu-1x VMs (256MB RAM each)
- 3GB persistent storage
- 160GB outbound bandwidth

### Pros:
- ✅ Supports full Docker Compose
- ✅ No sleep behavior
- ✅ Persistent volumes
- ✅ Global deployment (multi-region)
- ✅ PostgreSQL included

### Cons:
- More complex setup than Render
- 256MB RAM per VM (need to split services carefully)
- Credit card required (not charged unless you exceed limits)

### Setup:
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app (auto-generates fly.toml from Dockerfile)
flyctl launch

# Deploy
flyctl deploy
```

### Recommended Architecture for Free Tier:
- **VM 1**: FastAPI + Celery worker (combined, 256MB)
- **VM 2**: Redis (256MB)
- **Frontend**: Still on Vercel

Or use all 3 VMs:
- **VM 1**: FastAPI (256MB)
- **VM 2**: Celery worker (256MB)
- **VM 3**: Redis (256MB)

---

## Alternative 3: Heroku

**Free Tier**: ❌ Removed in 2022

Heroku no longer offers a free tier. Cheapest plan:
- **Eco**: $5/month per dyno (512MB RAM, sleeps after 30min)
- **Basic**: $7/month per dyno (512MB RAM, always-on)

**Not recommended** for free deployment anymore.

---

## Alternative 4: AWS Free Tier (EC2)

**Free Tier**: 12 months
- t2.micro instance (1GB RAM, 1 vCPU)
- 750 hours/month
- 30GB storage

### Pros:
- ✅ Full control (it's a VM)
- ✅ More RAM than Render free tier
- ✅ Can run anything

### Cons:
- ❌ Requires more DevOps knowledge
- ❌ Manual setup (SSH, Docker, nginx, etc.)
- ❌ Free tier expires after 12 months
- ❌ Easy to accidentally incur charges

### Setup Summary:
1. Launch EC2 t2.micro instance
2. SSH in and install Docker
3. Clone repo
4. Run `docker-compose up -d`
5. Configure security groups (open ports 80/443)
6. (Optional) Set up Elastic IP and domain

**Recommended**: Only if you're comfortable with Linux server administration.

---

## Alternative 5: Google Cloud Run

**Free Tier**:
- 2 million requests/month
- 360,000 GB-seconds/month
- 180,000 vCPU-seconds/month

### Pros:
- ✅ Generous free tier
- ✅ Serverless (auto-scales to zero)
- ✅ Pay only for requests

### Cons:
- ❌ **Not suitable for Celery workers** (needs always-on process)
- Works only for stateless APIs
- Cold starts can be slow

**Verdict**: Good for FastAPI only, but Celery workers won't work.

---

## Alternative 6: DigitalOcean App Platform

**Free Tier**: ❌ None

Cheapest plan:
- **Basic**: $5/month per component (512MB RAM)
- Need 3 components: API, Worker, Redis = $15/month

**Not recommended** for free deployment.

---

## Alternative 7: Self-Hosted (VPS)

If you have a spare computer or cheap VPS ($3-5/month):

### Cheap VPS Providers:
- **Hetzner**: €4.15/month (2GB RAM, 20GB disk)
- **Contabo**: €3.99/month (4GB RAM, 50GB disk)
- **Vultr**: $6/month (1GB RAM, 25GB disk)
- **Linode**: $5/month (1GB RAM, 25GB disk)

### Setup:
1. Rent VPS
2. Install Docker + Docker Compose
3. Clone repo
4. Run `docker-compose up -d`
5. Set up nginx reverse proxy
6. (Optional) Add SSL with Certbot

**Pros**: Full control, persistent storage, always-on
**Cons**: Manual maintenance, need DevOps skills

---

## Comparison Table

| Platform | Free Tier | Workers | Persistent Storage | Complexity |
|----------|-----------|---------|-------------------|------------|
| **Render** | ✅ Yes | ❌ No | ❌ Ephemeral | ⭐ Easy |
| **Railway** | 💰 $5 credit | ✅ Yes | ✅ 1GB | ⭐ Easy |
| **Fly.io** | ✅ Yes | ✅ Yes | ✅ 3GB | ⭐⭐ Medium |
| **AWS EC2** | ✅ 12 months | ✅ Yes | ✅ 30GB | ⭐⭐⭐ Hard |
| **Heroku** | ❌ No | ✅ Yes | ❌ Ephemeral | ⭐ Easy |
| **VPS** | 💰 $3-6/mo | ✅ Yes | ✅ Unlimited | ⭐⭐⭐ Hard |

---

## Recommended Choice Based on Use Case

### Personal Use (You + Maybe Friends)
**Render (free)** with combined API+Worker process
- Cost: $0
- Limitation: Sleeps after 15min, ephemeral storage
- Effort: Minimal

### Light Production (Small Team)
**Railway ($5 credit/month)**
- Cost: $0-5/month depending on usage
- Better performance than Render
- Separate workers allowed

### Serious Production (Business)
**Fly.io or Self-Hosted VPS**
- Cost: $0 (Fly free tier) or $5/month (VPS)
- Always-on, persistent storage
- More DevOps effort

### Learning/Testing
**Render (free)**
- Perfect for learning
- Easy setup
- No commitment

---

## Migration Guide: Render → Railway

If you outgrow Render's free tier:

### Step 1: Export Configuration
From Render dashboard:
- Copy all environment variables
- Note Redis internal URL

### Step 2: Deploy to Railway
```bash
railway login
railway init
railway up
```

Railway auto-detects `docker-compose.yml` and creates services.

### Step 3: Add Environment Variables
```bash
railway variables set LLM_PROVIDER=anthropic
railway variables set ANTHROPIC_API_KEY=sk-ant-...
# ... repeat for all variables
```

Or use Railway dashboard → Project → Variables → Import

### Step 4: Update Frontend
Change `VITE_API_URL` in Vercel to new Railway URL.

### Step 5: Test
Run verification script with new URLs.

**Total migration time**: ~15 minutes

---

## Migration Guide: Render → Fly.io

### Step 1: Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
flyctl auth login
```

### Step 2: Create fly.toml
```bash
flyctl launch
# Select region, don't deploy yet
```

### Step 3: Update fly.toml
```toml
# fly.toml
app = "mimir"

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 8000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[env]
  LLM_PROVIDER = "anthropic"
  BROWSER_EXECUTION_MODE = "cloud"
```

### Step 4: Add Secrets
```bash
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-...
flyctl secrets set BROWSER_USE_API_KEY=bu_...
```

### Step 5: Create Redis
```bash
flyctl redis create
```

### Step 6: Deploy
```bash
flyctl deploy
```

### Step 7: Update Frontend
Update `VITE_API_URL` in Vercel.

**Total migration time**: ~30 minutes (if familiar with Docker)

---

## Cost Breakdown (Monthly)

### Scenario: 24/7 Uptime

| Platform | API | Worker | Redis | Total |
|----------|-----|--------|-------|-------|
| Render Free | $0 | - | $0 | **$0** |
| Render Paid | $7 | $7 | $0 | **$14** |
| Railway | ~$5 | ~$5 | $0 | **~$10*** |
| Fly.io | $0 | $0 | $0 | **$0** |
| VPS (Hetzner) | - | - | - | **€4.15** |

*Railway: Uses $5 credit + potential overage

### Scenario: Part-time Use (50 hours/month)

| Platform | Total |
|----------|-------|
| Render Free | **$0** |
| Railway | **$0** (under credit limit) |
| Fly.io | **$0** |
| VPS | **€4.15** (always charges, even if off) |

---

## Final Recommendation for Mimir

For your use case (personal, solo use):

1. **Start with Render Free + Workaround**
   - Use `start.sh` to run combined process
   - Accept sleep behavior
   - Cost: $0

2. **If sleep is annoying**:
   - Upgrade to **Railway** ($5 credit/month)
   - Or use **Fly.io** free tier
   - Both allow proper Background Workers

3. **If you grow beyond free tiers**:
   - Get a **Hetzner VPS** (€4.15/month)
   - Full control, better performance
   - One-time setup effort

The workaround (combined process) works fine for personal use. Only upgrade if:
- Cold starts are too slow
- You need persistent file storage
- You have multiple concurrent users
