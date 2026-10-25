#!/usr/bin/env node
/**
 * Idempotent question synchronization script.
 * Synchronizes server/questions.master.js definitions into public.questions in Supabase.
 *
 * Rules:
 * - Uses stable question_key natural keys for UPSERT.
 * - Idempotent: repeated runs produce the same state without duplicates.
 * - Questions removed from authoring source are marked is_active = false (never deleted).
 * - Safe dry-run support (--dry-run).
 * - Requires SUPABASE_URL and SUPABASE_SECRET_KEY in environment.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { QUESTION_DEFINITIONS } from '../server/questions.master.js';

const isDryRun = process.argv.includes('--dry-run');

function validateDefinitions(definitions) {
  const keys = new Set();
  const errors = [];

  for (const q of definitions) {
    if (!q.question_key || typeof q.question_key !== 'string') {
      errors.push(`Missing or invalid question_key: ${JSON.stringify(q)}`);
    }
    if (keys.has(q.question_key)) {
      errors.push(`Duplicate question_key detected: ${q.question_key}`);
    }
    keys.add(q.question_key);

    if (![1, 2, 3, 4].includes(q.seal_number)) {
      errors.push(`Invalid seal_number ${q.seal_number} for question_key ${q.question_key}`);
    }
    if (!['mcq', 'code', 'predict_output'].includes(q.question_type)) {
      errors.push(`Invalid question_type ${q.question_type} for question_key ${q.question_key}`);
    }
    if (!q.question_text) {
      errors.push(`Missing question_text for question_key ${q.question_key}`);
    }
    if (!q.answer_key || typeof q.answer_key !== 'object') {
      errors.push(`Missing private answer_key for question_key ${q.question_key}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed with ${errors.length} error(s):\n - ${errors.join('\n - ')}`);
  }
}

async function runSync() {
  console.log(`[Question Sync] Mode: ${isDryRun ? 'DRY-RUN (No database modifications)' : 'ACTIVE SYNC'}`);
  console.log(`[Question Sync] Total questions in source: ${QUESTION_DEFINITIONS.length}`);

  // 1. Validate all definitions first
  validateDefinitions(QUESTION_DEFINITIONS);
  console.log('[Question Sync] Validation passed successfully.');

  if (isDryRun) {
    console.log('[Question Sync] DRY-RUN completed without errors.');
    process.exit(0);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Question Sync] ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY must be provided in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  // 2. Fetch existing question keys to handle deactivations
  const { data: existingRows, error: fetchErr } = await supabase
    .from('questions')
    .select('id, question_key, is_active, seal_number, display_order');

  if (fetchErr) {
    console.error('[Question Sync] Failed to query existing questions:', fetchErr.message);
    process.exit(1);
  }

  const existingKeys = new Set((existingRows || []).map(r => r.question_key));
  const masterKeys = new Set(QUESTION_DEFINITIONS.map(q => q.question_key));
  const now = new Date().toISOString();

  // 3. Free (seal_number, display_order) slots before upsert.
  // questions_seal_order_unique applies even to inactive rows, so obsolete
  // questions must be moved off 1-5 before the new bank is written.
  const toDeactivateRows = (existingRows || []).filter(r => !masterKeys.has(r.question_key));
  if (toDeactivateRows.length > 0) {
    console.log(`[Question Sync] Deactivating ${toDeactivateRows.length} obsolete question(s)...`);
    for (const row of toDeactivateRows) {
      const retiredOrder = 100000 + Number(row.id);
      const { error: deactErr } = await supabase
        .from('questions')
        .update({
          is_active: false,
          display_order: retiredOrder,
          updated_at: now
        })
        .eq('question_key', row.question_key);

      if (deactErr) {
        console.error(`[Question Sync] Failed to deactivate ${row.question_key}:`, deactErr.message);
        process.exit(1);
      }
    }
    console.log(`[Question Sync] Successfully deactivated: ${toDeactivateRows.map(r => r.question_key).join(', ')}`);
  }

  // 4. Upsert active questions by question_key
  const upsertRows = QUESTION_DEFINITIONS.map(q => ({
    question_key: q.question_key,
    seal_number: q.seal_number,
    question_type: q.question_type,
    question_text: q.question_text,
    options: q.options,
    answer_key: q.answer_key,
    display_order: q.display_order,
    points: q.points || 1,
    is_active: q.is_active ?? true,
    updated_at: now
  }));

  const { error: upsertErr } = await supabase
    .from('questions')
    .upsert(upsertRows, { onConflict: 'question_key' });

  if (upsertErr) {
    console.error('[Question Sync] Error upserting questions:', upsertErr.message);
    process.exit(1);
  }

  console.log(`[Question Sync] Successfully upserted ${upsertRows.length} questions.`);

  console.log('[Question Sync] Complete and consistent with master definition.');
}

runSync().catch(err => {
  console.error('[Question Sync] Unhandled fatal error:', err.message);
  process.exit(1);
});
