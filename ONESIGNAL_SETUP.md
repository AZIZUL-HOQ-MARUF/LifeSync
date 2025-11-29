# OneSignal Setup Guide for LifeSync

OneSignal provides FREE push notifications that work on iOS, Android, and Web.

## Quick Setup (5 minutes):

### 1. Create OneSignal Account

1. Go to [OneSignal.com](https://onesignal.com/)
2. Click **"Get Started Free"**
3. Sign up with email or Google

### 2. Create New App

1. Click **"New App/Website"**
2. Enter app name: **LifeSync**
3. Select **"Web Push"**
4. Click **"Next"**

### 3. Configure Web Push

**Choose Configuration:**
1. Select **"Typical Site"**

**Site Setup:**
1. **Site Name**: `LifeSync`
2. **Site URL**: `https://azizul-hoq-maruf.github.io`
3. **Default Icon URL**: `https://azizul-hoq-maruf.github.io/LifeSync/icon.svg`
4. Click **"Save"**

### 4. Get Your App ID

1. After setup, you'll see your **App ID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
2. **COPY THIS APP ID** - you'll need it!

### 5. Add App ID to Your Project

**For local development:**

Create/update `.env.local`:
```bash
GEMINI_API_KEY=your_existing_key
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id_here
```

**For GitHub Pages deployment:**

Add GitHub Secret:
1. Go to: https://github.com/AZIZUL-HOQ-MARUF/LifeSync/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `VITE_ONESIGNAL_APP_ID`
4. Value: Your OneSignal App ID
5. Click **"Add secret"**

### 6. iOS Setup (Optional but Recommended)

For iOS push notifications:

1. In OneSignal dashboard, go to **Settings → Platforms**
2. Click **"Apple iOS (APNs)"**
3. Follow the wizard - OneSignal will guide you through:
   - Creating Apple Developer certificates
   - Uploading .p12 certificate
   
*Note: This requires an Apple Developer account ($99/year), but you can skip this and still have Android + Web working.*

### 7. Test Notifications

**From OneSignal Dashboard:**
1. Go to **Messages → New Push**
2. Enter message title and content
3. Click **"Send to Test Device"** or **"Send to All Subscribers"**

**From Your App:**
1. Open the app on mobile or desktop
2. Allow notifications when prompted
3. Create a task with a due date
4. Notification will be sent via OneSignal

## What Works:

✅ **Android Chrome**: Full background notifications
✅ **Desktop Chrome/Edge/Firefox**: Full support  
✅ **iOS Safari (with APNs setup)**: Real native push notifications
✅ **Works when app is closed**
✅ **Works across devices**

## Pricing:

- **FREE**: Up to 10,000 subscribers, unlimited notifications
- You have <100 users, so **completely FREE**

## Features You Get:

- ✅ Automatic notification delivery
- ✅ Delivery analytics
- ✅ User segmentation
- ✅ Scheduled notifications
- ✅ Rich media (images, buttons)
- ✅ Web dashboard to send messages

## Support:

- OneSignal handles all the complex platform-specific setup
- Works on PWAs installed to home screen
- No need to manage certificates/tokens yourself

---

**Ready?** Get your App ID and add it to `.env.local`, then test!
