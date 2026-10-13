/** Apparence commune des boutons : liens stylés (`ButtonLink`) et vrais `<button>` (formulaire). */
export type ButtonVariant = 'primary' | 'secondary';

export const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-sm border px-5 py-2.5 text-sm font-medium transition-colors duration-(--pp-duration)';

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'border-accent bg-accent text-on-accent hover:border-fg hover:bg-fg hover:text-bg',
  secondary: 'border-control text-fg hover:border-accent hover:text-accent',
};
