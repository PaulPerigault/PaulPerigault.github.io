/** Écrit dans localStorage sans jamais lever : le stockage peut être bloqué (mode privé, cookies). */
export const writeStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Préférence non mémorisée : la page reste pleinement utilisable.
  }
};
