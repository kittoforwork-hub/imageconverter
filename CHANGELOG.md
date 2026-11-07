# Changelog

## 4.0.0 — 2026-11-07

- Added shared local-only Settings (job concurrency, default Workflow quality, ZIP/separate download policy, animation reduction, setting recovery). No account, D1, R2, new API or install prompt.
- Added Browser Diagnostics inside Settings (local storage, online status, Web Workers, OffscreenCanvas, offline cache), copyable diagnostic report and a safe KITTO-only cache refresh action that does not delete notes.
- Added Workflow output-name templates `{name}`, `{n}`, `{date}`, customizable starting number and digit padding; duplicates are automatically disambiguated and unsafe characters are sanitized.
- Added Workflow setting Undo/Redo (30 snapshots) and optional recovery of settings, not uploaded files; added per-image **Crop tool** Undo/Redo for aspect ratio, selection rectangle and output format.
- Added optional AI post-processing alpha trim/edge softening with a preview background switch (checkerboard, white, dark). Disabled by default; effects are local after the existing Cloudflare background-removal call.
- Added persistent bounded image-worker pool, throttled queue redraw, user-selected concurrency, canvas codec verification and original crop-state snapshots, retaining the existing fallback for browsers without OffscreenCanvas.
- Updated browser cache version with network-first JavaScript/CSS, preserving offline fallback without PWA install controls.
- Added deterministic regression tests for safe filenames, alpha adjustment, preference validation, crop edit history presence, and offline update checks. Existing v3 queue, ZIP and cancellation tests remain.
- This release is a stability/UX improvement; it does **not** add a high-fidelity Office→PDF engine or claim all browser/device combinations have been validated. The existing limited DOCX/PPTX→PDF conversion warnings remain.


## 3.0.1 — 2026-11-07

- Removed the website's **Install App** button, app-install event handling and Web App Manifest.
- Kept offline caching for browser-based Workflow and Notepad use (no AI/API calls offline).
- Removed now-unused install icons and updated smoke tests. Existing installed copies may need to be uninstalled manually using the browser or OS.


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
