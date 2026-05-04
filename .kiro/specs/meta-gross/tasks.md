# Implementation Plan: Meta-Gross

## Overview

Implement the Meta-Gross Next.js SSG web app incrementally: scaffold the project, move Python helpers, build the data pipeline, implement core TypeScript logic, wire up UI components, and configure the GitHub Actions deployment.

## Tasks

- [x] 1. Scaffold Next.js app with Tailwind and TypeScript
  - Run `npx create-next-app@latest app --typescript --tailwind --no-app --no-src-dir --import-alias "@/*"` (or equivalent manual setup)
  - Add `"output": "export"` and `basePath` for GitHub Pages to `app/next.config.js`
  - Confirm `app/styles/globals.css` contains Tailwind directives (`@tailwind base/components/utilities`)
  - Create empty placeholder directories: `app/lib/strategies/`, `app/components/`, `app/data/`, `app/scripts/`, `app/tmp/`
  - Add `app/data/pokemon.json` and `app/tmp/cache.json` to `.gitignore`
  - _Requirements: 10.1, 10.5_

- [x] 2. Move Python helpers and update research.ipynb imports
  - Move `helpers.py`, `poketypings.py`, and `fetch_typings.py` from the repo root into `./app/`
  - Update every `import` / `from` statement in `research.ipynb` that references these modules to use the new paths (e.g. `from app.helpers import ...`, `from app.poketypings import ...`)
  - _Requirements: 10.2, 10.3_

- [x] 3. Generate `app/data/champions.json` from source data
  - Write a one-off Node.js script `app/scripts/build-champions.js` that reads `champions-data/champions-clean-lower`, splits on newlines, filters empty lines, and writes the resulting JSON array to `app/data/champions.json`
  - Run the script once and commit `app/data/champions.json`
  - _Requirements: 2.3, 10.1_

- [x] 4. Implement `scripts/fetch-pokemon.js` build-time data pipeline
  - Create `app/scripts/fetch-pokemon.js` as a Node.js port of `fetch_typings.py`
  - Check for `app/tmp/cache.json`; if present read it, otherwise POST to `https://graphql.pokeapi.co/v1beta2` with the Pokémon typings query and write the response to `app/tmp/cache.json`
  - Map each entry to `{ name, typing: [type1, type2?] }` and write the array to `app/data/pokemon.json`
  - If neither network nor cache is available, exit with a non-zero code and a clear error message
  - Add `"prebuild": "node scripts/fetch-pokemon.js"` to `app/package.json` scripts
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 9.3_

- [x] 5. Implement core TypeScript lib — type chart and type utilities
  - [x] 5.1 Create `app/lib/typeChart.ts`
    - Export `TYPE_CHART` as an 18×18 readonly number matrix (ported from `poketypings.py`)
    - Export `ALL_TYPES` as a readonly tuple of the 18 `TypeName` string literals
    - Export `TYPE_INDEX` as a `Record<TypeName, number>` mapping each type name to its row/column index
    - _Requirements: 5.2, 10.4_

  - [x] 5.2 Create `app/lib/typings.ts`
    - Export `typingKey(typing: Typing): string` — sorts type names alphabetically and joins with `,`
    - Export `disadvantages(typing: Typing): TypeName[]` — returns all attacking types with combined multiplier > 1
    - Export `teamify(types: TypeName[]): Typing[]` — groups flat type list into pairs as described in design
    - Export `vsAdvantages(myTeam: Typing[], oppTeam: Pokemon[]): Array<[TypeName, Pokemon]>`
    - Export `combinations<T>(arr: T[], k: number): Generator<T[]>`
    - Export `randomizer(candidateTeams: Typing[][], typeIndex: TypeIndex): Pokemon[]`
    - _Requirements: 5.2, 5.3, 5.4, 6.2, 10.4_

  - [x] 5.3 Create `app/lib/buildTypeIndex.ts`
    - Export `buildTypeIndex(pokemon: Pokemon[]): TypeIndex` — builds the `Typing → names[]` map, omitting empty entries
    - _Requirements: 1.4_

  - [ ]* 5.4 Write property test for `buildTypeIndex` (Property 1)
    - **Property 1: Type Index round-trip** — for any array of Pokémon objects, every Pokémon appears in the index under its typing key and under no other key
    - **Validates: Requirements 1.4**

  - [ ]* 5.5 Write property test for `disadvantages` (Property 3)
    - **Property 3: `disadvantages` correctness** — for any typing, every returned type has combined multiplier > 1 and no type with multiplier ≤ 1 is returned
    - **Validates: Requirements 5.2**

  - [ ]* 5.6 Write property test for `teamify` (Property 4)
    - **Property 4: `teamify` structural invariant** — for any list of 2N type names, `teamify` returns exactly N Typings and the multiset of all types equals the input multiset
    - **Validates: Requirements 5.4**

  - [ ]* 5.7 Write unit tests for `typingKey`, `disadvantages`, `teamify`, `vsAdvantages`
    - Test `typingKey` alphabetical sort and single-type key
    - Test `disadvantages` for known matchups (e.g. fire is weak to water, rock, ground)
    - Test `teamify` for 2, 4, 8 element inputs
    - Test `vsAdvantages` count against a known input team
    - _Requirements: 5.2, 5.4_

