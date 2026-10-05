# AudioLink - Audio to Direct Stream URL

Convert MP3, WAV, M4A, OGG, and FLAC files into permanent, direct streaming URLs ending in the file extension (e.g., `https://audiolink.onrender.com/audio/aud_1742083921.mp3`).

## Key Features
- **Direct Stream URL:** Sends `Content-Disposition: inline` so browsers play the audio natively rather than prompting a file download.
- **HTTP 206 Byte Ranges:** Full partial content support for scrub seeking, Safari, and lock-screen controls.
- **Autoplay Ready:** Instant autoplay on link open with an interactive tap-to-play banner for restricted browser policies.
- **Embeddable:** Provides ready-to-paste `<audio>` tags and QR codes for mobile scanning.

## Deploying to Render
1. Connect this repository as a **Render Web Service**.
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. **Environment Variables:** `NODE_ENV=production`