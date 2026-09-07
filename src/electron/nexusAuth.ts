/**
 * Nexus Mods OAuth Service (PKCE)
 *
 * Implements the "public app" OAuth 2.0 + PKCE flow documented by Nexus Mods
 * (https://users.nexusmods.com/.well-known/openid-configuration) so Mossy can
 * let a user sign in with their own Nexus account and get a real, verified
 * identity/access token — without ever seeing or storing a Nexus password.
 *
 * IMPORTANT — this cannot work until Mossy is a REGISTERED Nexus application:
 * Nexus does not have a self-service "create OAuth app" page. Registration is
 * done by emailing support@nexusmods.com with a testing build that demonstrates
 * real API usage, an app name/description, and a logo — see NEXUS_OAUTH_SETUP.md
 * in the repo root for the exact request to send. Once approved, Nexus issues a
 * client_id; set it as MOSSY_NEXUS_CLIENT_ID (env) or paste it into CLIENT_ID
 * below. Until then, signIn() throws a clear, honest error instead of pretending
 * to work.
 *
 * Flow implemented:
 *   1. Generate a PKCE code_verifier + code_challenge (S256).
 *   2. Open the user's system browser to Nexus's /oauth/authorize URL.
 *   3. Run a short-lived local HTTP listener on 127.0.0.1 to catch the
 *      redirect (?code=...&state=...), validating state to prevent CSRF.
 *   4. Exchange the code (+ verifier) for tokens at /oauth/token.
 *   5. Verify the returned JWT's signature against Nexus's published public
 *      key (RS256) before trusting anything in it.
 *   6. Persist tokens OS-encrypted via Electron's safeStorage (same pattern
 *      already used for other secrets in main.ts), and transparently refresh
 *      the access token using the refresh token when it's expired.
 *
 * This module intentionally has NO npm dependencies beyond Node/Electron
 * built-ins (crypto, http, https) so it doesn't need an `npm install` step to
 * use — verification uses `crypto.verify()` directly instead of a JWT library.
 */

import { app, shell, safeStorage } from 'electron';
import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { URL, URLSearchParams } from 'url';

const NEXUS_AUTHORIZE_URL = 'https://users.nexusmods.com/oauth/authorize';
const NEXUS_TOKEN_URL = 'https://users.nexusmods.com/oauth/token';

// Nexus's published public key for verifying the JWT they issue. This is not
// a secret — it's how anyone can confirm a token really came from Nexus.
const NEXUS_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs/57oX8HW8xC+W/etH7J
PgoSTiGPKZa6Gq3/K/7GgrpJcZhPdr9MTGocb2uLzQBJW+u1XpSgyeKH4JCxxeHF
3zcUtb7SUg3KnxlR5QUmOnqBvbUuL4opUpfgWUGltASduYqZBJD2WTK8Hvwh9X1v
ACeqp1zgorZm3f0J2H15TDbzIp9ihCFuthJUFumdzvrt/WvimW2fiyqndTNQwe5h
XM8hj8cemdWQXCd99qnj7UQkpu+yNisVMHQCsAqXITe6Ehp6IY9eCd4DJKjDvyLc
3vbY8UL+bcVK5tYAKemZ56uw3q1YdcyqGlItyLi4j4EISdBQaCCqT7YZUhMYzhUd
1QIDAQAB
-----END PUBLIC KEY-----`;

// Fixed local callback port. Nexus needs this registered as the app's exact
// redirect_uri at approval time, so don't change it without re-registering.
const CALLBACK_PORT = 8089;
const REDIRECT_URI = `http://127.0.0.1:${CALLBACK_PORT}/callback`;
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000; // give the user 5 minutes to approve in-browser

// Set once Nexus approves the registration request (see NEXUS_OAUTH_SETUP.md).
// Left blank on purpose — signIn() fails loudly rather than silently no-op'ing.
const CLIENT_ID = process.env.MOSSY_NEXUS_CLIENT_ID || '';

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // ms epoch
}

export interface NexusIdentity {
  userId: number;
  username: string;
  membershipRoles: string[];
  premiumExpiry: number;
  tokenExpiresAt: number;
}

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

function tokensFilePath(): string {
  return path.join(app.getPath('userData'), 'nexus-auth.json');
}

/** Minimal RS256 JWT verification — no external library required. */
function verifyAndDecodeJwt(token: string): NexusIdentity {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Nexus returned a malformed token (not a 3-part JWT)');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const signature = base64urlDecode(signatureB64);
  const signedData = `${headerB64}.${payloadB64}`;
  const isValid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(signedData),
    NEXUS_PUBLIC_KEY,
    signature
  );
  if (!isValid) {
    throw new Error('Nexus token signature verification failed — refusing to trust it');
  }

  const payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8'));

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error('Nexus token is already expired');
  }

  return {
    userId: payload.user?.id,
    username: payload.user?.username,
    membershipRoles: payload.user?.membership_roles || [],
    premiumExpiry: payload.user?.premium_expiry || 0,
    tokenExpiresAt: payload.exp ? payload.exp * 1000 : 0
  };
}

