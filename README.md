# MediaLink - Audio, Video & Image Direct URL Web Service

Production-ready media upload web service engineered for deployment on Render. Convert MP3, WAV, MP4, WebM, PNG, JPG, SVG, and more into permanent, direct streaming URLs ending in the file extension (e.g., `https://audiolink.onrender.com/media/media_1742083921.mp4`).

## Features
- **Audio, Video & Image Support:** Centralized upload and streaming engine for all media types.
- **Direct Stream URLs:** Sends `Content-Disposition: inline` so browsers play audio/video and display images natively instead of prompting a file download.
- **HTTP 206 Byte Ranges:** Full partial content support for scrub seeking, Safari, and lock-screen controls.
- **Autoplay & Fallback:** Instant autoplay on link open with an interactive tap-to-play banner when restricted by browser autoplay policies.
- **Embeddable:** Provides ready-to-paste `<audio>`, `<video>`, and `<img>` tags plus mobile QR codes.

## Render Deployment
1. Connect this repository as a **Render Web Service**.
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. **Environment Variables:** `NODE_ENV=production`