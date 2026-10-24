// Politique DMARC de paulperigault.dev déclarée par la racine OpenTofu (#209) : quarantaine sur
// 100 % des messages, rapports agrégés conservés. (`tofu test` ne peut pas planifier la racine avec
// un provider simulé à cause des blocs `import` : la valeur est lue ici, le module est testé à part.)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const policy =
  /dmarc_policy\s*=\s*"([^"]+)"/.exec(readFileSync('infra/main.tf', 'utf8'))?.[1] ?? '';

describe('DMARC de paulperigault.dev', () => {
  it('passe de l’observation à la quarantaine, sur tous les messages', () => {
    expect(policy).toMatch(/^v=DMARC1; p=quarantine;/);
    expect(policy).toContain('pct=100');
  });

  it('garde les rapports agrégés pour surveiller la suite', () => {
    expect(policy).toMatch(/rua=mailto:\S+@paulperigault\.fr/);
  });
});
