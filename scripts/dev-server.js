import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

// Enable local preview fallback DB only if a service role / secret key is not set
const hasServiceKey = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY
);
if (!hasServiceKey) {
  process.env.LOCAL_PREVIEW = '1';
}
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'mtc-local-dev-session-secret-key-2026-amity';
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PORT = Number(process.env.PORT || 3000);

import verifyHandler from '../api/auth/verify.js';
import sessionHandler from '../api/auth/session.js';
import questionsHandler from '../api/quiz/questions.js';
import saveDraftHandler from '../api/quiz/save-draft.js';
import submitHandler from '../api/quiz/submit.js';
import round2StateHandler from '../api/round2/state.js';
import adminHandler from '../api/admin/index.js';

const API_ROUTES = {
  '/api/auth/verify': verifyHandler,
  '/api/auth/session': sessionHandler,
  '/api/quiz/questions': questionsHandler,
  '/api/quiz/save-draft': saveDraftHandler,
  '/api/quiz/submit': submitHandler,
  '/api/round2/state': round2StateHandler,
  '/api/admin': adminHandler,
  '/api/admin/index': adminHandler
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

function decorateReqRes(req, res, parsedUrl, rawBody) {
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());
  if (rawBody) {
    try {
      req.body = JSON.parse(rawBody);
    } catch {
      req.body = rawBody;
    }
  } else {
    req.body = {};
  }

  res.status = code => {
    res.statusCode = code;
    return res;
  };

  res.json = payload => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(payload));
    return res;
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname).replace(/\/+$/, '') || '/';

    if (API_ROUTES[pathname]) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf8');
      decorateReqRes(req, res, parsedUrl, rawBody);
      await API_ROUTES[pathname](req, res);
      return;
    }

    // Serve static files from public/
    let relPath = decodeURIComponent(parsedUrl.pathname);
    if (relPath === '/') relPath = '/index.html';
    else if (relPath === '/round2' || relPath === '/round2/') relPath = '/round2/index.html';
    else if (relPath === '/admin') relPath = '/admin.html';

    const safePath = path.normalize(path.join(PUBLIC_DIR, relPath));
    if (!safePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    let filePath = safePath;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    // Support HTTP Range requests for video files (portal animation.mp4)
    if (req.headers.range && ext === '.mp4') {
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      file.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[DevServer Error]:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Internal Server Error', details: err.message }));
  }
});

server.listen(PORT, () => {
  const mode = process.env.LOCAL_PREVIEW === '1'
    ? 'LOCAL PREVIEW DB (Demo registrations & teams active)'
    : `LIVE SUPABASE (${process.env.SUPABASE_URL})`;
  console.log(`\n🎃 MTC Halloween Event Full-Stack Server running!`);
  console.log(`   Mode:           ${mode}`);
  console.log(`   Round 1 (Quiz): http://localhost:${PORT}/`);
  console.log(`   Round 2 (Wheel):http://localhost:${PORT}/round2/`);
  console.log(`   Admin & Judge:  http://localhost:${PORT}/admin.html`);
  console.log(`   Judges Board:   http://localhost:${PORT}/round2/judges.html\n`);
});

