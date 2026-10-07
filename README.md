# AudioLink Media Service

AudioLink converts audio, video, and image uploads into direct browser-ready URLs. The production service is an Express + Vite SPA with Firebase Authentication/Firestore history and persistent Render storage.

## Local development

```bash
npm install --no-audit --no-fund
cp .env.example .env
npm run dev
```

## Verification

```bash
npm run lint
npm test
npm run build
```

## Render production

Use a **Node Web Service** backed by a **paid persistent disk** because uploaded media and `metadata.json` must survive restarts and deploys.

- Build: `npm install --no-audit --no-fund && npm run lint && npm test && npm run build`
- Start: `npm start`
- Health: `/healthz`
- Persistent data: `/var/data/uploads`
- `APP_URL`: the final public HTTPS origin

The application dynamically serves `/robots.txt` and `/sitemap.xml`, injects request-aware canonical/robots/Open Graph tags into production HTML, and keeps Studio/History/player URLs out of indexing.

## Firebase

Deploy the checked-in rules with:

```bash
firebase deploy --only firestore:rules
```

Firestore history is private to the authenticated owner under `users/{uid}/media/{mediaId}`.
