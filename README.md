<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LifeSync - AI-Powered Task & Productivity App

A Progressive Web App (PWA) that helps you manage tasks, play games, track time, and sync across devices using Google Gemini AI.

🌐 **Live Demo:** https://azizul-hoq-maruf.github.io/LifeSync/

View your app in AI Studio: https://ai.studio/apps/drive/1gW37QzH0dWdKKllC0rxLzcMOvefGSjJ6

## Features

- ✅ Smart task management with AI-powered suggestions
- 🎮 Mini-games (Snake, 2048, Memory Match, Tic-Tac-Toe)
- ⏰ Clock and timer functionality
- ☁️ Cloud sync with Google Drive integration
- 🌙 Dark mode support
- 📱 PWA with offline support
- 🔔 Push notifications

## Run Locally

**Prerequisites:** Node.js (v18 or higher)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AZIZUL-HOQ-MARUF/LifeSync.git
   cd LifeSync
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   - The app will be available at `http://localhost:3000` (or another port if 3000 is in use)

## Deploy to GitHub Pages

This project is configured to automatically deploy to GitHub Pages using GitHub Actions.

### Setup:

1. **Add your API key as a GitHub Secret:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `GEMINI_API_KEY`
   - Value: Your Gemini API key

2. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Under "Build and deployment", set Source to: **GitHub Actions**

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push
   ```
   - The GitHub Actions workflow will automatically build and deploy your app
   - Your site will be live at: `https://your-username.github.io/LifeSync/`

## Build for Production

```bash
npm run build
```

The build output will be in the `dist` directory.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Google Gemini AI** for intelligent features
- **Lucide React** for icons

## License

MIT
