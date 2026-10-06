# MediaLink - Audio, Video & Image Direct URL Web Service

Production-ready media upload web service engineered for deployment on Render. Convert MP3, WAV, MP4, WebM, PNG, JPG, AVIF, SVG, and more into permanent, direct streaming URLs ending in the file extension (e.g., `https://audiolink.onrender.com/media/media_1742083921.avif`).

## Features
- **Real Firebase Google Authentication:** Instant Google OAuth with session persistence.
- **Guest Access with 30 Free Credits/Month:** Automatically resets at the start of each calendar month.
- **Permanent Guest History:** Stored locally and on server; seamlessly restored on reloads and device returns.
- **Seamless Account Migration:** Guest history automatically transfers to Google account on sign-in.
- **Direct Stream URLs:** Browser-native playback with HTTP 206 Byte Ranges.

## Render Deployment
1. Connect this repository as a **Render Web Service**.
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. **Environment Variables:** `NODE_ENV=production`