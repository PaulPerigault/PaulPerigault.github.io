import { describe, expect, it } from 'vitest';
import { certificationsNewestFirst, newestFirst } from './chronology';

const item = (id: string, dateStart: string, dateEnd: string | null) => ({
  id,
  dateStart,
  dateEnd,
});
const ids = (items: readonly { id: string }[]) => items.map(({ id }) => id);

describe('newestFirst', () => {
  it('place la période en cours en tête, puis trie par fin décroissante', () => {
    const sorted = newestFirst([
      item('42', '2022-08', '2022-08'),
      item('patounes', '2022-01', '2022-12'),
      item('wevii', '2023-09', null),
    ]);
    expect(ids(sorted)).toEqual(['wevii', 'patounes', '42']);
  });

  it('départage à fin égale par début décroissant', () => {
    const sorted = newestFirst([item('a', '2020-01', '2022-06'), item('b', '2021-01', '2022-06')]);
    expect(ids(sorted)).toEqual(['b', 'a']);
  });

  it("ne modifie pas le tableau d'origine", () => {
    const original = [item('a', '2020-01', '2020-02'), item('b', '2021-01', null)];
    newestFirst(original);
    expect(ids(original)).toEqual(['a', 'b']);
  });
});

describe('certificationsNewestFirst', () => {
  it('met les certifications en préparation en tête puis trie par obtention décroissante', () => {
    const sorted = certificationsNewestFirst([
      { id: 'cdl', dateIssued: '2024-11' },
      { id: 'ace', dateIssued: null },
      { id: 'quest', dateIssued: '2026-03' },
    ]);
    expect(ids(sorted)).toEqual(['ace', 'quest', 'cdl']);
  });
});
