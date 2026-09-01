import mossyAvatarPngUrl from './mossy-avatar.png?url';

// Bundle the avatar so it resolves correctly in packaged `file://` builds.
// Using PNG instead of SVG to reduce bundle size (26MB SVG -> 2.6MB PNG)
export const mossyAvatarUrl = mossyAvatarPngUrl;
