# Cloudflare Pages Deployment Guide

## Why Cloudflare Pages?

✅ **Free Forever:**
- Unlimited bandwidth (GitHub Pages has 100GB/month limit)
- 500 builds/month
- No credit card required

✅ **Better Performance:**
- Global CDN (300+ cities)
- Faster than GitHub Pages

✅ **OneSignal Compatible:**
- Root domain deployment (`lifesync.pages.dev`)
- Service workers work perfectly

✅ **Same Account:**
- Already using Cloudflare for Worker
- Single dashboard for everything

## Setup Steps (5 minutes)

### 1. Login to Cloudflare Dashboard

Go to: https://dash.cloudflare.com/

### 2. Create New Pages Project

1. Click **Workers & Pages** (left sidebar)
2. Click **Create application** button
3. Select **Pages** tab
4. Click **Connect to Git**

### 3. Connect GitHub Repository

1. Click **Connect GitHub**
2. Authorize Cloudflare (if first time)
3. Select repository: **LifeSync**
4. Click **Begin setup**

### 4. Configure Build Settings

**Project name:** `lifesync` (or any name you want)

**Production branch:** `main`

**Build settings:**
- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

**Environment variables:**
Click **Add variable** for each:

| Variable Name | Value |
|--------------|-------|
| `VITE_GEMINI_PROXY_URL` | `https://lifesync-gemini-proxy.lifesync.workers.dev` | (cloudflare proxy)
| `VITE_ONESIGNAL_APP_ID` | `f57954ce-62e7-4031-acd4-**********` | (ONESIGNAL_APP_ID)
| `NODE_VERSION` | `20` |

### 5. Deploy

1. Click **Save and Deploy**
2. Wait ~2 minutes for build
3. Your site will be live at: `https://lifesync.pages.dev` // or something similar

### 6. Update OneSignal Dashboard

1. Go to OneSignal Dashboard: https://onesignal.com/
2. Select your **LifeSync** app
3. Go to **Settings** → **Configuration**
4. Update **Site URL** to: `https://lifesync.pages.dev` // the deployed version url
5. Click **Save**

## Testing

1. Visit: `https://lifesync.pages.dev`
2. Try creating a task with AI: "Buy milk tomorrow at 5pm"
3. Check if OneSignal prompt appears
4. Grant notification permission
5. Create a task with a reminder

## Custom Domain (Optional)

If you have a custom domain:

1. Go to Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `lifesync.com`)
4. Follow DNS instructions
5. Update OneSignal URL to your custom domain

## Automatic Deployments

Every time you push to `main` branch:
- Cloudflare automatically builds and deploys
- Preview deployments for pull requests
- Rollback to any previous deployment

## Monitoring

- **Build logs:** Workers & Pages → LifeSync → Deployments
- **Analytics:** Workers & Pages → LifeSync → Analytics (free)
- **Functions:** Your Cloudflare Worker continues to work

## Troubleshooting

### Build Failed
- Check build logs for errors
- Verify environment variables are set
- Check if Node version is 20

### OneSignal Not Working
- Verify service worker files are in `public/` folder
- Check OneSignal dashboard URL matches deployment URL
- Hard refresh: Ctrl+Shift+R

### Gemini API Not Working
- Verify `VITE_GEMINI_PROXY_URL` environment variable
- Check Cloudflare Worker is running
- Verify API key in Worker secret

## Migration from GitHub Pages

**Keep GitHub Pages as backup:**
- Both can run simultaneously
- GitHub Pages: `https://azizul-hoq-maruf.github.io/LifeSync/`
- Cloudflare Pages: `https://lifesync.pages.dev`

**Switch primary:**
- Update links to Cloudflare Pages URL
- Optionally disable GitHub Pages in repo settings

## Cost

**$0/month forever** for:
- Hosting
- Bandwidth (unlimited)
- SSL certificate
- 500 builds/month
- Global CDN

Perfect for personal projects! 🚀
