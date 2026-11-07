# Workshop Utility BY KITTO

A static, browser-based utility website for image editing, PDF workflows, general file conversion, a multi-note local notebook, and a batch image Workflow Studio.

**Live site:** <https://utilitytools.kitto-for-work.workers.dev/>

## Project structure

```text
.
├── public/                  # Website files served by Cloudflare
│   ├── index.html           # Main image/PDF tools
│   ├── file-converter.html  # General file converter
│   ├── notepad.html         # Online notepad
│   ├── css/
│   │   ├── style.css        # Main workspace CSS entry point
│   │   ├── file-converter.css
│   │   ├── notepad.css
│   │   ├── ui-system.css    # Shared base design system
│   │   ├── kitto-studio.css # Shared cat-themed UI, animations and responsive layout
│   │   ├── kitto-next.css # Workflow, notebook and v3 component styles
│   │   └── modules/         # Detailed page/component styles
│   ├── js/
│   │   ├── app.js           # Main tool/category navigation
│   │   ├── page-shell.js    # Shared navigation, shortcut finder, hero and language wiring
│   │   ├── runtime-setup.js # PDF.js and canvas setup
│   │   ├── i18n.js          # Translation runtime/catalog
│   │   ├── kitto-queue.js, workflow*.js, zip-store.js # Batch image pipeline
│   │   └── tool-*.js        # Individual image/PDF tools
│   └── assets/illustrations/kitto-cat.svg # Lightweight mascot artwork
│   └── assets/icons/        # Optimized favicon assets
├── scripts/check-project.mjs
├── ARCHITECTURE.md          # Module ownership and change guidelines
├── source-assets/           # Original, high-resolution design assets
├── .github/workflows/       # Automated static checks
├── package.json
└── wrangler.jsonc           # Cloudflare Workers Static Assets config
```

## Features

