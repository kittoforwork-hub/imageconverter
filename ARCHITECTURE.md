# Project architecture

## Public site

- `public/index.html` — image and PDF workspace shell.
- `public/file-converter.html` — format-converter catalog and conversion dialog.
- `public/notepad.html` — local notepad.
- `public/css/style.css`, `file-converter.css`, `notepad.css` — small stylesheet entry points.
- `public/css/modules/` — page/component stylesheet modules that contain detailed selectors for the existing tools.
- `public/css/ui-system.css` — shared design tokens, layout refinements, responsive rules, and component styling shared across pages.
- `public/js/i18n.js` — language catalog and translation runtime.
- `public/js/utils.js` — shared helpers.
- `public/js/app.js` — category and tool-panel navigation.
- `public/js/runtime-setup.js` — PDF.js worker URL and shared canvas factory.
- `public/js/page-shell.js` — shared language selector and page navigation.
- `public/js/tool-image-*.js` — image tools.
- `public/js/tool-pdf-*.js` and `tool-images-to-pdf.js` — PDF tools.
- `public/js/pdf-worker-client.js` and `pdf-worker.js` — background PDF processing.
- `public/js/file-converter.js` — converter catalog and conversion workflows.
- `public/js/notepad.js` — notepad behavior and autosave.

## Rules for future changes

1. Keep tool-specific processing in the matching `tool-*.js` module; avoid adding processing code to page HTML.
2. Put cross-page visual changes in `css/ui-system.css`. Put tool-specific visual details in the stylesheet module for that tool/page.
3. Keep inline JavaScript out of HTML. Add shared page wiring to `js/page-shell.js`; add third-party runtime setup to `js/runtime-setup.js`.
4. Keep all browser-served files inside `public/`. `wrangler.jsonc` deploys `public/` as Cloudflare Workers Static Assets.
5. Run `npm run check` before pushing changes. This validates JavaScript syntax, required pages, duplicate IDs, and local file references.
