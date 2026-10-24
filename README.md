# MTC Halloween Event Quiz

Interactive 4-seal Halloween quiz platform featuring multiple-choice trivia, live code debugging, algorithm questions, and output prediction with jumpscare atmospheric effects. Built for deployment on Vercel with Supabase PostgreSQL.

---

## Prerequisites

- **Node.js** (v18 or later recommended; v20/v22 tested)
- **npm** (v9 or later)
- A **Supabase** project with PostgreSQL tables (`registrations`, `questions`, `team_answers`)

---

## 1. Installation

Clone the repository and install dependencies in the project root:

```bash
npm install
```

---

## 2. Environment Configuration

Create a `.env` file in the root directory (this file is ignored by Git):

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...

```

> **Note:** Never commit the `.env` file or expose your `SUPABASE_SECRET_KEY`.

---

## 3. Synchronizing Questions

The server-side question definitions live in `server/questions.master.js`.

### Dry-run (Validation only, no database writes):
```bash
npm run sync:questions:dry
```

### Active sync (Populate questions into Supabase):
```bash
npm run sync:questions
```

---

## 4. Running the Tests

Execute the automated test suite:

```bash
npm test
```

---

## 5. Running Locally

### Option A: Local Full-Stack with Vercel CLI (Recommended)
This runs both the static frontend (`public/`) and the serverless functions (`api/`):

```bash
npx vercel dev
```
Open `http://localhost:3000` in your browser.

### Option B: Static Frontend Only (Offline / Fallback)
If you only need to preview the frontend UI without the backend API:

```bash
npx serve public -p 3000
```
Open `http://localhost:3000` in your browser.

---

## 6. Vercel Deployment

1. Import the repository into your Vercel account.
2. In the **Project Settings → Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `SESSION_SECRET`
3. Deploy! Vercel automatically:
   - Runs `npm install` (configured via `vercel.json`).
   - Serves the frontend from `public/`.
   - Routes backend requests under `api/` as serverless functions.
