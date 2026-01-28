function normalizeBaseUrl(baseUrl: string | undefined): string {
	const raw = (baseUrl || './').trim();
	if (!raw) return './';
	return raw.endsWith('/') ? raw : `${raw}/`;
}

// IMPORTANT:
// - In dev, Vite serves public assets at `/...`
// - In production Electron builds loaded via `file://`, absolute `/...` breaks.
// Using BASE_URL keeps this working for both (base is `./` in prod).
export const mossyAvatarUrl = `${normalizeBaseUrl((import.meta as any)?.env?.BASE_URL)}mossy-avatar.svg`;
