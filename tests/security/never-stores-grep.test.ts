// SERVER_NEVER_STORES grep supplement.
//
// WHY this exists alongside scripts/integrity.sh Rule 9: that grep's sink
// list is fixed (console, prisma, pino|winston|logger|log|Sentry|posthog|
// analytics|datadog, inngest). A future agent adding a structured logger
// under a different name (`audit.`, `tracer.`, `metrics.`, `track(...)`,
// `.capture()`, `.write()`) would bypass Rule 9. This test re-greps the
// same SERVER_NEVER_STORES_GREP_TOKENS over a broader sink alternation and
// records the file:line so review is unambiguous.
//
// Scope: /app/api/, /lib/server/, /lib/db/, /lib/ai/, /jobs/. Missing
// directories are skipped — Day 2 ships Security primitives before most
// of those exist.

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SERVER_NEVER_STORES_GREP_TOKENS } from '@/contracts/storage';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

const SCAN_ROOTS = ['app/api', 'lib/server', 'lib/db', 'lib/ai', 'jobs'];

// Broader sink alternation than integrity.sh Rule 9. Kept narrow to verbs
// that only loggers / analytics / persistence APIs use — generic
// collection ops (push, append, add) and Zustand-style state setters
// (set, update) are NOT included because they routinely accept tagged
// untrusted content as data on the way INTO the system, not as a sink.
//
// The integrity.sh grep already covers the named log libraries (console,
// pino, winston, Sentry, posthog, analytics, datadog) and Prisma. This
// supplement catches structured loggers added later under a different
// name: `audit.error(...)`, `tracer.record(...)`, `metrics.capture(...)`,
// etc.
const SINK_PATTERN = new RegExp(
  [
    // Logger / analytics / tracing verbs that imply persistence or egress.
    '\\b\\w+\\.(log|info|warn|error|debug|trace|fatal|track|capture|captureException|record|publish)\\(',
    // DB-write verbs that imply server-side persistence beyond `prisma.`.
    '\\b\\w+\\.(create|upsert|createMany|updateMany|deleteMany|executeRaw|raw|query)\\(',
    // Fetch/network egress.
    '\\bfetch\\s*\\(',
    // Process IO.
    '\\bprocess\\.(stdout|stderr)\\.write\\(',
  ].join('|'),
);

async function listTsFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;                                          // directory absent: skip
    }
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
        await walk(full);
      } else if (/\.(ts|tsx)$/.test(ent.name)) {
        out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

type Finding = { file: string; line: number; token: string; text: string };

async function scan(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const tokenAlt = SERVER_NEVER_STORES_GREP_TOKENS.join('|');
  const tokenRe = new RegExp(`\\b(${tokenAlt})\\b`);

  for (const rel of SCAN_ROOTS) {
    const root = join(REPO_ROOT, rel);
    const files = await listTsFiles(root);
    for (const file of files) {
      const text = await readFile(file, 'utf8');
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // WHY skip comments and string literals' identifier comments:
        // the goal is to catch values flowing to sinks, not docstrings.
        // Whole-line comment skip is the lowest-false-positive cut.
        if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
        if (!SINK_PATTERN.test(line)) continue;
        const tokenMatch = line.match(tokenRe);
        if (!tokenMatch) continue;
        findings.push({
          file: relative(REPO_ROOT, file),
          line: i + 1,
          token: tokenMatch[1]!,
          text: line.trim().slice(0, 200),
        });
      }
    }
  }
  return findings;
}

describe('SERVER_NEVER_STORES — supplemental grep', () => {
  it('no never-stores token appears at a write/egress sink in server code', async () => {
    const findings = await scan();
    if (findings.length > 0) {
      const summary = findings
        .map((f) => `  ${f.file}:${f.line}  [${f.token}]  ${f.text}`)
        .join('\n');
      throw new Error(
        `SERVER_NEVER_STORES grep found ${findings.length} violation(s):\n${summary}`,
      );
    }
    expect(findings).toEqual([]);
  });
});
