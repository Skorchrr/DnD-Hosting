# D&D Unlimited — Virtual Tabletop

D&D Unlimited is a dark-fantasy, browser-based tabletop for running a D&D 2024 campaign. This build prioritizes a usable campaign table over a separate universal rules framework.

## What is included

- **Campaign dashboard:** campaign identity, party overview, recent dice rolls, and shortcuts into play.
- **Character creation:** a guided six-step 2024 character workflow with ability-score methods, class/background/species choices, proficiencies, equipment, spells, and a review step.
- **Character sheets:** overview, actions, inventory, spells, features and traits, and notes; ability checks, saving throws, skill checks, initiative, weapon attacks, spell casts, HP adjustment, short-rest Hit Dice, long rests, temporary HP, Death Saving Throws, inventory management, and spell-slot tracking.
- **Level advancement:** single-class level-ups through level 20, including class features, subclass selection, Fighting Style choices, ASI/feat choices, hit-point gains, and class-table spell-slot updates.
- **Battle map:** upload a map image, show or hide a square grid, place character and monster tokens, drag tokens to positions, select tokens, update their side and hit points, and measure approximate distances on the grid.
- **Encounter tracker:** build initiative from map tokens, roll initiative for party or enemies, edit initiative values, start and advance rounds, apply quick damage/healing, track conditions manually, and remove combatants.
- **Rules library:** search and filter the bundled SRD 5.2 (2024) catalog.
- **Homebrew editor:** create and edit campaign-owned classes, species, backgrounds, subclasses, feats, spells, items, and monsters.
- **Campaign journal and backups:** record session notes and export/import the campaign state, including characters, custom content, encounter data, map data, rolls, and journal entries.

## Run locally

The application is static and has no build step or third-party runtime dependency. Serve the project root over HTTP so browser ES modules and the SRD data file can load:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/`.

## Deploy

See [GITHUB_PAGES_DEPLOYMENT.md](./GITHUB_PAGES_DEPLOYMENT.md). Keep the root `index.html`, `styles.css`, `theme.css`, the complete `src/` directory, and `data/srd-5.2-2024.json` in their original relative locations. The application uses relative module/data URLs and supports a project-site subpath on static hosting.

## Campaign storage and multiplayer boundary

Campaign data is stored in the current browser's local storage. Export a campaign backup before clearing browser data or moving to another browser/device. The previous Shadowkeep storage key is migrated on first load so an existing local campaign is not silently abandoned.

**This build is not a networked multiplayer service.** It has no hosted accounts, real-time player synchronization, server-side campaign permissions, or cross-device shared state. The DM can run a complete local session in one browser; remote players need a shared backend and authenticated membership layer before this can be advertised as an online multiplayer VTT.

Condition markers are tracked on combatants but do not automatically impose condition rules. Complex spell effects, targeting, line of sight, fog of war, dynamic lighting, measurement templates, opportunity attacks, and full action-economy enforcement remain DM adjudication rather than automated resolution.

## Rules content

The included catalog is SRD 5.2 (2024), not the complete paid Player's Handbook or a full commercial rules catalog. Homebrew records are stored separately from the bundled SRD definitions. Creating a separate content pack is not part of this build; the app does not create or silently prefill new packs. The SRD is loaded into the shared read-only rules reference and is never copied into a newly created homebrew entry or collection.

See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for attribution and licensing details.

## Content packs

Open **Rules & homebrew** to manage content packs. Choose **New pack** to create a separate library and decide whether to include the SRD 5.2 reference entries. The checkbox is off by default, so a new pack can start completely empty. Packs keep their own custom classes, species, backgrounds, subclasses, feats, spells, items, and monsters.

Use **Export pack** to download the active pack as a `.dndpack.json` file. Use **Import pack** to add a pack from another D&D Unlimited export. Importing creates a separate pack rather than merging content into the active one. Campaign backups remain separate and include campaign state plus all content packs.
