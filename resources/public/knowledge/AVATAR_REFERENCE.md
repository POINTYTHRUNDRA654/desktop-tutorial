# Mossy Avatar Reference (User Provided)

The user provided a reference image in chat for what Mossy’s face/avatar should look like.

## Visual description
- Close-up face in a glossy / liquid style.
- Blue/cyan skin tones with reflective highlights.
- Orange/red fluid + spherical droplets/orbs around the face.
- Centered eyes and nose; portrait orientation.

## Intended use in app
- This should become the default Mossy avatar in the renderer (packaged `file://` builds), replacing the current placeholder SVG/data-URI avatar.

## Implementation plan (tomorrow)
1. Add the reference image to the repo as a bundled asset:
   - Suggested path: `src/renderer/src/assets/mossy-face.jpg` (or `.png`).
2. Update `src/renderer/src/assets/avatar.ts` to import the new image with `?url` and export it as `mossyAvatarUrl`.
3. Confirm the built output contains the asset and `MossyFaceAvatar` renders it in packaged builds.

## Notes
- If the image is only available in chat, save it locally and drop it into the suggested path above, then we can wire it up.
