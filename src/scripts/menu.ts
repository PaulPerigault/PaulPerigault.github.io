/** Menu mobile : <dialog> modal natif (focus piégé, Escape, retour du focus gérés par le navigateur). */
export const initMenu = (): void => {
  const dialog = document.querySelector<HTMLDialogElement>('[data-menu-dialog]');
  const opener = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!dialog || !opener) return;

  opener.addEventListener('click', () => {
    dialog.showModal();
    opener.setAttribute('aria-expanded', 'true');
  });
  dialog.addEventListener('close', () => opener.setAttribute('aria-expanded', 'false'));
  dialog.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target === dialog || target.closest('[data-menu-close], a')) dialog.close();
  });
};
