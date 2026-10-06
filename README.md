# MediaLink - Audio, Video & Image Direct URL Web Service

Production-ready media upload web service engineered for deployment on Render. Convert MP3, WAV, MP4, WebM, PNG, JPG, AVIF, SVG, and more into permanent, direct streaming URLs ending in the file extension (e.g., `https://audiolink.onrender.com/media/media_1742083921.avif`).

## Features
- **Upload & Direct URLs:** Supports Audio, Video, and Image files with `Content-Disposition: inline`.
- **Per-User Conversion History:** Shows recent uploads on the upload studio (Image 1) and comprehensive history table with folder and date filters (Image 2 & 3).
- **HTTP 206 Byte Ranges:** Full partial content support for scrub seeking, Safari, and lock-screen controls.
- **Render Web Service Ready:** Configured with Node.js runtime, build script, and persistent storage.

## Render Deployment
1. Connect this repository as a **Render Web Service**.
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. **Environment Variables:** `NODE_ENV=production`