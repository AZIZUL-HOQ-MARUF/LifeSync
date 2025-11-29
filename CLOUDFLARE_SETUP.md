# Cloudflare Worker Setup Guide

## Overview
This guide helps you deploy a Cloudflare Worker to proxy Gemini AI API requests, keeping your API key secure on the backend.

## Prerequisites
- Cloudflare account (free tier)
- Node.js and npm installed
- Your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

Verify installation:
```bash
wrangler --version
```

## 2. Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with Cloudflare.

## 3. Deploy the Worker

Navigate to the cloudflare-worker directory:
```bash
cd cloudflare-worker
```

Deploy:
```bash
wrangler deploy
```

You'll see output like:
```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded lifesync-gemini-proxy (X.XX sec)
Published lifesync-gemini-proxy (X.XX sec)
  https://lifesync-gemini-proxy.YOUR-SUBDOMAIN.workers.dev
```

**Copy this URL** - you'll need it!

## 4. Add API Key Secret

Add your Gemini API key as a secure secret (not visible in code):

```bash
wrangler secret put GEMINI_API_KEY
```

When prompted, paste your Gemini API key:
```
AIzaSyD2SXtdVLf0Oph2Up1LEtczUfOCvNm2Yec
```

## 5. Update Environment Variables

### Local Development (.env.local)
Replace `YOUR_WORKER_URL_HERE` with your actual worker URL:
```
VITE_GEMINI_PROXY_URL=https://lifesync-gemini-proxy.YOUR-SUBDOMAIN.workers.dev
```

### Production (GitHub Secrets)
1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Name: `VITE_GEMINI_PROXY_URL`
4. Value: `https://lifesync-gemini-proxy.YOUR-SUBDOMAIN.workers.dev`
5. Click **"Add secret"**

## 6. Test the Worker

### Test locally:
```bash
cd cloudflare-worker
wrangler dev
```

This starts a local server at http://localhost:8787

### Test with curl:
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Say hello"}]}],
    "generationConfig": {
      "responseMimeType": "application/json",
      "responseSchema": {
        "type": "object",
        "properties": {"message": {"type": "string"}}
      }
    }
  }'
```

Expected response:
```json
{
  "candidates": [{
    "content": {
      "parts": [{"text": "{\"message\":\"Hello!\"}"}]
    }
  }]
}
```

## 7. Verify in Your App

Start your React app:
```bash
npm run dev
```

Try creating a task with AI:
- Type: "Buy milk tomorrow at 5pm"
- Check DevTools Network tab
- Request should go to your worker URL, NOT generativelanguage.googleapis.com
- API key should NOT be visible in Sources tab

## Updating the Worker

After making changes to `worker.js`:

```bash
cd cloudflare-worker
wrangler deploy
```

No need to update secrets again - they persist between deployments.

## Monitoring & Logs

View worker logs:
```bash
wrangler tail
```

Check analytics in Cloudflare Dashboard:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Workers & Pages**
3. Select **lifesync-gemini-proxy**
4. View requests, errors, and performance metrics

## Free Tier Limits
- ✅ 100,000 requests/day
- ✅ 10ms CPU time per request
- ✅ 128MB memory
- ✅ 1MB request/response size

Perfect for personal projects!

## Troubleshooting

### "Error 1101: Worker threw exception"
- Check if GEMINI_API_KEY secret is set: `wrangler secret list`
- Verify worker code has no syntax errors
- Check logs: `wrangler tail`

### CORS errors in browser
- Verify your GitHub Pages URL is in the `allowedOrigins` array in worker.js
- Redeploy after changes: `wrangler deploy`

### "API key not found"
- Secret might not be set: `wrangler secret put GEMINI_API_KEY`
- Verify secret exists: `wrangler secret list`

### Worker not updating
- Clear Cloudflare cache: `wrangler deploy --compatibility-date=2024-01-01`
- Wait 30 seconds for global edge network propagation
