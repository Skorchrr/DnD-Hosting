# D&D Unlimited — VTT completion plan

## Direction

Finish the existing D&D 2024 campaign-table application as a practical VTT. Do not expand a separate universal mechanics engine or replace working subsystems merely to make them more generic. Reuse the existing character, content, rules, campaign-state, map, and encounter code. Add mechanics only when they directly support play.

## Phase 1 — Stabilize the existing application

- [x] Restore consistent D&D Unlimited branding and app metadata.
- [x] Correct the malformed static content-filter markup that prevented the filter row from rendering as intended.
- [x] Preserve existing local campaigns while moving to the D&D Unlimited storage key.
- [x] Make static-hosting paths and deployment instructions explicit.
- [x] Remove the automated test suite and test scripts as requested.
- [ ] Complete a real browser walkthrough of every primary route on the target deployment.
- [ ] Confirm campaign backup round-trip with a real saved campaign.

## Phase 2 — Make the tabletop usable during a session

- [x] Map upload, grid visibility, token placement, token dragging, and token selection.
- [x] Build initiative from map tokens and roll party/enemy initiative.
- [x] Preserve the active combatant when initiative values change or group initiative is rerolled.
- [x] Add quick HP damage/healing controls to the initiative tracker.
- [x] Add manual condition markers to combatants.
- [x] Keep token HP synchronized with linked combatant HP.
- [x] Add two-point map distance measurement using the configured grid.
- [ ] Add configurable grid dimensions and grid scale.
- [ ] Add encounter notes, round/turn history, and a clear end-encounter flow.
- [ ] Add monster action/attack execution from the encounter tracker.

## Phase 3 — Finish character-at-the-table workflows

- [ ] Walk through all six character-creation steps and correct any incomplete 2024 selections.
- [x] Add single-class level advancement with hit-point rolls/average, class features, subclass selection, Fighting Style, ASI/feat choices, and spell-slot progression.
- [ ] Finish feature-specific resource choices, class spell selections, subclass replacements, multiclassing, and complete rules validation.
- [x] Add short-rest Hit Dice spending, Warlock Pact Magic recovery, long-rest Hit Dice recovery, HP restoration, temporary HP, and exhaustion recovery.
- [x] Add Death Saving Throw rolls with natural 1/20 handling and success/failure tracking.
- [ ] Synchronize character conditions with encounter markers; automate condition effects where appropriate.
- [ ] Ensure equipment, armor, weapons, spell slots, prepared spells, and resource use stay synchronized.
- [ ] Improve action controls and show roll source, modifiers, and outcomes consistently.

## Phase 4 — Complete campaign content and DM workflows

- [ ] Improve homebrew editors for class features, subclass features, monster actions, item properties, and spell details.
- [ ] Add safer editing, duplicate, archive, and validation flows for campaign-owned content.
- [ ] Improve encounter preparation, journal organization, and campaign backup recovery.
- [x] Add independent content packs with an explicit SRD 5.2 inclusion checkbox (off by default); empty packs contain no SRD entries.
- [x] Add content-pack JSON import/export. Imports create a separate pack rather than merging into the active pack.
- [ ] Add safer editing, duplicate, archive, and validation flows for campaign-owned content.

## Phase 5 — Online VTT capabilities

- [ ] Add authenticated campaigns and player invitations.
- [ ] Add server-enforced DM/player permissions.
- [ ] Add real-time synchronization for campaign, character, encounter, map, and chat state.
- [ ] Add conflict handling, reconnect recovery, and safe backup/restore.

## Completion standard

A phase is complete only after its flows are usable from the visible UI, state survives reloads, linked campaign entities stay consistent, and the deployed application can be opened from its published URL. Do not reintroduce automated tests as a deliverable; use hands-on functional walkthroughs and explicit verification notes instead.
