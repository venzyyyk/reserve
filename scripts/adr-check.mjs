#!/usr/bin/env node
/**
 * Architecture Decision Log validator (engineering toolchain).
 *
 *   npm run adr:check
 *
 * A decision log rots in three specific ways, all of which this catches:
 *   1. an ADR missing the sections that make it a decision rather than a
 *      description — above all "Alternatives considered";
 *   2. the index drifting out of sync with the files on disk;
 *   3. a "Superseded" ADR that never says what replaced it, or an ADR
 *      claiming to supersede one that was left marked Accepted.
 *
 * It deliberately does not lint prose. The goal is a log that can be
 * trusted structurally, not one that is uniformly worded.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DIR = "docs/decisions";
const REQUIRED_SECTIONS = [
  "## Context",
  "## Decision",
  "## Alternatives considered",
  "## Consequences",
];
const STATUS_RE =
  /^\*\*Status:\*\*\s+(Proposed|Accepted|Superseded by|Deprecated)\b(.*)$/m;

const errors = [];
const files = readdirSync(DIR)
  .filter((f) => /^ADR-\d{4}-.+\.md$/.test(f))
  .sort();

if (files.length === 0) errors.push(`${DIR}: no ADRs found`);

const index = readFileSync(path.join(DIR, "README.md"), "utf8");

// Only table rows count as index entries — the README also contains prose
// examples of supersession that link to illustrative, non-existent ADRs.
const indexedFiles = new Set(
  index
    .split("\n")
    .filter((line) => /^\|\s*\[\d{4}\]\(/.test(line))
    .map((line) => /\((ADR-\d{4}-[^)]+\.md)\)/.exec(line)?.[1])
    .filter((f) => f !== undefined),
);
const seenNumbers = new Map();
const adrs = [];

for (const file of files) {
  const body = readFileSync(path.join(DIR, file), "utf8");
  const number = file.slice(4, 8);
  const where = `${DIR}/${file}`;

  if (seenNumbers.has(number)) {
    errors.push(
      `${where}: duplicate ADR number (also ${seenNumbers.get(number)})`,
    );
  }
  seenNumbers.set(number, file);

  if (!body.startsWith(`# ADR-${number}: `)) {
    errors.push(`${where}: first line must be "# ADR-${number}: <title>"`);
  }

  const status = STATUS_RE.exec(body);
  if (!status) {
    errors.push(
      `${where}: missing or malformed "**Status:**" line (Proposed | Accepted | Superseded by … | Deprecated)`,
    );
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!body.includes(`\n${section}\n`)) {
      errors.push(`${where}: missing required section "${section}"`);
    }
  }

  // An alternatives section with no rejected option is a description.
  const alternatives =
    body.split("## Alternatives considered")[1]?.split("\n## ")[0] ?? "";
  if (!/\|.*\|/.test(alternatives) && !/^\s*[-*]\s+\S/m.test(alternatives)) {
    errors.push(`${where}: "Alternatives considered" lists no rejected option`);
  }

  if (!indexedFiles.has(file)) {
    errors.push(`${where}: not listed in the ${DIR}/README.md index table`);
  }

  adrs.push({ file, number, body, status: status?.[0] ?? "" });
}

// Supersession must be mutual: the new ADR points back, the old points forward.
for (const adr of adrs) {
  const supersedes = adr.body.match(/supersedes\s+\[ADR-(\d{4})\]/);
  if (supersedes) {
    const target = adrs.find((a) => a.number === supersedes[1]);
    if (!target) {
      errors.push(
        `${DIR}/${adr.file}: supersedes ADR-${supersedes[1]}, which does not exist`,
      );
    } else if (!/^\*\*Status:\*\*\s+Superseded by/m.test(target.body)) {
      errors.push(
        `${DIR}/${target.file}: superseded by ADR-${adr.number} but still marked "${target.status.replace("**Status:** ", "")}"`,
      );
    }
  }

  if (/^\*\*Status:\*\*\s+Superseded by/m.test(adr.body)) {
    if (!/Superseded by \[ADR-\d{4}\]\([^)]+\)/.test(adr.body)) {
      errors.push(
        `${DIR}/${adr.file}: "Superseded by" must link to the replacing ADR`,
      );
    }
  }
}

// Every indexed file must exist (catches deletions and renames).
for (const indexed of indexedFiles) {
  if (!files.includes(indexed)) {
    errors.push(
      `${DIR}/README.md: index lists ${indexed}, which does not exist`,
    );
  }
}

if (errors.length) {
  console.error(`✗ Architecture Decision Log — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(
  `✓ Architecture Decision Log — ${files.length} ADRs, format and index consistent.`,
);
