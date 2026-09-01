export const getPublicAssetUrl = (assetPath: string): string => {
  const rawBase = import.meta.env.BASE_URL || './';
  const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const normalizedPath = assetPath.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`;
};
