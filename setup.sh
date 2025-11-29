#!/bin/bash

# LifeSync - Complete Setup Script
# This script sets up the entire project including dependencies, Cloudflare Worker, and OneSignal

set -e  # Exit on error

echo "=================================="
echo "   LifeSync Setup Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running in WSL or Linux
if grep -qi microsoft /proc/version 2>/dev/null; then
    echo -e "${GREEN}✓ Detected WSL environment${NC}"
else
    echo -e "${GREEN}✓ Detected Linux environment${NC}"
fi

# 1. Check Node.js
echo ""
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) installed${NC}"

# 2. Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version) installed${NC}"

# 3. Install project dependencies
echo ""
echo "Installing project dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 4. Check/Install Wrangler
echo ""
echo "Checking Wrangler CLI..."
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}! Wrangler not found. Installing globally...${NC}"
    npm install -g wrangler
    echo -e "${GREEN}✓ Wrangler installed${NC}"
else
    echo -e "${GREEN}✓ Wrangler $(wrangler --version | head -1) installed${NC}"
fi

# 5. Setup .env.local if it doesn't exist
echo ""
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cat > .env.local << 'EOF'
# Cloudflare Worker Proxy URL (replace after deployment)
VITE_GEMINI_PROXY_URL=http://localhost:8787

# OneSignal App ID (replace after OneSignal setup)
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id-here
EOF
    echo -e "${GREEN}✓ Created .env.local${NC}"
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

# 6. Cloudflare Worker Setup
echo ""
echo "=================================="
echo "   Cloudflare Worker Setup"
echo "=================================="
read -p "Do you want to deploy Cloudflare Worker now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Step 1: Login to Cloudflare..."
    wrangler login
    
    echo ""
    echo "Step 2: Deploying worker..."
    cd cloudflare-worker
    wrangler deploy
    
    echo ""
    echo -e "${YELLOW}Important: Copy the worker URL from above output!${NC}"
    echo "It should look like: https://lifesync-gemini-proxy.XXXXX.workers.dev"
    echo ""
    read -p "Paste your worker URL here: " WORKER_URL
    
    # Update .env.local with worker URL
    cd ..
    sed -i "s|VITE_GEMINI_PROXY_URL=.*|VITE_GEMINI_PROXY_URL=$WORKER_URL|" .env.local
    echo -e "${GREEN}✓ Updated .env.local with worker URL${NC}"
    
    echo ""
    echo "Step 3: Adding Gemini API key as secret..."
    echo "Get your API key from: https://aistudio.google.com/app/apikey"
    read -p "Paste your Gemini API key: " GEMINI_KEY
    
    cd cloudflare-worker
    echo "$GEMINI_KEY" | wrangler secret put GEMINI_API_KEY
    cd ..
    
    echo -e "${GREEN}✓ Cloudflare Worker setup complete!${NC}"
else
    echo -e "${YELLOW}! Skipped Cloudflare Worker setup${NC}"
    echo "Run manually later with: cd cloudflare-worker && wrangler deploy"
fi

# 7. OneSignal Setup Instructions
echo ""
echo "=================================="
echo "   OneSignal Setup"
echo "=================================="
read -p "Do you have a OneSignal App ID already? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Paste your OneSignal App ID: " ONESIGNAL_ID
    sed -i "s|VITE_ONESIGNAL_APP_ID=.*|VITE_ONESIGNAL_APP_ID=$ONESIGNAL_ID|" .env.local
    echo -e "${GREEN}✓ Updated .env.local with OneSignal App ID${NC}"
else
    echo ""
    echo -e "${YELLOW}Please complete OneSignal setup:${NC}"
    echo "1. Go to https://onesignal.com/ and create an account"
    echo "2. Create a new Web Push app"
    echo "3. Follow the instructions in ONESIGNAL_SETUP.md"
    echo "4. Copy your App ID and update .env.local"
fi

# 8. GitHub Secrets Reminder
echo ""
echo "=================================="
echo "   GitHub Secrets Setup"
echo "=================================="
echo -e "${YELLOW}Don't forget to add these secrets to GitHub:${NC}"
echo ""
echo "1. Go to: https://github.com/AZIZUL-HOQ-MARUF/LifeSync/settings/secrets/actions"
echo "2. Add the following secrets:"
echo ""
echo "   Name: VITE_GEMINI_PROXY_URL"
echo "   Value: $WORKER_URL"
echo ""
echo "   Name: VITE_ONESIGNAL_APP_ID"
echo "   Value: (your OneSignal App ID)"

# 9. Final Instructions
echo ""
echo "=================================="
echo "   Setup Complete!"
echo "=================================="
echo ""
echo "Your .env.local file:"
cat .env.local
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Start development server: npm run dev"
echo "2. Test the app at: http://localhost:3000"
echo "3. Try creating a task with AI: 'Buy milk tomorrow at 5pm'"
echo "4. Test notifications (if OneSignal is set up)"
echo ""
echo "For detailed guides, see:"
echo "- CLOUDFLARE_SETUP.md"
echo "- ONESIGNAL_SETUP.md"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
