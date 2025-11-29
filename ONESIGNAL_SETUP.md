# OneSignal Setup Guide

## 1. Create OneSignal Account

1. Go to [OneSignal.com](https://onesignal.com/) and sign up for a free account
2. Click **"New App/Website"** button
3. Enter your app name: **LifeSync**
4. Select **Web Push** as the platform

## 2. Configure Web Push Settings

### Choose Integration Type
- Select **"Typical Site"** (not WordPress)

### Site Setup
- **Site Name**: LifeSync
- **Site URL**: `https://azizul-hoq-maruf.github.io`
- **Default Notification Icon URL**: `https://azizul-hoq-maruf.github.io/LifeSync/icon.svg`
- **Auto Resubscribe**: Enable (recommended)

### Permission Prompt Settings
- Choose **"Slide Prompt"** for better UX
- Customize prompt text:
  - Title: "Stay Updated!"
  - Message: "Get notified about your tasks and reminders"
  - Accept button: "Allow"
  - Cancel button: "No Thanks"

### Advanced Settings (Optional)
- **Safari Web Push**: Skip (requires Apple Developer account $99/year)
- **Welcome Notification**: Enable with custom message:
  - Title: "Welcome to LifeSync!"
  - Message: "You'll now receive task reminders and notifications"

## 3. Get Your App ID

After completing setup:
1. Go to **Settings** → **Keys & IDs**
2. Copy your **OneSignal App ID**
3. Add it to `.env.local`:
   ```
   VITE_ONESIGNAL_APP_ID=your-app-id-here
   ```

## 4. Add GitHub Secret

For production deployment:
1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Name: `VITE_ONESIGNAL_APP_ID`
4. Value: Your OneSignal App ID
5. Click **"Add secret"**

## 5. Testing Notifications

### Local Testing
```bash
npm run dev
```
- Open http://localhost:3000
- You should see the OneSignal permission prompt
- Click "Allow" to subscribe
- Check browser console for: "OneSignal initialized successfully"

### Test Notification (from OneSignal Dashboard)
1. Go to **Messages** → **New Push**
2. Select **"Send to Test Device"**
3. Enter your subscription ID (shown in browser console)
4. Send a test notification
5. You should receive it even when the app is closed!

## 6. Sending Notifications from Code

The app automatically initializes OneSignal. To send notifications:

```typescript
// In your service worker or backend
await fetch('https://onesignal.com/api/v1/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic YOUR_REST_API_KEY'
  },
  body: JSON.stringify({
    app_id: 'YOUR_APP_ID',
    contents: { en: 'Task due in 10 minutes!' },
    headings: { en: 'LifeSync Reminder' },
    included_segments: ['Subscribed Users']
  })
});
```

## Troubleshooting

### Not receiving notifications?
- Check if notifications are blocked in browser settings
- Verify service worker is registered (DevTools → Application → Service Workers)
- Check OneSignal dashboard for subscription status

### iOS not working?
- iOS requires Apple Developer account ($99/year) for push certificates
- Web push on iOS only works in Safari with proper APNs setup
- For now, focus on Android + Desktop notifications

## Free Tier Limits
- ✅ 10,000 subscribers
- ✅ Unlimited notifications
- ✅ Email & in-app support
- ✅ Basic analytics

Perfect for personal projects!