- [x] 6. Implement Strategy pattern
  - [x] 6.1 Create `app/lib/strategies/Strategy.ts`
    - Export the `Strategy` interface with `calculate(inputTeam: Pokemon[], typeIndex: TypeIndex): { advantageCount: number; candidateTeams: Typing[][] }`
    - _Requirements: 8.1_

  - [x] 6.2 Create `app/lib/strategies/MaximizeAdvantagesStrategy.ts`
    - Implement `MaximizeAdvantagesStrategy` using `disadvantages`, `combinations`, `teamify`, `vsAdvantages` from `app/lib/typings.ts`
    - Filter candidate teams to only those where every Typing key exists in `typeIndex`
    - Return `{ advantageCount, candidateTeams }`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.2_

  - [x] 6.3 Create `app/lib/strategies/MinimizeDisadvantagesStrategy.ts`
    - Implement stub class that throws `Error('MinimizeDisadvantagesStrategy not yet implemented')`
    - _Requirements: 8.3_

  - [ ]* 6.4 Write property test for `MaximizeAdvantagesStrategy.calculate` (Property 5)
    - **Property 5: `calculate` returns maximum-advantage teams only** — all returned teams share the same advantage count, which is ≥ any other constructable team's count, and is > 0
    - **Validates: Requirements 5.5, 5.7**

  - [ ]* 6.5 Write property test for type-index filtering (Property 6)
    - **Property 6: Returned teams exist in the type index** — every Typing in every returned team has a key present in the type index
    - **Validates: Requirements 5.6**

  - [ ]* 6.6 Write unit test for `MaximizeAdvantagesStrategy.calculate`
    - Verify known input team from `research.ipynb` produces the expected advantage count and candidate teams
    - _Requirements: 5.1, 5.5_

