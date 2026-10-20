// Image Playwright partagée par le job CI `visual` et `npm run test:visual:update` (#201) : même
// navigateur, mêmes polices système, même architecture (amd64, celle des runners GitHub). Sa version
// doit égaler celle de @playwright/test (scripts/workflows-visual.test.mjs).
export const VISUAL_IMAGE =
  'mcr.microsoft.com/playwright:v1.64.1-noble@sha256:7852dc5a7d72f5fe458a597d690f6c42fbc8e9e26ddfa95f8e6ef552558d9bbf';
export const VISUAL_PLATFORM = 'linux/amd64';
