# AudioLink Media Service

Production-ready React/Vite + Express media-to-direct-URL service.

## Render
- Build: `npm install && npm run build`
- Start: `npm start`
- Health: `/healthz`
- Persistent media directory: `/var/data/uploads`

Set `APP_URL` to the deployed HTTPS origin and provide the `VITE_FIREBASE_*` variables at build time.

## Firestore
Deploy the included rules with Firebase CLI:

`firebase deploy --only firestore:rules`

The app stores authenticated users' history under `users/{uid}/media/{mediaId}`.
