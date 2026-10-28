import crypto from 'node:crypto';

const COOKIE_NAME = 'mtc_quiz_session';
const ADMIN_COOKIE_NAME = 'mtc_admin_session';
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

/**
 * Derives a consistent 32-byte key from the secret string.
 */
function getDerivedKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Gets the session secret from environment variables.
 */
export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required.');
  }
  return secret;
}

/**
 * Safe session secret getter for runtime handlers that falls back to SUPABASE_SECRET_KEY if SESSION_SECRET is unset.
 */
export function getRuntimeSessionSecret() {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ;
}

/**
 * Encrypts and signs session data into an opaque token (AES-256-GCM).
 * @param {object} payload - Session payload, e.g. { registrationId, teamName }
 * @param {string} [secret] - Secret key
 * @returns {string} token in format: iv.authTag.ciphertext (base64url)
 */
export function createSessionToken(payload, secret = getSessionSecret()) {
  const key = getDerivedKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const data = JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + DEFAULT_MAX_AGE_SECONDS
  });

  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

/**
 * Verifies and decrypts an opaque session token.
 * @param {string} token
 * @param {string} [secret]
 * @returns {object|null} Decrypted payload or null if invalid/expired.
 */
export function verifySessionToken(token, secret = getSessionSecret()) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const key = getDerivedKey(secret);
    const iv = Buffer.from(parts[0], 'base64url');
    const tag = Buffer.from(parts[1], 'base64url');
    const ciphertext = Buffer.from(parts[2], 'base64url');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(decrypted.toString('utf8'));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Parses cookies from HTTP Cookie header string.
 */
export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

/**
 * Builds a Set-Cookie header string for the session cookie.
 */
export function serializeSessionCookie(token, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (isProd) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Builds a Set-Cookie header string to clear the session cookie.
 */
export function clearSessionCookie() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (isProd) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Extracts and verifies the session from an incoming HTTP request.
 */
export function getSessionFromRequest(req, secret = getRuntimeSessionSecret()) {
  const cookieHeader = req.headers.cookie || req.headers.Cookie;
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token, secret);
}

/**
 * Builds a Set-Cookie header string for the admin session cookie.
 */
export function serializeAdminCookie(token, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (isProd) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Clears the admin session cookie.
 */
export function clearAdminCookie() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const parts = [
    `${ADMIN_COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (isProd) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Extracts and verifies the admin session from an incoming HTTP request.
 */
export function getAdminSessionFromRequest(req, secret = getRuntimeSessionSecret()) {
  const cookieHeader = req.headers.cookie || req.headers.Cookie;
  const cookies = parseCookies(cookieHeader);
  const token = cookies[ADMIN_COOKIE_NAME];
  if (!token) return null;
  const payload = verifySessionToken(token, secret);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}
