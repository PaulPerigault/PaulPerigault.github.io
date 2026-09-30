import { getViteConfig } from 'astro/config';

// getViteConfig : Vitest compile les composants .astro et résout l'alias `@/` comme le build.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    passWithNoTests: true,
  },
});
