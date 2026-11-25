# GitHub Pages — Shadowkeep D&D 2024 rebuild

1. Keep `index.html`, `styles.css`, and `theme.css` at the publishing root.
2. Keep `src/` and `data/` as folders with their original names. Do not flatten module files into the root.
3. In **Settings → Pages**, select **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. After publishing, open the site and hard-refresh. Browser storage is local to each device/browser; export a backup before clearing site data.

Verify that these paths load rather than returning 404:

- `/DnD-Hosting/index.html`
- `/DnD-Hosting/styles.css`
- `/DnD-Hosting/theme.css`
- `/DnD-Hosting/src/main.js`
- `/DnD-Hosting/data/srd-5.2-2024.json`

