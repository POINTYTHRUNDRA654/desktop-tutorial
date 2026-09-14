# Response to File Review — API Key Usage Removed

Thank you for the feedback on our last submission. We've identified and removed the flagged usage.

## What was flagged

Your review noted that the personal API key usage needed to be removed entirely before the file could be verified.

## What we found

The app had a legacy Nexus Mods integration (`modBrowser.ts`) that authenticated against the Nexus API using a user-supplied personal API key, sent as an `apikey` header on requests to `api.nexusmods.com`. This predates our current OAuth work and was not compliant with the Nexus API Acceptable Use Policy for publicly distributed applications.

Note: this was never a hardcoded key of ours — it required the end user to supply their own personal API key — but we understand and agree that a personal-API-key auth flow isn't appropriate for a publicly distributed app regardless, and that a registered SSO/OAuth flow is the correct approach per your policy.

## What we changed

Rather than just disabling the feature at runtime, we physically removed it from the release package:

- We added a dedicated build channel for Nexus-distributed releases, separate from our normal desktop build.
- As part of that build, a build step deletes the compiled output of the legacy Nexus API key module before the app is packaged, so the code does not exist anywhere in the shipped package — not just disabled behind a flag, actually absent from the files.
- Every code path that referenced this module (mod search, download, ratings, reviews, endorsements, trending, etc.) now fails cleanly with an explicit "not available in this build" message in the release build, so there's no broken or dangling functionality.

## Impact on the app

This only affects a secondary Mod Browser / Nexus trending-data feature. The app's core function — an AI tutor that teaches Fallout 4 modding workflows — is unaffected. The one visible behavior change is that a "what's trending in modding" style question now falls back to general web search instead of live Nexus trending data.

## Going forward

We're separately in the process of registering with Nexus for a proper OAuth/SSO integration, which we intend to use once approved, in place of any personal-API-key flow, for any future Nexus-connected features.

We're happy to walk through the relevant code or build process with your team if that's useful. Please let us know if there's anything further needed to complete verification.

Thank you,
Billy
Mossy Industries
