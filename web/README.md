# React Web Client

Simple React/Vite front end for the MCRDSE API. It supports:
- Logging in with an existing username (cookie-based session)
- Viewing the prompt of the day
- Creating posts (with optional media URL)
- Liking and commenting on posts
- Refreshing feed/prompt and editing the API base URL

## Quickstart

```bash
cd web
npm install
npm run dev
```

The dev server opens on http://localhost:3000. The API base defaults to http://localhost:4000; adjust it with the control in the page header if your backend runs elsewhere.

To build for production:

```bash
npm run build
npm run preview
```

Make sure the API (`npm start` in `api/`) and MongoDB are running before testing the UI. Try logging in as `alice` or `bob` (seeded users).
