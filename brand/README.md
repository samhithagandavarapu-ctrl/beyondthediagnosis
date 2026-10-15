# Voiced brand

- `Voiced-Brand-Kit.pdf`: the full brand kit (logo, color, type, signature details, voice).
- `logos/`: ready-to-use logo files.
  - `Voiced-Logo.pdf`: mark + navy wordmark, transparent background. Use on white, Mist, Butter, Sky or Coral.
  - `Voiced-Logo-Reversed-on-Navy.pdf`: mark + light wordmark on a navy background.
  - `Voiced-Logo-Reversed-Transparent.pdf`: mark + light wordmark, transparent. Use on navy or dark photos.
  - `Voiced-Logo-Stacked.pdf`: mark above the wordmark, transparent. For square spaces.
  - `Voiced-Mark.pdf` / `Voiced-Mark.svg`: the V mark alone, transparent.
  - `Voiced-Mark-on-Navy.pdf`: the mark on a navy square (avatars, app icons).
- `source/`: the HTML and scripts that produce the PDFs.

To regenerate after a change, from this folder: `npm i -D playwright` (once), then
`node source/render-brand-kit.mjs` and `node source/render-logos.mjs`. Both need internet
access to load Funnel Display and Funnel Sans from Google Fonts.
