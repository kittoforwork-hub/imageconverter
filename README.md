# Workshop Utility BY KITTO

A static, browser-based utility website for image editing, PDF workflows, general file conversion, and a local online notepad.

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
│   │   ├── ui-system.css    # Shared design system and responsive UI
│   │   └── modules/         # Detailed page/component styles
│   ├── js/
│   │   ├── app.js           # Main tool/category navigation
│   │   ├── page-shell.js    # Shared language/navigation wiring
│   │   ├── runtime-setup.js # PDF.js and canvas setup
│   │   ├── i18n.js          # Translation runtime/catalog
│   │   └── tool-*.js        # Individual image/PDF tools
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
- Remove image backgrounds in the browser with a downloaded AI model.
- Convert images to PDF and PDF pages to images.
- Reorder, rotate, split, merge and watermark PDF pages, and add page numbers.
- Convert supported file formats using the file-converter page.
- Save notes locally in the browser with autosave and editing history.
- Batch image/PDF workflows remain local to the browser; there is no account, remote file storage or file-upload backend.
- Thai, English, German, Japanese, Korean and Chinese UI translations where provided by the translation catalog.
- A shared responsive UI system that keeps navigation, forms, cards and action buttons visually consistent across all three pages.

## Run locally

Requirements: a supported Node.js/npm version. The pinned Wrangler CLI is installed locally for Cloudflare preview and deployment. Python 3 (or another static HTTP server) is optional for a quick static preview.

```bash
npm install
npm run check
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
- Use `public/css/ui-system.css` for changes that should look consistent across the home, converter and notepad pages. Page-specific component styles live under `public/css/modules/`; the shorter CSS files at `public/css/` are entry points.
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
