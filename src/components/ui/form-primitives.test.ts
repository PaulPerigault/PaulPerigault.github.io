import { describe, expect, it } from 'vitest';
import { render } from '@/test/render';
import FormField from './FormField.astro';

describe('FormField', () => {
  it('relie le libellé au champ et le champ à sa zone d’erreur', async () => {
    const html = await render(FormField, {
      props: { id: 'f-email', name: 'email', label: 'E-mail', type: 'email', maxlength: 254 },
    });
    expect(html).toMatch(/<label for="f-email"[^>]*>E-mail<\/label>/);
    expect(html).toMatch(/<input[^>]*id="f-email"[^>]*type="email"/);
    expect(html).toContain('aria-describedby="f-email-error"');
    expect(html).toMatch(/<p id="f-email-error"[^>]*hidden/);
    expect(html).toContain('maxlength="254"');
    expect(html).toContain('required');
  });

  it('rend une zone de texte multiligne', async () => {
    const html = await render(FormField, {
      props: { id: 'f-msg', name: 'message', label: 'Message', type: 'textarea', maxlength: 5000 },
    });
    expect(html).toMatch(/<textarea[^>]*id="f-msg"/);
    expect(html).not.toContain('<input');
  });
});
