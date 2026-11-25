# Shadowkeep — D&D 5e (2024) campaign table

Shadowkeep is a private, browser-based campaign table prototype built around the **2024 fifth-edition rules workflow**. This rebuild keeps Shadowkeep’s campaign-table identity while using one explicit D&D 2024 model. It removes the custom elemental system and the mixed, flattened application versions.

## Included in this rebuild

- **Guided character creation:** six readable steps for class, background, species, ability scores, training and equipment, then character details and review. Class and Origin options include explanatory descriptions and expandable rules text. The builder supports Standard Array, 27-point Point Buy, and 4d6 drop-lowest rolls. A character is not created until required selections are complete.
- **Character record:** ability scores and modifiers, Hit Points, Armor Class, speed, initiative, proficiency bonus, saves, skills, background, species traits, feats, inventory, starting gold, spells, notes and story details. Common derived values are calculated from the selected options and equipped gear.
- **Readable sheet:** Overview, Actions, Inventory, Spells, Features & Traits, and Notes are separate tabs. Rules descriptions are expanded in sections rather than being flattened into one line.
- **Map and initiative:** upload a battle map, show a square grid, place and drag character/monster tokens, link those tokens to combatants, roll initiative by side, sort into one shared turn order, track HP, and advance turns/rounds.
- **Campaign homebrew:** create, edit, and delete classes, species, backgrounds, subclasses, feats, spells, items, and monsters. Editors expose core structured fields and long-form descriptions. Custom records are stored with the campaign and merge into the corresponding content catalog.
- **Campaign tools:** local campaign journal, dice roller, export and import backup.

## Visual system

The interface separates layout (`styles.css`) from the **Bog & Iron** skin (`theme.css`). The skin uses peat-black surfaces, wet-stone panels, old-bone text, weathered brass controls, restrained dried-blood accents, and low-contrast scuff/hatch textures. It avoids bright gold gradients and glossy card treatments. The texture layer is decorative and sits behind interactive content.

## Rules content and licensing

The bundled data is **SRD 5.2 (2024)**, not the complete paid 2024 Player's Handbook or the complete D&D Beyond catalog. It contains:

| Rules data | Entries |
|---|---:|
| Classes / subclasses | 12 / 12 |
| Species | 9 |
| Backgrounds | 4 |
| Feats | 17 |
| Spells | 339 |
| Equipment items | 425 |
| Monsters | 341 |

The app does not bundle D&D Beyond source code, artwork, private APIs, or paid content. See `THIRD_PARTY_NOTICES.md` for SRD attribution and license notes. Homebrew and campaign-specific records are separate from SRD records.

## Run locally

The browser app is static and has no build step or dependency installation. Serve the project directory over HTTP (ES modules and the bundled SRD JSON are loaded by the browser):

```bash
npm run serve
```

Then open `http://localhost:4173/`.

## GitHub Pages

This is a **root-published static site**. Keep `index.html`, `styles.css`, and `theme.css` at the root; keep all application modules inside `src/` and rules data inside `data/`. Do not leave flattened copies of the same modules at the repository root. In the repository's **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`. Do not flatten the `src/` folder or upload only the HTML shell.

## Persistence and current boundaries

- Campaigns are saved in the current browser's `localStorage`. Use Export Backup to move a campaign to another browser. This build does **not** provide hosted accounts, real-time multiplayer, cloud sync, or player/DM permission enforcement.
- The character wizard creates **level 1 characters**. It calculates key level-1 values and records the level-1 class, species, background, feat, skill, language, equipment, and spell choices. Guided level advancement, multiclassing, every class feature choice, and the full progression tables still need implementation; the included homebrew class editor supports core level-1 fields and descriptive feature entries, not a complete programmable class engine.
- Combat is an initiative and token-management workspace. Tokens can move on an uploaded image and grid, and HP/turns are linked. It does not yet implement line of sight, fog of war, measuring/templates, dynamic lighting, automated action economy, condition automation, or full rules resolution against targets.
- Attack and spell controls can roll common dice and show available SRD text. They do not fully resolve every weapon mastery, class feature, spell targeting, save, concentration, condition, or monster action. Complex cases still require DM adjudication.
- Rest controls are intentionally basic. The app is a private test build, not a certified rules engine or a production-hardened online service.