- Convert, resize, crop, rotate and compress images, including fit-within size presets (square, portrait, story, landscape and A4).
- Set a target output size for JPG/WEBP compression; the browser adjusts quality first and reduces dimensions only when needed.
- Remove image backgrounds using the Cloudflare Images segmentation service (the selected image is sent to the Worker for processing).
- Convert images to PDF and PDF pages to images.
- Reorder, rotate, split, merge and watermark PDF pages, and add page numbers.
- Convert supported file formats using the file-converter page.
- Save **multiple notes** locally in the browser with autosave, editing history, title, pinning, search and JSON backup/import. The original saved note is migrated into the notebook on first visit.
- Use **Workflow Studio** (`/workflow.html`) to process multiple JPG/PNG/WEBP images using optional AI background removal, padding/resize, file conversion and compression, then inspect Before/After and export ZIP.
- Use Workflow Studio without AI and Notepad **offline** after visiting the website online at least once. The site does not show an app install button and does not ship an install manifest; PDF and Office-related tools may still need external dependencies or network access.
- Most batch image/PDF workflows process locally. Background removal sends the chosen image to the Cloudflare Worker and returns the output without storing it permanently.
- Thai, English, German, Japanese, Korean and Chinese UI translations where provided by the translation catalog.
- A shared responsive cat-themed UI across all three pages, with a desktop tool sidebar, animated mascot, polished drag/drop states and converter cards.
- Global tool finder: **Ctrl + K** (or **Cmd + K** on Mac), **/** outside text inputs, arrow keys to choose, Enter to open, Escape to close.
- Deep links to the existing Workspace tools: e.g. `/index.html?tool=pdf-merge` or `/index.html?tool=img-compress`.
- Animations automatically minimize when the browser requests reduced motion.

## Run locally

Requirements: a supported Node.js/npm version. The pinned Wrangler CLI is installed locally for Cloudflare preview and deployment. Python 3 (or another static HTTP server) is optional for a quick static preview.

```bash
npm install
npm run check
npm run test:smoke
npm run dev
```

Alternatively, run `npm run preview` (on systems where the Python command is named `python3`, change `python` to `python3` in that script) and open <http://localhost:8787/> for a basic static-server preview. `npm run dev` uses Wrangler and is the closer match for Cloudflare Workers Static Assets.

Then open <http://localhost:8787/>. Use a local HTTP server rather than opening HTML files with `file://`; browser workers, module loading and file APIs behave more consistently over HTTP/HTTPS.

## Deploy to Cloudflare Workers (recommended for the existing `workers.dev` URL)

This repository includes `wrangler.jsonc` and serves the contents of `public/` as static assets.

1. Push this repository to GitHub and connect it to the existing Worker through Cloudflare Workers Builds.
2. Keep `wrangler.jsonc` at the repository root. Its `name` is currently `utilitytools` to match the existing `utilitytools.kitto-for-work.workers.dev` URL. If the actual Worker script has a different name, change the value to the exact Worker name before deploying.
3. Set the production branch to `main` (or whichever branch you use).
4. Set the optional **Build command** to `npm run check` so each deploy validates JavaScript syntax and local file references first. Keep the **Deploy command** as `npx wrangler deploy`.
5. Cloudflare deploys the Worker API and static assets from `public/` together using `wrangler.jsonc`.
6. Confirm the `IMAGES` binding is present in the deployed Worker, then test `/api/health`, the home page, and the background-removal tool.

Official guide: <https://developers.cloudflare.com/workers/static-assets/>.

## Alternative: Cloudflare Pages

If you are creating a **new Pages project** instead of updating the existing Worker, connect the GitHub repository and configure:

- **Build command:** `npm run check` (or leave blank if you do not need the checker during Pages builds).
- **Build output directory:** `public`.
- **Production branch:** `main`.

Pages usually gives the project a `*.pages.dev` address. To keep the current `workers.dev` hostname, deploy through Workers rather than creating a separate Pages project.

Official guide: <https://developers.cloudflare.com/pages/get-started/git-integration/>.

## Before pushing changes

Run `npm run check`. The checker validates that:

- all JavaScript files pass Node's syntax parser;
- local HTML/CSS asset references and CSS imports resolve to existing files;
- JavaScript files have no syntax errors;
- HTML files have no duplicate element IDs;
- the required entry pages exist.

GitHub Actions runs the same check on pushes and pull requests.

## Privacy and third-party dependencies

Most image and PDF tools process files in the browser. Background removal is the exception: the selected image is sent to this site's Cloudflare Worker at `/api/remove-background`, then processed by Cloudflare Images (BiRefNet) and returned as a transparent PNG. The Worker processes the bytes in memory and does not write originals or results to R2 or Cloudflare Images storage. Notepad content is stored in the browser's local storage for the current site origin.

## Notes for maintenance

- See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for where each type of code belongs.
- Use `public/css/kitto-studio.css` for shared 2.0 UI refinements, motion and responsive changes (it is loaded after `ui-system.css`). Use `public/css/ui-system.css` for the previous shared base styles. Page-specific component styles live under `public/css/modules/`; the shorter CSS files at `public/css/` are entry points.
- Keep cross-page navigation and language-selector wiring in `public/js/page-shell.js`; keep shared PDF.js/canvas setup in `public/js/runtime-setup.js`.
- Keep `public/` as the static publish directory so repository files such as scripts and documentation are not published as site content.
- Keep the PDF worker and its client in the same `public/js/` directory; the client resolves the worker URL relative to its own script URL.
- Run `npm run check` after moving, renaming or adding any HTML, CSS, JavaScript or icon file.
- The original high-resolution icon is preserved in `source-assets/`; the production icons in `public/assets/icons/` are resized for faster loading.

## Cloudflare AI background removal

Background removal runs on Cloudflare Images using the `segment: "foreground"` transformation (BiRefNet). The browser uploads one image at a time to `POST /api/remove-background`; the Worker returns a transparent PNG. Images are processed in memory and are not written to R2 or Cloudflare Images storage.

- `src/index.js` is the Worker entry point and `IMAGES` is the Cloudflare Images binding in `wrangler.jsonc`.
- `/api/*` is routed through the Worker using `assets.run_worker_first`; other website files remain static assets.
- Accepted formats: JPEG, PNG, WebP, and AVIF. Maximum upload size: 20 MB per image.
- Cloudflare Images Free includes 5,000 unique transformations per calendar month. New transformations stop after the free allowance is exhausted.
- Deploy with Wrangler or the existing Cloudflare Workers Builds connection.

## Version 3 deployment and limitations

- **Existing Workers deployment**: keep `public/` as the assets directory and `src/index.js` as the Worker entry. New routes are static assets; no extra Cloudflare bindings, D1 database or R2 bucket are required. API rate limiting was deliberately not added.
- **Workflow Studio**: select one or more images, choose settings or a preset, and click Start. Processing uses up to 2 browser workers on desktop (1 for small screens or low-memory devices). Image data is not saved to a server unless AI background removal is enabled. The browser may reject very large pixel dimensions; output byte targets for JPEG/WEBP are best-effort, and PNG is lossless. Single results download individually; multiple results download as ZIP without using a third-party ZIP CDN.
- **Notepad migration**: the original value in `online-notepad-content-v1` is imported into `kitto-notebook-v2` the first time it is used. This is local per-browser storage, **not sync across devices**. Export JSON before clearing site storage. Import merges notes; it does not silently overwrite existing notes.
- **Offline**: the Service Worker caches same-origin app code, not user files, the background-removal API or third-party CDNs. Visit the website online once to populate the offline cache; this supports Workflow Studio (without AI) and Notepad. There is no app-install UI or web app manifest. Browsers may still offer their own generic Add to Home Screen or Create Shortcut option, which the website cannot disable.
- **Office-to-PDF conversion fidelity**: DOCX→PDF and PPTX→PDF currently extract text and generate a new PDF; styles, tables, embedded images, fonts and slide geometry are not preserved. The UI now makes this limitation explicit; accurate Office rendering needs a dedicated rendering engine or conversion backend.
- **Testing**: `npm run check` validates asset references, IDs and syntax; `npm run test:smoke` checks bounded queue execution, cancellation/retry, ZIP signatures and the offline shell. Cloudflare Images background-removal itself must be tested after deploying with an `IMAGES` binding, and any external PDF conversion dependencies require internet.
