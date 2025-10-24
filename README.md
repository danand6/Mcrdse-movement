# MCRDSE Mindful Check-In

## Overview
- Daily reflection tool where community members share short check-ins, react to each other, and see a curated “prompt of the day”.
- Optimized for quick local development: one Node/Express API backed by MongoDB plus a lightweight React single-page client.

## Tech Stack
- **API**: Node.js, Express 5, Mongoose (MongoDB), Zod for validation, Helmet/CORS/Morgan/Cookie-Parser for HTTP hardening and logging.
- **Data**: MongoDB (local instance or Docker), YAML-driven prompt list with `js-yaml`.
- **Web**: React 18 + Vite, vanilla CSS for styling, fetch-based API client.
- **Tooling**: Nodemon for hot reloads, Docker option for Mongo, curl scripts for smoke testing.

## Quickstart
1. **Prerequisites**: Node 18+, npm, and a running MongoDB instance (e.g. `docker run --name mcrdse-mongo -p 27017:27017 -v "$PWD/../mongo-data:/data/db" mongo:7`).
2. **Install dependencies**  
   - API: `cd api && npm install`  
   - Web: `cd ../web && npm install`
3. **Seed baseline data** (users, posts, prompt): `cd ../api && npm run seed`
4. **Run services**  
   - API: `npm start` (listens on `http://localhost:4000`)  
   - Web: `cd ../web && npm run dev` (served on `http://localhost:3000`)
5. **Smoke test** (from `api/`):  
   - `curl -i -c cookies.txt -H 'Content-Type: application/json' -d '{"username":"alice"}' http://localhost:4000/auth/login`  
   - `curl -b cookies.txt http://localhost:4000/posts`

## API Endpoints
- `POST /auth/login` — Body `{ username }`; sets `session` cookie if user exists.
- `GET /posts` — Returns `{ items, nextCursor }`, newest first with comment/like counts.
- `POST /posts` — Auth required; body validated with Zod (`text` 1–500 chars, optional `mediaUrl`).
- `POST /posts/:id/like` — Idempotent like; auth required.
- `POST /posts/:id/comment` — Auth required; body `{ text }` (1–300 chars).
- `GET /prompt/today` — Returns prompt document `{ date, text, source }` or null text if unset.
- `POST /prompt/today` seeding happens via `npm run prompt:today` / `POST` not exposed to clients.
- `GET /` — Health check `{ status: 'ok' }`.

## Decisions & Tradeoffs
- **Cookie-based pseudo-auth**: simple username cookie keeps implementation lightweight; no password/SSO for demo scope.
- **Mongo-first models**: Mongoose chosen for quick schema definitions, indexes, and population at the cost of tying logic to ODM patterns.
- **YAML prompt list with fallback**: avoids extra DB admin for prompt content; falls back to baked-in prompts if the file or parser is missing.
- **Client fetch wrapper vs. state management**: no Redux/RTK; simpler state hooks keep the UI minimal but less scalable for large apps.

## Demo Instructions
- Start MongoDB (Docker command above) and run the seed once.
- Launch `npm start` (API) and `npm run dev` (web). Vite will open the site automatically.
- Log in as `alice` or `bob`, create a post, like/comment, refresh the prompt, and watch the feed update instantly.
- CLI prompt seeding: `npm run prompt:today` (idempotent; uses YAML when present).

## Known Limits
- No password flows, permissions, or account creation; anyone can impersonate seeded users.
- Lack of pagination UI beyond backend cursor, no optimistic updates, and no unit/integration tests.
- Media URLs stored but not rendered as rich previews; comments only show latest five per hydrate call.
- Prompt management limited to daily random selection; no admin tooling or history view.
