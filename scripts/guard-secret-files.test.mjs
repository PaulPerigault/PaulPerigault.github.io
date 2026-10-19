import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { decide } from './guard-secret-files.mjs';
import { secretFilesIn } from './lib/secret-files.mjs';

const event = (command) => JSON.stringify({ tool_name: 'Bash', tool_input: { command } });

describe('secretFilesIn : fichiers de secrets cités par une commande', () => {
  it.each([
    ['cat infra/.secrets.env', '.secrets.env'],
    ['Get-Content -Path infra\\.secrets.env', '.secrets.env'],
    ['type "worker\\.dev.vars"', '.dev.vars'],
    ['cp .env /tmp/x', '.env'],
    ['less config/prod.env', 'prod.env'],
    ['head .env.local', '.env.local'],
    ["sed -n 1p '*.env'", '*.env'],
    ['node -e "t = \\`infra/.secrets.env\\`"', '.secrets.env'],
    // Jokers en fin de nom et casse (APFS et NTFS ignorent la casse) : accidents réalistes.
    ['cat .env*', '.env*'],
    ["find . -name '.env.*'", '.env.*'],
    ['cat infra/.secrets.env*', '.secrets.env*'],
    ['ls worker/.dev.vars?', '.dev.vars?'],
    ['cat .env~', '.env~'],
    ['cat infra/.SECRETS.ENV', '.SECRETS.ENV'],
    ['Get-Content worker\\.Dev.Vars', '.Dev.Vars'],
  ])('repère « %s »', (command, name) => {
    expect(secretFilesIn(command).some((token) => token.includes(name))).toBe(true);
  });

  it('analyse en temps linéaire une suite de jokers (pas de ReDoS)', () => {
    const start = performance.now();
    secretFilesIn(`cat .env${'*'.repeat(50_000)}!`);
    secretFilesIn(`cat .dev.vars${'*'.repeat(50_000)}!`);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it.each([
    'npm run verify',
    'node -e "console.log(process.env.CI)"',
    'echo $env:PATH',
    'cat worker/.dev.vars.example',
    'cat .env.example',
    'git status --short',
    'terraform -chdir=infra validate',
    'vi .envrc-notes.md',
  ])('laisse passer « %s »', (command) => {
    expect(secretFilesIn(command)).toEqual([]);
  });
});

describe('decide : décision du hook', () => {
  it('refuse en nommant le fichier', () => {
    expect(decide(event('cat infra/.secrets.env'))).toContain('.secrets.env');
  });

  it('accepte une commande neutre et un événement sans commande', () => {
    expect(decide(event('npm test'))).toBeNull();
    expect(decide(JSON.stringify({ tool_name: 'Read', tool_input: {} }))).toBeNull();
  });

  it('refuse par prudence un événement illisible', () => {
    expect(decide('{pas du json')).toMatch(/illisible/);
  });
});

describe('script du hook (processus réel)', () => {
  const run = (input) =>
    spawnSync(process.execPath, ['scripts/guard-secret-files.mjs'], { input, encoding: 'utf8' });

  it('sort en code 2 avec la raison sur stderr', () => {
    const result = run(event('Get-Content infra/.secrets.env'));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('.secrets.env');
  });

  it('sort en code 0 sans rien écrire pour une commande neutre', () => {
    const result = run(event('npm run lint'));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
