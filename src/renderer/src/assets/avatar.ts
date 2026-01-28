import mossyAvatarPngUrl from './mossy-avatar.png?url';
import mossyAvatarSvgUrl from './mossy-avatar.svg?url';

// Bundle the avatar so it resolves correctly in packaged `file://` builds.
// Prefer PNG (more compatible with img rendering/filters), with SVG as fallback.
export const mossyAvatarUrl = mossyAvatarPngUrl || mossyAvatarSvgUrl;
