# Changelog

## 1.1.0 — 2026-11-03

- Added fit-within image size presets for square, portrait, story, landscape and A4 formats. Presets preserve the source aspect ratio and do not crop or upscale.
- Added target-size compression for JPG and WEBP. The browser selects the highest practical quality under the requested KB target, reducing dimensions only when quality adjustment is not enough.
- Added an explicit notice when a target file size cannot be reached.
- Reduced image compression batch concurrency to a safer adaptive maximum of two jobs, with one job on devices reporting 4 GB RAM or less.
- Improved acceptance of valid JPG/PNG/WEBP files when the browser supplies an empty MIME type.
- Updated project documentation. No account system, remote file storage, or file-upload backend was added.
