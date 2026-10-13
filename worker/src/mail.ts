import type { MailConfig } from './config';
import type { ContactMessage } from './validate';

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Message en **texte brut** (pas de HTML, donc rien à échapper). Le visiteur est en `reply_to` :
 * répondre depuis la boîte de réception lui écrit directement ; rien n'est conservé par le Worker.
 */
export const buildEmail = (contact: ContactMessage, config: MailConfig) => ({
  from: config.from,
  to: [config.to],
  reply_to: contact.email,
  subject: `Message de ${contact.name} via paulperigault.fr`,
  text: `${contact.name} <${contact.email}> a écrit :\n\n${contact.message}\n`,
});

/** @returns `true` si Resend a accepté le message. Une erreur réseau remonte à l'appelant. */
export async function sendEmail(
  fetchFn: typeof fetch,
  config: MailConfig,
  contact: ContactMessage,
): Promise<boolean> {
  const response = await fetchFn(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildEmail(contact, config)),
  });
  return response.ok;
}
