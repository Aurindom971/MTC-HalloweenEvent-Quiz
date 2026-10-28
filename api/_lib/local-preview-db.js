import fs from 'node:fs';
import path from 'node:path';
import { QUESTION_DEFINITIONS } from '../../server/questions.master.js';

const STORE_FILE = path.join(process.cwd(), '.local-preview-db.json');

const DEFAULT_STORE = {
  registrations: [
    {
      id: 101,
      full_name: 'Ishit Singh',
      student_id: 'A2305223001',
      phone: '+919876543210',
      email: 'ishit2807@gmail.com',
      course: 'B.Tech CSE',
      academic_year: 2,
      semester: 3,
      team_size: 2,
      member2_name: 'Aarav Verma',
      member2_phone: '+919876543211',
      member2_email: 'aarav@amity.edu',
      registration_code: 'MTC-HAL-101',
      created_at: new Date(Date.now() - 3600_000 * 5).toISOString()
    },
    {
      id: 102,
      full_name: 'Riya Sharma',
      student_id: 'A2305223045',
      phone: '+919988776655',
      email: 'riya@example.com',
      course: 'B.Tech AI',
      academic_year: 3,
      semester: 5,
      team_size: 2,
      member2_name: 'Kabir Mehta',
      member2_phone: '+919988776656',
      member2_email: 'kabir@example.com',
      registration_code: 'MTC-HAL-102',
      created_at: new Date(Date.now() - 3600_000 * 4).toISOString()
    },
    {
      id: 103,
      full_name: 'Devansh Gupta',
      student_id: 'A2305223089',
      phone: '+919123456789',
      email: 'devansh@example.com',
      course: 'B.Tech IT',
      academic_year: 1,
      semester: 1,
      team_size: 1,
      member2_name: null,
      member2_phone: null,
      member2_email: null,
      registration_code: 'MTC-HAL-103',
      created_at: new Date(Date.now() - 3600_000 * 3).toISOString()
    }
  ],
  team_answers: [
    {
      id: 1,
      registration_id: 102,
      submitted: true,
      updated_at: new Date(Date.now() - 1800_000).toISOString(),
      answers: {
        seal_1: { s1_q1_http_403: 1, s1_q2_css_transform_opacity: 1, s1_q3_css_rem: 1, s1_q4_git_commit_push: 1, s1_q5_oops_polymorphism_private: 1 },
        seal_2: { s2_q2_bhoothnath_jalebis: 'Jalebis' },
        seal_3: { s3_q1_anagram_complexity: 1, s3_q2_golmaal_laxman: 'Laxman', s3_q3_bubble_sort_best_case: 1, s3_q4_stack_postfix: 1, s3_q5_stable_sort_quicksort: 1 },
        seal_4: { s4_q1_py_even_sum: '6', s4_q2_bulbbul_ulte_pair: 'Ulte pair', s4_q3_cpp_nested_sum: '24', s4_q4_py_slice_supernatural: 'TNE', s4_q5_c_post_increment: '6 5' },
        _meta: {
          teamName: 'Hexblade Syndicate',
          teamKey: 'hexblade-syndicate',
          startedAt: new Date(Date.now() - 3600_000).toISOString(),
          lastActiveAt: new Date(Date.now() - 900_000).toISOString(),
          currentSeal: 4,
          answeredCount: 16,
          r1Score: 16,
          r1Total: 20,
          r1SubmittedAt: new Date(Date.now() - 1800_000).toISOString(),
          r2: {
            stage: 5,
            charId: 'alucard',
            problem: ' Haunted Hospital Triage Dashboard ',
            hex: 'Blood Moon Inverted Contrast',
            twist: 'Voice-activated emergency panic mode',
            submissionUrl: 'https://hexblade-hospital-demo.vercel.app',
            repoUrl: 'https://github.com/example/hexblade-hospital',
            submittedAt: Date.now() - 600_000
          },
          judging: {
            score: 8.5,
            description: 'Great atmospheric UI and working twist implementation.',
            judgedBy: 'Lead Judge',
            judgedAt: new Date(Date.now() - 300_000).toISOString()
          }
        }
      }
    },
    {
      id: 2,
      registration_id: 103,
      submitted: false,
      updated_at: new Date(Date.now() - 600_000).toISOString(),
      answers: {
        seal_1: { s1_q1_http_403: 1, s1_q2_css_transform_opacity: 1, s1_q3_css_rem: 1 },
        _meta: {
          teamName: 'Phantom Pointers',
          teamKey: 'phantom-pointers',
          startedAt: new Date(Date.now() - 1200_000).toISOString(),
          lastActiveAt: new Date(Date.now() - 600_000).toISOString(),
          currentSeal: 1,
          answeredCount: 3,
          liveScore: 3
        }
      }
    }
  ],
  r2_teams: [
    {
      key: 'hexblade-syndicate',
      name: 'Hexblade Syndicate',
      owner: 'local-preview-owner',
      created_at: new Date(Date.now() - 1800_000).toISOString(),
      updated_at: new Date(Date.now() - 600_000).toISOString(),
      data: {
        stage: 5,
        charId: 'alucard',
        problem: 'Haunted Hospital Triage Dashboard',
        hex: 'Blood Moon Inverted Contrast',
        twist: 'Voice-activated emergency panic mode',
        submissionUrl: 'https://hexblade-hospital-demo.vercel.app',
        repoUrl: 'https://github.com/example/hexblade-hospital',
        submittedAt: Date.now() - 600_000,
        leader: {
          name: 'Riya Sharma',
          year: '3rd Year',
          branch: 'B.Tech AI',
          phone: '9988776655',
          email: 'riya@example.com'
        },
        members: [
          {
            name: 'Kabir Mehta',
            year: '3rd Year',
            branch: 'B.Tech AI',
            phone: '9988776656',
            email: 'kabir@example.com'
          }
        ]
      }
    }
  ],
  questions: QUESTION_DEFINITIONS.map((q, idx) => ({ id: idx + 1, ...q }))
};

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      return {
        registrations: raw.registrations || DEFAULT_STORE.registrations,
        team_answers: raw.team_answers || DEFAULT_STORE.team_answers,
        r2_teams: raw.r2_teams || DEFAULT_STORE.r2_teams,
        questions: DEFAULT_STORE.questions
      };
    }
  } catch {
    // fallback to default store
  }
  return structuredClone(DEFAULT_STORE);
}

