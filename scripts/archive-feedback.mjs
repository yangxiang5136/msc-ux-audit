#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const PAGE_KEYS = new Set([
  'chatA', 'chatB', 'chatC', 'chatD', 'chatE', 'chatF',
  'chatG', 'chatH', 'chatJ', 'chatK', 'architecture', 'product-spec',
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const body = arg.slice(2);
    if (body.includes('=')) {
      const [key, ...rest] = body.split('=');
      args[key] = rest.join('=');
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[body] = next;
      i += 1;
    } else {
      args[body] = true;
    }
  }
  return args;
}

function todayLocalDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isFeedbackRow(row) {
  return row &&
    typeof row === 'object' &&
    PAGE_KEYS.has(row.page_key) &&
    row.section_id &&
    row.version;
}

function rowsToPages(rows) {
  const pages = {};
  rows.filter(isFeedbackRow).forEach(row => {
    if (!pages[row.page_key]) pages[row.page_key] = { _v: 2 };
    if (!pages[row.page_key][row.section_id]) pages[row.page_key][row.section_id] = {};
    pages[row.page_key][row.section_id][String(row.version || '1')] = {
      c: row.choice === '' ? null : row.choice ?? null,
      n: row.note || '',
      t: row.updated_at || row.t || new Date().toISOString(),
    };
  });
  return pages;
}

function normalizeArchive(input, source) {
  const archivedAt = new Date().toISOString();
  if (Array.isArray(input)) {
    return {
      _schema: 'msc-feedback-archive/v1',
      _archived_at: archivedAt,
      _source: source,
      pages: rowsToPages(input),
    };
  }
  if (input && typeof input === 'object' && input.pages) {
    return {
      _schema: 'msc-feedback-archive/v1',
      _archived_at: archivedAt,
      _source: source,
      pages: input.pages,
    };
  }
  if (input && typeof input === 'object' && Array.isArray(input.rows)) {
    return {
      _schema: 'msc-feedback-archive/v1',
      _archived_at: archivedAt,
      _source: source,
      pages: rowsToPages(input.rows),
    };
  }
  throw new Error('Expected a decisions export with pages, an array of feedback rows, or { rows: [...] }');
}

async function readJson(file) {
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw);
}

async function fetchFeedbackRows(url, token) {
  const headers = {};
  if (token) headers['x-feedback-token'] = token;
  const res = await fetch(url, { headers });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload && payload.error ? payload.error : `HTTP ${res.status}`;
    throw new Error(`Failed to fetch feedback from ${url}: ${message}`);
  }
  if (!Array.isArray(payload)) {
    throw new Error(`Expected ${url} to return an array of feedback rows`);
  }
  return payload;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function updateManifest(outDir, entry) {
  const file = path.join(outDir, 'manifest.json');
  let manifest = { _schema: 'msc-feedback-archive-manifest/v1', archives: [] };
  if (await exists(file)) {
    manifest = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Array.isArray(manifest.archives)) manifest.archives = [];
  }
  manifest.archives = manifest.archives.filter(item => item.file !== entry.file);
  manifest.archives.push(entry);
  manifest.archives.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  await fs.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const date = args.date || todayLocalDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('--date must be YYYY-MM-DD');
  }

  const outDir = path.resolve(args['out-dir'] || 'feedback-archive');
  const outFile = path.join(outDir, `msc-feedback-${date}.json`);
  const force = !!args.force;

  let archive;
  if (args.input) {
    const inputFile = path.resolve(String(args.input));
    archive = normalizeArchive(await readJson(inputFile), `file:${inputFile}`);
  } else {
    const url = String(args.url || process.env.FEEDBACK_ARCHIVE_URL || 'http://127.0.0.1:8080/api/feedback');
    const token = String(args.token || process.env.FEEDBACK_READ_TOKEN || process.env.FEEDBACK_WRITE_TOKEN || process.env.MSC_FEEDBACK_TOKEN || '');
    const rows = await fetchFeedbackRows(url, token);
    archive = normalizeArchive(rows, url);
  }

  await fs.mkdir(outDir, { recursive: true });
  if (!force && await exists(outFile)) {
    throw new Error(`${outFile} already exists. Pass --force to overwrite.`);
  }

  await fs.writeFile(outFile, `${JSON.stringify(archive, null, 2)}\n`, 'utf8');
  await updateManifest(outDir, {
    date,
    file: path.basename(outFile),
    archived_at: archive._archived_at,
    source: archive._source,
    page_count: Object.keys(archive.pages || {}).length,
  });

  console.log(`Archived feedback to ${outFile}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
