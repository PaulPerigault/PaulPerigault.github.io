// Garde-fou : le code source respecte la charte de design (voir scripts/lib/design-rules.mjs).
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { RULES } from './lib/design-rules.mjs';
import { walk } from './lib/walk.mjs';

const EXTENSIONS = ['.astro', '.ts', '.css', '.json'];

/** @returns {{ file: string, line: number, rule: string, message: string, excerpt: string }[]} */
export function checkFile(file, text) {
  const extension = extname(file);
  const rules = RULES.filter(
    (rule) =>
      rule.only.includes(extension) && !(rule.allow ?? []).some((pattern) => pattern.test(file)),
  );
  return text.split('\n').flatMap((content, index) =>
    rules
      .filter((rule) => rule.pattern.test(content))
      .map((rule) => ({
        file,
        line: index + 1,
        rule: rule.name,
        message: rule.message,
        excerpt: content.trim().slice(0, 80),
      })),
  );
}

export function run(root = 'src') {
  return walk(root, EXTENSIONS).flatMap((file) => checkFile(file, readFileSync(file, 'utf8')));
}

if (import.meta.main) {
  const violations = run();
  for (const v of violations)
    console.error(`${v.file}:${v.line} [${v.rule}] ${v.message}\n    ${v.excerpt}`);
  if (violations.length > 0) process.exit(1);
  console.log('check-design: OK');
}
