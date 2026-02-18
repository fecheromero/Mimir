# Mimir Deployer Skill

Custom Claude Code skill containing complete deployment knowledge for Mimir.

## What's Included

This skill provides comprehensive guidance for deploying Mimir to production using Render.com + Vercel.

### 📄 Files

1. **SKILL.md** - Main skill file
   - Complete step-by-step deployment guide
   - ⚠️ Updated for Render free tier (no Background Workers)
   - Combined API + Worker process solution
   - Render setup (Single Web Service + Redis)
   - Vercel setup (Frontend)
   - CI/CD configuration
   - Monitoring & troubleshooting basics
   - Free tier optimization tips

2. **render.yaml** - Infrastructure as Code
   - Blueprint for automatic Render service creation
   - ⚠️ Updated: Single Web Service (no Background Workers)
   - Environment variable templates
   - Usage: Place in repo root, Render auto-detects

3. **env-templates.md** - Environment Variables Reference
   - Copy-paste ready environment variables
   - ⚠️ Updated: Single service template (combined API + Worker)
   - Variable descriptions and sources
   - Testing commands

4. **verify-deployment.sh** - Deployment Verification Script
   - Automated health checks
   - Tests API, frontend, CORS, endpoints
   - Usage: `./verify-deployment.sh <api-url> <frontend-url>`
   - Returns pass/fail for each check

5. **troubleshooting.md** - Advanced Troubleshooting
   - ⚠️ Includes free tier limitation workarounds
   - Common issues & solutions
   - Debug commands
   - Performance optimization
   - Monitoring setup
   - Disaster recovery procedures

6. **alternatives.md** - Alternative Platforms
   - Railway, Fly.io, AWS, VPS comparisons
   - Cost breakdown
   - Migration guides
   - Platform recommendations based on use case

7. **local-development.md** - Local Development Guide
   - Complete setup instructions for local development
   - Running backend + worker + frontend locally
   - Environment configuration
   - Common issues and solutions
   - Development workflow
   - Hot reload behavior
   - VS Code setup

8. **quick-reference.md** - Quick Reference Card
   - Fast lookup for common commands
   - Environment URLs and variables
   - Common debugging commands
   - Emergency fixes
   - Health check URLs
   - Tips & tricks

9. **README.md** - This file
   - Skill overview and file descriptions

### 📦 Supporting Files (in main repo)

- **`backend/start.sh`** - Startup script
  - Runs both FastAPI and Celery worker in one process
  - Required for Render free tier deployment
  - Auto-created when using this skill

## Quick Start

### Option 1: Manual Deployment (Recommended for First Time)

Follow the step-by-step guide in `SKILL.md`:
1. Create Redis on Render
2. Create Web Service (FastAPI)
3. Create Background Worker (Celery)
4. Deploy Frontend on Vercel
5. Configure CORS

### Option 2: Automatic Deployment via Blueprint

1. Copy `render.yaml` to repo root
2. Push to GitHub
3. Go to Render Dashboard → "New" → "Blueprint"
4. Connect repo → Render auto-creates all services
5. Manually add secret env vars (API keys)
6. Deploy frontend on Vercel

## Usage Examples

### Ask Claude Code for Deployment Help

```
"Use the mimir-deployer skill to help me deploy to Render"
```

Claude will automatically invoke this skill and guide you through the process.

### Verify Deployment

```bash
# After deployment, run verification
cd .claude/skills/mimir-deployer
./verify-deployment.sh https://mimir-api.onrender.com https://mimir.vercel.app
```

### Troubleshooting

```
"Use mimir-deployer to help me debug CORS errors"
```

Claude will reference `troubleshooting.md` to diagnose and fix the issue.

## What This Skill Knows

### Production Deployment
- ✅ Render.com configuration (web service, workers, Redis)
- ✅ Vercel deployment and build settings
- ✅ Environment variables for all services
- ✅ CI/CD setup with GitHub auto-deploy
- ✅ CORS configuration
- ✅ Free tier limitations and workarounds
- ✅ Browser automation deployment (local vs cloud)
- ✅ LLM provider configuration (Anthropic/OpenAI)
- ✅ Common errors and solutions
- ✅ Performance optimization
- ✅ Monitoring and health checks
- ✅ Disaster recovery procedures

### Local Development
- ✅ Complete local setup (Python, Node, Redis)
- ✅ Running FastAPI + Celery + Frontend locally
- ✅ Environment configuration for development
- ✅ Hot reload behavior (backend, frontend, worker)
- ✅ Common local development issues
- ✅ VS Code integration
- ✅ Testing workflow before deploy

### Quick Reference
- ✅ Common commands cheat sheet
- ✅ Environment URLs comparison (local vs prod)
- ✅ Debugging commands
- ✅ Emergency fixes
- ✅ Health check endpoints

## Skill Frontmatter

```yaml
name: mimir-deployer
description: Deploy Mimir (FastAPI + Celery + React) to Render.com + Vercel with continuous delivery
```

## Maintenance

This skill should be updated when:
- Deployment architecture changes
- New environment variables are added
- Platform (Render/Vercel) changes their interface
- New deployment issues are discovered

## Related Documentation

- Main project docs: `/CLAUDE.md`
- Browser CDP setup: `/BROWSER_CDP_SETUP.md`
- Project setup: `/SETUP.md`
- Environment example: `/.env.example`

## Platform Links

- Render Dashboard: https://dashboard.render.com
- Vercel Dashboard: https://vercel.com/dashboard
- Anthropic Console: https://console.anthropic.com
- OpenAI Platform: https://platform.openai.com
- Browser-use Cloud: https://browser-use.com

---

**Created**: 2026-02-18
**Last Updated**: 2026-02-18
**Version**: 1.0.0