function saveStore(store) {
  try {
    const toWrite = {
      registrations: store.registrations,
      team_answers: store.team_answers,
      r2_teams: store.r2_teams
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(toWrite, null, 2), 'utf8');
  } catch {
    // ignore write errors
  }
}

class LocalQueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orderBy = [];
    this.limitCount = null;
    this.singleMode = null; // 'single' | 'maybeSingle'
    this.operation = 'select';
    this.payload = null;
    this.upsertOpts = null;
  }

  select() {
    return this;
  }

  eq(col, val) {
    this.filters.push(row => String(row?.[col] ?? '') === String(val ?? ''));
    return this;
  }

  ilike(col, val) {
    const needle = String(val ?? '').toLowerCase();
    this.filters.push(row => String(row?.[col] ?? '').toLowerCase() === needle);
    return this;
  }

  order(col, opts = {}) {
    this.orderBy.push({ col, ascending: opts.ascending !== false });
    return this;
  }

  limit(n) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  insert(payload) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  upsert(payload, opts = {}) {
    this.operation = 'upsert';
    this.payload = payload;
    this.upsertOpts = opts;
    return this;
  }

  _execute() {
    const store = loadStore();
    const rows = store[this.table] || [];

    if (this.operation === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = items.map((item, idx) => ({
        id: item.id ?? Date.now() + idx,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item
      }));
      rows.push(...inserted);
      store[this.table] = rows;
      saveStore(store);
      const data = this.singleMode ? (inserted[0] || null) : inserted;
      return { data, error: null };
    }

    if (this.operation === 'update') {
      const matched = [];
      for (let i = 0; i < rows.length; i++) {
        if (this.filters.every(fn => fn(rows[i]))) {
          rows[i] = { ...rows[i], ...this.payload };
          matched.push(rows[i]);
        }
      }
      store[this.table] = rows;
      saveStore(store);
      const data = this.singleMode ? (matched[0] || null) : matched;
      return { data, error: null };
    }

    if (this.operation === 'upsert') {
      const conflictKey = this.upsertOpts?.onConflict || 'id';
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const result = [];
      for (const item of items) {
        const existingIdx = rows.findIndex(r => String(r?.[conflictKey]) === String(item?.[conflictKey]));
        if (existingIdx >= 0) {
          rows[existingIdx] = { ...rows[existingIdx], ...item };
          result.push(rows[existingIdx]);
        } else {
          const created = {
            id: item.id ?? Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...item
          };
          rows.push(created);
          result.push(created);
        }
      }
      store[this.table] = rows;
      saveStore(store);
      const data = this.singleMode ? (result[0] || null) : result;
      return { data, error: null };
    }

    // SELECT
    let matched = rows.filter(r => this.filters.every(fn => fn(r)));

    for (let i = this.orderBy.length - 1; i >= 0; i--) {
      const { col, ascending } = this.orderBy[i];
      matched.sort((a, b) => {
        if (a[col] < b[col]) return ascending ? -1 : 1;
        if (a[col] > b[col]) return ascending ? 1 : -1;
        return 0;
      });
    }

    if (typeof this.limitCount === 'number') {
      matched = matched.slice(0, this.limitCount);
    }

    if (this.singleMode === 'single') {
      if (matched.length === 0) {
        return { data: null, error: { message: 'Row not found' } };
      }
      return { data: matched[0], error: null };
    }

    if (this.singleMode === 'maybeSingle') {
      return { data: matched[0] || null, error: null };
    }

    return { data: matched, error: null };
  }

  then(resolve, reject) {
    try {
      resolve(this._execute());
    } catch (err) {
      if (reject) reject(err);
    }
  }
}

export function createLocalPreviewSupabaseClient() {
  return {
    from(table) {
      return new LocalQueryBuilder(table);
    },
    async rpc() {
      return { data: null, error: null };
    }
  };
}

