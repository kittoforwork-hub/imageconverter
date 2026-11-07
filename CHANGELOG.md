# Changelog

## 2.0.0 — 2026-11-07

- Redesigned Workspace, File Converter and Notepad with one pastel cat-themed UI, a shared sticky header and improved mobile layouts.
- Added animated vector cat artwork, gentle floating details, responsive hover/drag interactions and reduced-motion handling.
- Added cross-page quick search (Ctrl/Cmd+K or /) and deep links into Workspace tools.
- Converted Workspace tools to a more discoverable sidebar on desktop and a horizontal tool list on mobile.
- Left the existing conversion, PDF, background-removal, notepad storage and Cloudflare Worker implementation in place.
- Corrected overly broad privacy claims: background removal sends the chosen image to Cloudflare for processing, unlike most browser-local tools.

## 1.1.0 — 2026-11-03

- Added fit-within image size presets for square, portrait, story, landscape and A4 formats. Presets preserve the source aspect ratio and do not crop or upscale.
- Added target-size compression for JPG and WEBP. The browser selects the highest practical quality under the requested KB target, reducing dimensions only when quality adjustment is not enough.
- Added an explicit notice when a target file size cannot be reached.
- Reduced image compression batch concurrency to a safer adaptive maximum of two jobs, with one job on devices reporting 4 GB RAM or less.
- Improved acceptance of valid JPG/PNG/WEBP files when the browser supplies an empty MIME type.
- Updated project documentation. No account system, remote file storage, or file-upload backend was added.
