import { describe, expect, it } from 'vitest';
import { buildRobots } from './robots';

const robots = buildRobots('https://paulperigault.fr/sitemap-index.xml');
const agents = [...robots.matchAll(/^User-agent: (.+)$/gm)].map((match) => match[1]);

describe('buildRobots', () => {
  it.each([
    'Googlebot',
    'Bingbot',
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-SearchBot',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    'Meta-ExternalAgent',
  ])('autorise explicitement %s', (agent) => {
    expect(agents).toContain(agent);
  });

  it("n'interdit rien : aucun Disallow", () => {
    expect(robots).not.toMatch(/^Disallow:\s*\S/m);
  });

  it('chaque groupe autorise la racine et le dernier groupe est le joker', () => {
    const groups = robots.split('\n\n').filter((block) => block.includes('User-agent'));
    for (const block of groups) expect(block).toContain('Allow: /');
    expect(agents.at(-1)).toBe('*');
  });

  it('ne contient que des directives standard, puis le sitemap', () => {
    const directives = [...robots.matchAll(/^([A-Za-z-]+):/gm)].map((match) => match[1]);
    expect(new Set(directives)).toEqual(new Set(['User-agent', 'Allow', 'Sitemap']));
    expect(robots).toContain('Sitemap: https://paulperigault.fr/sitemap-index.xml');
  });

  it('ne déclare aucun agent en double', () => {
    expect(new Set(agents).size).toBe(agents.length);
  });
});