/** POST application/x-www-form-urlencoded to Nexus's token endpoint. */
function postToken(body: URLSearchParams): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body.toString();
    const url = new URL(NEXUS_TOKEN_URL);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Nexus token endpoint returned HTTP ${res.statusCode}: ${raw}`));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`Nexus token endpoint returned non-JSON response: ${raw}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export class NexusAuthService {
  private tokens: StoredTokens | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens() {
    try {
      const file = tokensFilePath();
      if (!fs.existsSync(file)) return;
      const raw = fs.readFileSync(file);
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[NexusAuth] safeStorage unavailable; cannot decrypt stored tokens this session');
        return;
      }
      this.tokens = JSON.parse(safeStorage.decryptString(raw));
    } catch (e) {
      console.warn('[NexusAuth] Failed to load stored tokens:', e);
    }
  }

  private saveTokens() {
    if (!this.tokens) return;
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[NexusAuth] safeStorage unavailable; not persisting tokens to disk');
        return;
      }
      fs.writeFileSync(tokensFilePath(), safeStorage.encryptString(JSON.stringify(this.tokens)));
    } catch (e) {
      console.warn('[NexusAuth] Failed to save tokens:', e);
    }
  }

  isSignedIn(): boolean {
    return !!this.tokens;
  }

  signOut() {
    this.tokens = null;
    try {
      const file = tokensFilePath();
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) {
      console.warn('[NexusAuth] Failed to clear stored tokens:', e);
    }
  }

  /**
   * Runs the browser-based PKCE sign-in flow end to end and returns the
   * verified identity. Throws (rather than silently failing) if Mossy isn't
   * registered with Nexus yet, if the user doesn't approve in time, or if
   * anything about the returned token doesn't check out.
   */
  async signIn(): Promise<NexusIdentity> {
    if (!CLIENT_ID) {
      throw new Error(
        'Nexus sign-in isn\'t set up yet: Mossy has not been registered as a Nexus application ' +
        '(no client_id configured). See NEXUS_OAUTH_SETUP.md for the registration request to send ' +
        'to support@nexusmods.com — once Nexus approves it and issues a client_id, set the ' +
        'MOSSY_NEXUS_CLIENT_ID environment variable (or fill in CLIENT_ID in nexusAuth.ts).'
      );
    }

    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
    const state = crypto.randomUUID();

    const code = await this.awaitAuthorizationCode(codeChallenge, state);

    const tokenResponse = await postToken(
      new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code,
        code_verifier: codeVerifier
      })
    );

    this.tokens = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: Date.now() + tokenResponse.expires_in * 1000
    };
    this.saveTokens();

    return verifyAndDecodeJwt(this.tokens.access_token);
  }

  /**
   * Opens the system browser to Nexus's consent screen and runs a short-lived
   * local HTTP server to catch the redirect. Resolves with the authorization
   * code, or rejects on a state mismatch, an OAuth error, or a timeout.
   */
  private awaitAuthorizationCode(codeChallenge: string, expectedState: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        server.close();
        fn();
      };

      const server = http.createServer((req, res) => {
        if (!req.url) return;
        const url = new URL(req.url, REDIRECT_URI);
        if (url.pathname !== '/callback') {
          res.writeHead(404).end();
          return;
        }

        const error = url.searchParams.get('error');
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        if (error || !code || state !== expectedState) {
          res.end('<html><body>Sign-in failed or was cancelled. You can close this tab and return to Mossy.</body></html>');
          finish(() =>
            reject(
              new Error(
                error
                  ? `Nexus returned an OAuth error: ${error}`
                  : state !== expectedState
                  ? 'Nexus OAuth state mismatch — possible CSRF, aborting sign-in'
                  : 'Nexus redirect was missing an authorization code'
              )
            )
          );
          return;
        }

        res.end('<html><body>Signed in! You can close this tab and return to Mossy.</body></html>');
        finish(() => resolve(code));
      });

      const timer = setTimeout(() => {
        finish(() => reject(new Error('Nexus sign-in timed out waiting for browser approval')));
      }, CALLBACK_TIMEOUT_MS);

      server.on('error', (e) => finish(() => reject(e)));

      server.listen(CALLBACK_PORT, '127.0.0.1', () => {
        const params = new URLSearchParams({
          client_id: CLIENT_ID,
          response_type: 'code',
          scope: '',
          redirect_uri: REDIRECT_URI,
          state: expectedState,
          code_challenge_method: 'S256',
          code_challenge: codeChallenge
        });
        shell.openExternal(`${NEXUS_AUTHORIZE_URL}?${params.toString()}`);
      });
    });
  }

  /**
   * Returns a valid access token, refreshing it first if it has expired.
   * Returns null if the user isn't signed in, or if the refresh token itself
   * has been revoked (the caller should treat that as "signed out").
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.tokens) return null;

    if (Date.now() < this.tokens.expires_at) {
      return this.tokens.access_token;
    }

    try {
      const refreshed = await postToken(
        new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refresh_token
        })
      );
      this.tokens = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? this.tokens.refresh_token,
        expires_at: Date.now() + refreshed.expires_in * 1000
      };
      this.saveTokens();
      return this.tokens.access_token;
    } catch (e) {
      console.warn('[NexusAuth] Refresh failed — treating as signed out:', e);
      this.signOut();
      return null;
    }
  }

  /** Returns the verified identity for the current token, refreshing first if needed. */
  async getIdentity(): Promise<NexusIdentity | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    try {
      return verifyAndDecodeJwt(token);
    } catch (e) {
      console.warn('[NexusAuth] Stored token failed verification:', e);
      this.signOut();
      return null;
    }
  }
}

export const nexusAuthService = new NexusAuthService();
