export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export const formatAppVersion = (prefix = 'v') => `${prefix}${APP_VERSION}`;
