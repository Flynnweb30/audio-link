# MediaLink - Production Direct Stream Web Service

Production-ready media upload web service with Firebase Google Authentication, conversion history, and direct streaming URLs.

## Features
- **Zero Initial Sample Files:** Clean starting state for end users.
- **Landing Page + Web App:** Polished hero, free vs pro feature comparisons, and conversion points.
- **Red Delete (X) Actions:** Real-time removal from disk, URL registry, and history with confirmation.
- **Pro Tier Capabilities:** Link analytics, custom branded slugs, password-protection, and developer API support.
- **Real Firebase Google OAuth:** Native Google sign-in with local session persistence.
- **HTTP 206 Byte Ranges:** Full partial content support for scrub seeking, Safari, and lock-screen controls.

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