- [x] 7. Checkpoint — ensure all lib and strategy tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement UI components
  - [x] 8.1 Create `app/components/ConfirmDialog.tsx`
    - Modal with "Confirm" and "Cancel" buttons; accepts `message`, `onConfirm`, `onCancel` props
    - _Requirements: 2.5, 2.6, 2.7_

  - [x] 8.2 Create `app/components/PoolFilterDropdown.tsx`
    - Renders a `<select>` with "Pokémon Champions" and "All Pokémon" options
    - On change with filled slots: renders `<ConfirmDialog>`; on confirm clears teams; on cancel reverts value
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7_

  - [x] 8.3 Create `app/components/PokemonSelector.tsx`
    - Searchable dropdown: text input + filtered list (case-insensitive substring match on name)
    - Accepts `pool: Pokemon[]`, `onSelect: (p: Pokemon) => void`, `onClose: () => void` props
    - _Requirements: 3.3, 7.2_

  - [x] 8.4 Create `app/components/PokemonSlot.tsx`
    - Displays Pokémon name or empty placeholder
    - On click opens `<PokemonSelector>` anchored to the slot
    - Accepts `slot: SlotState`, `pool: Pokemon[]`, `onSelect`, `variant: 'input' | 'output'` props
    - _Requirements: 3.1, 3.2, 3.4, 3.7, 7.1_

  - [x] 8.5 Create `app/components/AdvantageCountLabel.tsx`
    - Renders `"X advantages"` when `advantageCount` is non-null, nothing otherwise
    - _Requirements: 4.3, 4.4_

  - [x] 8.6 Create `app/components/RandomizeButton.tsx`
    - Renders "Randomize" button; disabled when `candidateTeams.length <= 1`; calls `onRandomize` on click
    - _Requirements: 6.1, 6.5_

  - [x] 8.7 Create `app/components/InputTeam.tsx`
    - Renders 4 `<PokemonSlot>` components for the input team
    - Tracks focused slot for auto-advance (req 3.5)
    - When all 4 slots filled, calls `onTeamComplete(inputTeam)` (req 3.6)
    - When a slot changes, calls `onTeamChange` so parent can recalculate or clear output (req 3.8)
    - _Requirements: 3.1, 3.5, 3.6, 3.8_

  - [x] 8.8 Create `app/components/OutputTeam.tsx`
    - Renders 4 `<PokemonSlot>` components for the output team (output variant)
    - Renders `<AdvantageCountLabel>` and `<RandomizeButton>`
    - Output slot pool is filtered to same Typing as current occupant (req 7.2)
    - _Requirements: 4.1, 4.2, 6.1, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 8.9 Write unit tests for UI components
    - Test `PokemonSlot` renders empty and filled states
    - Test `PoolFilterDropdown` renders both options and fires confirm dialog when slots are filled
    - Test `RandomizeButton` is disabled when `candidateTeams.length <= 1`
    - Test `AdvantageCountLabel` renders correct text
    - _Requirements: 2.1, 4.3, 6.5_

  - [ ]* 8.10 Write property test for pool filter (Property 2)
    - **Property 2: Pool filter correctness** — when champions filter is active, every Pokémon in the filtered pool has its name in the champions subset, and no Pokémon outside the subset appears
    - **Validates: Requirements 2.3, 2.4**

- [x] 9. Implement main page with `getStaticProps`
  - Create `app/pages/index.tsx`
  - In `getStaticProps`: read `app/data/pokemon.json` and `app/data/champions.json`, call `buildTypeIndex`, pass `{ pokemon, champions, typeIndex }` as props
  - Wire top-level `AppState` with `useState` (poolFilter, inputSlots, outputSlots, advantageCount, candidateTeams)
  - Instantiate `MaximizeAdvantagesStrategy` and call `strategy.calculate()` when all 4 input slots are filled
  - Call `randomizer()` to pick the initial displayed output team from `candidateTeams`
  - Compose `<PoolFilterDropdown>`, `<OutputTeam>`, and `<InputTeam>` in a two-column Tailwind layout
  - _Requirements: 1.3, 2.1, 3.6, 4.1, 4.2, 5.1, 6.2, 6.3, 8.4_

- [x] 10. Checkpoint — verify full build and page render
  - Run `node scripts/fetch-pokemon.js` inside `app/` to generate `app/data/pokemon.json`
  - Run `npm run build` inside `app/` and confirm `app/out/index.html` is produced
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Configure GitHub Actions deployment pipeline
  - Create `.github/workflows/deploy.yml` with daily cron (`0 6 * * *`) and `workflow_dispatch` triggers
  - Add steps: checkout, setup-node (v20, cache npm, `app/package-lock.json`), `npm ci`, `node scripts/fetch-pokemon.js`, `npm run build`, deploy via `peaceiris/actions-gh-pages@v4` to `gh-pages` branch using `DEPLOY_TOKEN` secret
  - Ensure the deploy step references `publish_dir: app/out`
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 12. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use [fast-check](https://github.com/dubzzz/fast-check); run with `npx jest --run` or equivalent single-execution command
- Each task references specific requirements for traceability
- `app/data/pokemon.json` is gitignored and must be generated before `next build` (handled by `prebuild` script)
- `app/data/champions.json` is committed to the repo (task 3)
- The `tmp/cache.json` PokeAPI cache is gitignored; CI always fetches fresh data
