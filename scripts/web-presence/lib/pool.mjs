// Exécute `task` sur chaque élément avec au plus `limit` appels simultanés, résultats dans l'ordre.

/** @template T, R @param {T[]} items @param {number} limit @param {(item: T) => Promise<R>} task */
export const mapLimit = async (items, limit, task) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};
