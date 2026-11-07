# Changelog

## 3.0.0 — 2026-11-07

- Added **Workflow Studio** with a new image pipeline for product imagery: optional Cloudflare AI background removal, square padding without cropping, fit-within resizing, JPG/WEBP/PNG output, adjustable quality and optional best-effort byte target.
- Added a reusable bounded job queue (cancel, retry and per-file status), a background Web Worker with browser fallback, Before/After preview, and dependency-free ZIP download with checksums.
- Added preset saving and defaults for e-commerce square photos, web images, transparent PNG, and aspect-ratio-preserving JPG.
- Expanded Notepad to multiple local notes: names, pinning, full-text search, local JSON backup/import and legacy note migration; notes remain on the user device.
- Added installable PWA support and offline caching of local app files. Workflow processing without AI and Notepad are designed to work offline after the app has loaded once. PDF features may still require externally hosted libraries or online access.
- Added a clear warning that DOCX→PDF and PPTX→PDF conversions reconstruct text only, not the original layout/images; the conversion engine itself is unchanged.
- Shared navigation and command palette now include Workflow Studio; improved mobile navigation and Thai/English labels on new surfaces (other languages use English fallback).
- Left the Cloudflare Worker API and existing conversion algorithms unchanged; **no API rate limiting, account system, D1 or R2 storage were added**.
- Added smoke tests for the job queue, cancel/retry, ZIP writer and PWA asset checks.

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
