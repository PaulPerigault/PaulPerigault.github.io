// Règles CI propres au formulaire de contact : Worker et Terraform contrôlés à chaque PR, aucun
// `apply` automatique, déploiement du Worker avec un token dédié, fournisseur Terraform jamais
// fusionné automatiquement.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = '.github/workflows';
const text = (name) => readFileSync(join(DIR, name), 'utf8');
const job = (workflow, name) =>
  text(workflow)
    .split(new RegExp(`^ {2}${name}:\\n`, 'm'))[1]
    ?.split(/^ {2}\w/m)[0] ?? '';

describe('CI du formulaire de contact', () => {
  it('teste le Worker avec ses propres dépendances', () => {
    const worker = job('ci.yml', 'worker');
    expect(worker).toContain('working-directory: worker');
    expect(worker).toContain('run: npm ci');
    expect(worker).toContain('run: npm run verify');
  });

  it('vérifie OpenTofu sans backend ni secret : fmt et validate (helpers testés par Vitest)', () => {
    const infra = job('ci.yml', 'infra');
    expect(infra).toContain('tofu fmt -check -recursive infra');
    expect(infra).toMatch(/opentofu\/setup-opentofu@[0-9a-f]{40} # v\d/);
    expect(infra).toContain('init -backend=false');
    expect(infra).toContain('validate');
    expect(infra).toContain('run: tofu -chdir=infra test');
    expect(infra).toContain('run: tofu -chdir=infra/identity test');
    expect(infra).not.toMatch(/\$\{\{\s*secrets\./);
  });

  it('n’applique jamais OpenTofu ni Terraform dans aucun workflow', () => {
    for (const name of readdirSync(DIR).filter((file) => file.endsWith('.yml'))) {
      expect(text(name), name).not.toMatch(/(?:terraform|tofu)[^\n]*\b(apply|destroy)\b/);
      expect(text(name), name).not.toMatch(/infra(?:-tf\.mjs|:tf)/);
    }
  });

  it('déploie le Worker depuis main seulement, avec le token dédié, après ses contrôles', () => {
    const deploy = text('deploy-worker.yml');
    expect(deploy).toMatch(/push:\n\s+branches: \[main\]/);
    expect(deploy).toContain('secrets.CLOUDFLARE_API_TOKEN_DEPLOY');
    expect(deploy).not.toMatch(/\$\{\{\s*secrets\.(?!CLOUDFLARE_API_TOKEN_DEPLOY\b)\w+/);
    expect(deploy.indexOf('run: npm run verify')).toBeLessThan(
      deploy.indexOf('run: npx wrangler deploy'),
    );
  });

  it('ne fusionne jamais automatiquement le fournisseur de l’infra (OpenTofu)', () => {
    expect(text('dependabot-auto-merge.yml')).toContain("package-ecosystem != 'opentofu'");
    const dependabot = readFileSync('.github/dependabot.yml', 'utf8');
    expect(dependabot).toMatch(/package-ecosystem: npm\n\s+directory: \/worker/);
    expect(dependabot).toMatch(/package-ecosystem: opentofu\n\s+directory: \/infra/);
  });
});
