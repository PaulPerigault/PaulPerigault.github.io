import { describe, expect, it } from 'vitest';
import { SITE } from '@/config/site';
import { allowContactForm } from './contact-csp';

describe('allowContactForm', () => {
  it('redonne `self` aux scripts et n’ouvre que le Worker et Turnstile', () => {
    const scripts: string[] = [];
    const directives: string[] = [];
    allowContactForm({
      insertScriptResource: (resource) => scripts.push(resource),
      insertDirective: (directive) => directives.push(directive),
    });
    expect(scripts).toEqual(["'self'", SITE.turnstileOrigin]);
    expect(directives).toEqual([
      `frame-src ${SITE.turnstileOrigin}`,
      `connect-src 'self' ${new URL(SITE.contactEndpoint).origin} ${SITE.turnstileOrigin}`,
    ]);
    expect([...scripts, ...directives].join(' ')).not.toMatch(/unsafe|\*/);
  });

  it('ne fait rien sans API CSP (rendu hors build, tests de composants)', () => {
    expect(() => allowContactForm(undefined)).not.toThrow();
  });
});
