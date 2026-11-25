# D&D Unlimited — static deployment

This version is a browser-local VTT. Publish the contents of this folder from the repository root (or the `/docs` folder only if the entire project is placed there). Keep the relative paths and folder structure intact.

## Required files

- `index.html`
- `styles.css` and `theme.css`
- `src/` (all application modules)
- `data/srd-5.2-2024.json`

For GitHub Pages, select **Deploy from a branch**, choose the publishing branch and `/(root)`. Do not upload only `index.html`, flatten the `src/` directory, or rename the `data/` directory.

After publishing, open the deployed URL and hard-refresh. Confirm that the page title reads **D&D Unlimited**, that the dashboard loads, and that the Rules & Homebrew filters display as buttons. If the app cannot load its rules data, check that the deployed `data/srd-5.2-2024.json` path returns successfully.

Campaign data is stored in the current browser. Use **Campaign settings → Export campaign** before clearing browser data or moving to another device. This build does not provide hosted accounts, real-time multiplayer, or server-enforced player/DM permissions.
