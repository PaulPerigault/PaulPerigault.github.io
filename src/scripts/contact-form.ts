import { CONTACT_FIELDS, HONEYPOT_FIELD, resultOf, type Result } from '@/lib/contact-form';
import { checkFields, setFieldError, setStatus, type Messages } from './form-feedback';
import { startTurnstile, type Widget } from './turnstile-loader';

const value = (data: FormData, name: string): string => String(data.get(name) ?? '').trim();

/** Envoie le message au Worker ; une panne réseau devient « indisponible ». */
async function send(form: HTMLFormElement, token: string): Promise<Result> {
  const data = new FormData(form);
  const fields = [...CONTACT_FIELDS, HONEYPOT_FIELD].map((name) => [name, value(data, name)]);
  const payload = { ...Object.fromEntries(fields), turnstileToken: token };
  try {
    const response = await fetch(form.dataset['endpoint'] ?? '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return resultOf(response.ok, await response.json().catch(() => null));
  } catch {
    return resultOf(false, null);
  }
}

function show(form: HTMLFormElement, result: Result, messages: Messages, widget: Widget | null) {
  for (const field of result.fields) setFieldError(form, field, messages.rejected);
  setStatus(form, messages[result.outcome]);
  if (result.outcome === 'sent') form.reset();
  if (result.outcome !== 'invalid') widget?.reset();
}

async function submit(form: HTMLFormElement, messages: Messages, widget: Promise<Widget | null>) {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!button || button.disabled) return;
  setStatus(form, '');
  if (checkFields(form, messages).length > 0) return setStatus(form, messages.invalid);
  const ready = await widget;
  const token = ready?.token() ?? '';
  if (token === '') return setStatus(form, ready ? messages.challenge : messages.unavailable);
  button.disabled = true;
  setStatus(form, messages.sending);
  show(form, await send(form, token), messages, ready);
  button.disabled = false;
}

export const initContactForm = (): void => {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  const container = form?.querySelector<HTMLElement>('[data-turnstile-container]');
  if (!form || !container) return;
  const { turnstileSrc = '', sitekey = '', lang = 'fr', messages = '{}' } = form.dataset;
  let widget: Promise<Widget | null> = Promise.resolve(null);
  // Turnstile seulement quand le visiteur commence à remplir le formulaire, jamais au chargement.
  const load = () => {
    widget = startTurnstile(turnstileSrc, container, { sitekey, language: lang }).catch(() => null);
  };
  form.addEventListener('focusin', load, { once: true });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submit(form, JSON.parse(messages) as Messages, widget);
  });
};
