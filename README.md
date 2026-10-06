# MediaLink - Production Direct URL Web Service

Production-ready media upload web service with Firebase Authentication, Google OAuth, and persistent direct streaming URLs.

## Features
- **Real Firebase Google OAuth:** Fast, popup and mobile redirect Google authentication with local session persistence.
- **Monthly Guest Quotas:** 30 free conversions per calendar month, reset automatically on the 1st of every month.
- **Unlimited Plan for Authenticated Users:** Free unlimited conversions upon signing in with Google.
- **Conversion History & Persistence:** Survives browser closes, tab reloads, and dyno restarts.
- **HTTP 206 Range Streaming:** Direct URLs end in actual extensions (.mp3, .mp4, .png) with in-browser streaming.

## Render Deployment
1. Connect this repository as a **Render Web Service**.
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. **Environment Variables:**
   - `NODE_ENV=production`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`