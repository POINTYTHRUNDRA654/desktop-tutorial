// Primary/default avatar URL.
//
// This MUST be the JPG per project expectations. Put the file at:
//   `public/mossy-avatar.jpg`
// so it is served at runtime from `/mossy-avatar.jpg` in both Vite dev and
// packaged Electron builds.
export const mossyAvatarJpgUrl = 'mossy-avatar.jpg';
export const mossyAvatarUrl = mossyAvatarJpgUrl;

// Fallback SVG (kept for resilience if the JPG is missing or fails).
// This SVG should render the JPG internally (see `public/mossy-avatar.svg`).
export const mossyAvatarFallbackUrl = 'mossy-avatar.svg';

// Back-compat alias.
export const mossyAvatarPng = mossyAvatarUrl;
