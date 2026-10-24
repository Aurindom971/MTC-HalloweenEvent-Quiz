import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

/**
 * Returns a trusted Supabase client using Service-Role key from server environment.
 * The client bypasses public RLS to read registration data and update team answers.
 */
export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase server credentials missing in process.env (SUPABASE_URL and SUPABASE_SECRET_KEY required).');
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedClient;
}

/**
 * Normalizes email: lowercases and trims.
 */
export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes an Indian mobile number to a standard 10-digit national number.
 * Handles prefixes such as '+91', '91', '0', leading/trailing whitespace, dashes, and parentheses.
 * Returns null if the resulting number is not a valid 10-digit Indian mobile number (starting with 6-9).
 *
 * @param {string|number} phone
 * @returns {string|null} 10-digit mobile number or null if invalid
 */
export function normalizeIndianMobile(phone) {
  if (phone === null || phone === undefined) return null;
  const raw = String(phone).trim();
  if (!raw) return null;

  // Extract only digit characters
  const digits = raw.replace(/\D/g, '');

  // Check 10-digit number: 6-9 followed by 9 digits
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  // Check 11-digit number starting with trunk prefix '0'
  if (digits.length === 11 && digits.startsWith('0')) {
    const national = digits.slice(1);
    if (/^[6-9]\d{9}$/.test(national)) {
      return national;
    }
  }

  // Check 12-digit number starting with country code '91'
  if (digits.length === 12 && digits.startsWith('91')) {
    const national = digits.slice(2);
    if (/^[6-9]\d{9}$/.test(national)) {
      return national;
    }
  }

  return null;
}

/**
 * Validates whether the input represents a valid Indian mobile number.
 * @param {string|number} phone
 * @returns {boolean}
 */
export function isValidIndianMobile(phone) {
  return normalizeIndianMobile(phone) !== null;
}

/**
 * Normalizes phone number: strips non-digits or standardizes string.
 * Preserved for backward compatibility, returns 10-digit standard Indian mobile if valid,
 * or raw extracted digits.
 */
export function normalizePhone(phone) {
  const normalized = normalizeIndianMobile(phone);
  if (normalized) return normalized;
  if (typeof phone !== 'string' && typeof phone !== 'number') return '';
  return String(phone).replace(/\D/g, '');
}
