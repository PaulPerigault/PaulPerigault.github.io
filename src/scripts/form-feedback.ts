import { CONTACT_FIELDS, type ContactField } from '@/lib/contact-form';

/** Messages traduits, fournis par le composant (`data-messages`). */
export interface Messages {
  readonly required: string;
  readonly email: string;
  readonly tooLong: string;
  readonly rejected: string;
  readonly invalid: string;
  readonly sent: string;
  readonly challenge: string;
  readonly rate_limited: string;
  readonly unavailable: string;
  readonly sending: string;
}

type Control = HTMLInputElement | HTMLTextAreaElement;

const controlOf = (form: HTMLFormElement, field: ContactField): Control | null =>
  form.querySelector<Control>(`[name="${field}"]`);

/** Affiche (ou efface, avec `null`) l'erreur d'un champ ; le lecteur d'écran la lit au focus. */
export function setFieldError(form: HTMLFormElement, field: ContactField, message: string | null) {
  const control = controlOf(form, field);
  const error = control && document.getElementById(`${control.id}-error`);
  if (!control || !error) return;
  error.textContent = message ?? '';
  error.hidden = message === null;
  if (message === null) control.removeAttribute('aria-invalid');
  else control.setAttribute('aria-invalid', 'true');
}

const problemOf = (control: Control, messages: Messages): string | null => {
  if (control.value.trim() === '') return messages.required;
  if (control.validity.typeMismatch) return messages.email;
  return control.validity.tooLong ? messages.tooLong : null;
};

/** Vérifie les champs côté client ; renvoie les champs en erreur (premier reçoit le focus). */
export function checkFields(form: HTMLFormElement, messages: Messages): ContactField[] {
  const invalid = CONTACT_FIELDS.filter((field) => {
    const control = controlOf(form, field);
    const problem = control ? problemOf(control, messages) : null;
    setFieldError(form, field, problem);
    return problem !== null;
  });
  if (invalid[0]) controlOf(form, invalid[0])?.focus();
  return invalid;
}

/** Message de la zone `role="status"` (annoncée poliment) ; `''` l'efface. */
export const setStatus = (form: HTMLFormElement, message: string): void => {
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  if (status) status.textContent = message;
};
