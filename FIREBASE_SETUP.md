# 🔥 Firebase Authentication Setup Guide

## Quick Start (5 minutes)

### 1. Create Firebase Project

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `SmartSpend` (or your choice)
4. **Disable** Google Analytics (optional, click Continue)
5. Click **"Create project"** and wait ~30 seconds

### 2. Enable Authentication

1. In left sidebar: **Build** → **Authentication**
2. Click **"Get started"** button
3. Click **"Sign-in method"** tab
4. Enable **Google**:
   - Click on "Google"
   - Toggle **Enable** switch
   - Click **Save**
5. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle **Enable** switch (first one only, not "Email link")
   - Click **Save**

### 3. Get Your Firebase Config

1. Click ⚙️ **Settings** icon (top left) → **Project settings**
2. Scroll down to **"Your apps"** section
3. Click the **`</>`** (web) icon
4. Enter app nickname: `SmartSpend Web`
5. **Don't** check "Firebase Hosting"
6. Click **"Register app"**
7. **Copy** the `firebaseConfig` object (looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 4. Add Config to Your Project

1. **Copy** the `.env.example` file to `.env.local`:
   ```bash
   copy .env.example .env.local
   ```

2. **Open** `.env.local` and replace with your values:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

3. **Save** the file

### 5. Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### 6. Test Authentication

1. Open http://localhost:5173
2. Click **"Continue with Google"**
3. Sign in with your Google account
4. You should be redirected to the dashboard! 🎉

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure `.env.local` exists and has all values
- Restart dev server after creating `.env.local`

### "Firebase: Error (auth/unauthorized-domain)"
- Go to Firebase Console → Authentication → Settings
- Add `localhost` to Authorized domains

### Google Sign-in popup blocked
- Allow popups for localhost in your browser
- Or check browser console for errors

## Optional: GitHub OAuth

To enable GitHub sign-in:

1. Create GitHub OAuth App:
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - **Application name**: SmartSpend
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: Get from Firebase Console → Authentication → GitHub provider
   - Copy Client ID and Client Secret

2. Add to Firebase:
   - Firebase Console → Authentication → Sign-in method
   - Click "GitHub"
   - Paste Client ID and Client Secret
   - Click Save

## What's Working

✅ Google OAuth (instant, no extra setup)  
✅ Email/Password authentication  
✅ Auto session persistence  
✅ User profile (name, email, photo)  
✅ Logout functionality  

## Need Help?

Check the full walkthrough in the artifacts for detailed information.
