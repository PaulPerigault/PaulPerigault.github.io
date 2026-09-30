// Architecture en couches : chaque couche liste les couches qu'elle a le droit d'importer.
// (dependency-cruiser ne lit pas les fichiers .astro : ce contrôle maison couvre .ts et .astro.)
const LAYERS = {
  'src/domain': ['src/domain'],
  'src/config': ['src/config', 'src/domain'],
  'src/lib': ['src/lib', 'src/domain', 'src/config', 'src/content'],
  'src/services': ['src/services', 'src/lib', 'src/domain', 'src/config'],
  'src/scripts': ['src/scripts', 'src/lib', 'src/config'],
  'src/components/ui': ['src/components/ui', 'src/lib', 'src/styles'],
  'src/components/layout': [
    'src/components/layout',
    'src/components/ui',
    'src/scripts',
    'src/lib',
    'src/domain',
    'src/config',
  ],
  'src/components/sections': [
    'src/components/sections',
    'src/components/ui',
    'src/lib',
    'src/domain',
    'src/config',
  ],
  'src/layouts': [
    'src/layouts',
    'src/components',
    'src/lib',
    'src/domain',
    'src/config',
    'src/styles',
  ],
};

const isInside = (path, layer) => path === layer || path.startsWith(`${layer}/`);

function layerOf(path) {
  return Object.keys(LAYERS).find((layer) => isInside(path, layer));
}

export function isAllowed(fromPath, toPath) {
  const layer = layerOf(fromPath);
  if (fromPath.includes('.test.') || !layer || !toPath.startsWith('src/')) return true;
  return LAYERS[layer].some((allowed) => isInside(toPath, allowed));
}
