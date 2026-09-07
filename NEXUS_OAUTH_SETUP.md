# Getting Mossy a Nexus OAuth client_id

Nexus Mods doesn't have a self-service page to create an OAuth application.
Registration is done manually by their team, via email. This is a one-time
step only Billy can do (it has to come from the account/identity that owns
the Mossy Nexus Mods page), and it should happen **before** any of the OAuth
code in `src/electron/nexusAuth.ts` can actually be used.

## What to send

Email **support@nexusmods.com** and include:

1. **App name**: Mossy
2. **A one-paragraph description** of what it does and why it needs OAuth.
   Suggested text:

   > Mossy is an open-source AI tutor for the Fallout 4 modding community,
   > distributed on Nexus Mods and GitHub. We'd like to register it as an
   > OAuth application so it can let users optionally sign in with their own
   > Nexus account (read-only identity — we're not requesting any scopes
   > that write to a user's account). Redirect URI:
   > `http://127.0.0.1:8089/callback`. This is a public desktop app using
   > PKCE, not a confidential client — no client secret is needed on our end.
3. **A high-resolution logo** suitable for a dark background (Nexus asks for
   this specifically).
4. **A testing build** that demonstrates the intended usage — the current
   packaged Mossy build works for this, since the OAuth code path is real
   and already wired up (`src/electron/nexusAuth.ts`, IPC channels
   `nexus-auth:sign-in` / `nexus-auth:sign-out` / `nexus-auth:get-identity`),
   it's just waiting on a `client_id` to actually call out to Nexus.
5. (Optional but Nexus says it speeds things up) A link to the source code
   for the OAuth handling — the GitHub repo, pointed at `nexusAuth.ts`, is
   enough.

## Once Nexus approves and sends a client_id

Set it as an environment variable before packaging/running Mossy:

```
MOSSY_NEXUS_CLIENT_ID=the_id_nexus_gave_you
```

(or paste it directly into the `CLIENT_ID` constant near the top of
`src/electron/nexusAuth.ts` if an env var isn't convenient for the build
pipeline). No other code changes are needed — sign-in, token refresh, and
JWT verification are already implemented and wired to the IPC channels
above; only the UI button to trigger `window.electron.api.nexusSignIn()`
still needs to be added wherever it should live (e.g. Settings).

## Why this exists right now

Billy asked to get this in place as part of getting Mossy back up on Nexus.
The OAuth plumbing (PKCE flow, local callback listener, token exchange,
RS256 JWT verification against Nexus's published public key, OS-encrypted
token storage via Electron's `safeStorage`, transparent refresh) is fully
built and type-checked. What's still open, in order:

1. Send the registration email above and get a real `client_id` back.
2. Decide what the signed-in identity is actually used FOR in the app —
   e.g. showing premium status, or checking for updates through Nexus's own
   API instead of GitHub's releases API (which is what `autoUpdater.ts`
   currently uses). That decision will determine whether any UI/feature
   work beyond a basic sign-in button is needed.
3. Add a sign-in/sign-out control to the UI once (1) and (2) are settled.
