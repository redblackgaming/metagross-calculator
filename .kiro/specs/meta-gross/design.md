# Design Document: Meta-Gross

## Overview

Meta-Gross is a Next.js SSG (Static Site Generation) web application that helps competitive Pokémon players build counter-teams. Users input up to 4 opponent Pokémon; the app calculates a team that maximizes type advantages against the opponent. All Pokémon data is fetched at build time and baked into the static export — no runtime API calls.

The app is deployed daily to GitHub Pages via GitHub Actions at zero cost.

### Key Design Decisions

- **SSG over SSR**: The Pokémon dataset changes only when new games release. Baking it into the static export eliminates runtime latency and hosting costs.
- **Strategy pattern**: Calculation algorithms are encapsulated behind an interface so new strategies can be added without touching the UI.
- **Build-time data pipeline**: A Node.js script (`scripts/fetch-pokemon.js`) fetches from PokeAPI GraphQL and writes `app/data/pokemon.json` before `next build` runs.
- **All app code in `./app`**: Python helpers (`helpers.py`, `poketypings.py`, `fetch_typings.py`) are co-located with the Next.js source for a clean monorepo layout.

---

## Architecture

### System Data Flow

```
PokeAPI GraphQL
      │
      ▼
scripts/fetch-pokemon.js  ──writes──▶  app/data/pokemon.json
                                              │
                                              ▼
                                    next build (getStaticProps)
                                              │
                                    ┌─────────┴──────────┐
                                    │  builds TypeIndex   │
                                    │  (Typing → names[]) │
                                    └─────────┬──────────┘
                                              │
                                              ▼
                                    Static HTML/JS export
                                              │
                                              ▼
                                    GitHub Pages (gh-pages branch)
```

### Runtime Data Flow (Browser)

```
User selects opponent Pokémon (Input_Team)
      │
      ▼
MaximizeAdvantagesStrategy.calculate(inputTeam, typeIndex)
      │  returns { advantageCount, candidateTeams }
      ▼
randomizer picks one team from candidateTeams
      │  maps each Typing → random Pokémon name from typeIndex
      ▼
Output_Team displayed with Advantage_Count
      │
      ▼
User clicks "Randomize" → repeat randomizer step
User clicks Output slot → same-typing selector override
```

---

## Components and Interfaces

### Component Tree

```
<RootLayout>
  └── <HomePage>
        ├── <PoolFilterDropdown>          // top bar
        ├── <OutputTeam>                  // left column
        │     ├── <AdvantageCountLabel>
        │     ├── <PokemonSlot> × 4      // output slots
        │     └── <RandomizeButton>
        └── <InputTeam>                   // right column
              └── <PokemonSlot> × 4      // input slots
                    └── <PokemonSelector> // searchable dropdown (portal)
```

### Component Responsibilities

**`<PoolFilterDropdown>`**
- Renders a `<select>` with "Pokémon Champions" and "All Pokémon" options.
- On change: if Input_Team has any filled slots, shows a `<ConfirmDialog>`. On confirm, clears both teams and updates the active pool. On cancel, reverts the select value.

**`<InputTeam>`**
- Renders 4 `<PokemonSlot>` components.
- Tracks which slot is "focused" for auto-advance.
- When all 4 slots are filled, calls `strategy.calculate()` and updates output state.

**`<OutputTeam>`**
- Renders 4 `<PokemonSlot>` components (read from output state).
- Renders `<AdvantageCountLabel>` and `<RandomizeButton>`.
- Randomize button is disabled when `candidateTeams.length <= 1`.

**`<PokemonSlot>`**
- Displays a Pokémon name (or empty placeholder).
- On click: opens `<PokemonSelector>` anchored to the slot.
- Input variant: full pool filtered by active Pool_Filter.
- Output variant: pool filtered to same Typing as current slot occupant.

**`<PokemonSelector>`**
- Searchable dropdown (text input + filtered list).
- Filters the pool by the search string (case-insensitive substring match on name).
- On selection: calls `onSelect(pokemon)` callback, closes.

**`<ConfirmDialog>`**
- Modal dialog with "Confirm" and "Cancel" actions.
- Used for Pool_Filter change confirmation.

### Strategy Interface

```ts
interface Strategy {
  calculate(
    inputTeam: Pokemon[],
    typeIndex: TypeIndex
  ): {
    advantageCount: number;
    candidateTeams: Typing[][];
  };
}
```

---

## Data Models

### Core Types

```ts
// A single Pokémon type name (one of 18 canonical types)
type TypeName =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

// A Pokémon's type combination
type Typing = [TypeName] | [TypeName, TypeName];

// A Pokémon entry from the database
type Pokemon = {
  name: string;
  typing: Typing;
};

// The type index: maps a canonical typing key to a list of Pokémon names
// Key format: sorted type names joined by comma, e.g. "grass,poison" or "fire"
type TypeIndex = Record<string, string[]>;

// The pool filter options
type PoolFilterOption = 'champions' | 'all';

// State for a single Pokémon slot
type SlotState =
  | { filled: false }
  | { filled: true; pokemon: Pokemon };

// Application state (managed in a single React context or top-level useState)
type AppState = {
  poolFilter: PoolFilterOption;
  inputSlots: [SlotState, SlotState, SlotState, SlotState];
  outputSlots: [SlotState, SlotState, SlotState, SlotState];
  advantageCount: number | null;
  candidateTeams: Typing[][];
};
```

### Static Data Files

**`app/data/pokemon.json`** — generated at build time:
```json
[
  { "name": "bulbasaur", "typing": ["grass", "poison"] },
  { "name": "charmander", "typing": ["fire"] },
  ...
]
```

**`app/data/champions.json`** — committed to repo, derived from `champions-data/champions-clean-lower`:
```json
["venusaur", "charizard", "blastoise", ...]
```

### Typing Key Canonicalization

To ensure consistent lookup in `TypeIndex`, typing keys are always formed by sorting the two type names alphabetically and joining with a comma:

```ts
function typingKey(typing: Typing): string {
  return [...typing].sort().join(',');
}
// typingKey(['poison', 'grass']) === 'grass,poison'
// typingKey(['fire'])            === 'fire'
```

---

## Build-Time Data Generation

### Script: `scripts/fetch-pokemon.js`

This is a Node.js port of `fetch_typings.py`. It runs as a prebuild step.

**Algorithm:**
1. Check if `tmp/cache.json` exists. If yes, read it. If no, POST to `https://graphql.pokeapi.co/v1beta2` with the Pokémon typings query, write result to `tmp/cache.json`.
2. Map each Pokémon entry to `{ name, typing: [type1, type2?] }`.
3. Write the array to `app/data/pokemon.json`.

**`package.json` integration:**
```json
{
  "scripts": {
    "prebuild": "node scripts/fetch-pokemon.js",
    "build": "next build"
  }
}
```

### Type Index Construction

Built in `getStaticProps` (or a shared `lib/buildTypeIndex.ts` utility called from `getStaticProps`):

```ts
function buildTypeIndex(pokemon: Pokemon[]): TypeIndex {
  const index: TypeIndex = {};
  for (const p of pokemon) {
    const key = typingKey(p.typing);
    if (!index[key]) index[key] = [];
    index[key].push(p.name);
  }
  // Remove entries with no Pokémon (9 known empty combos)
  for (const key of Object.keys(index)) {
    if (index[key].length === 0) delete index[key];
  }
  return index;
}
```

The 9 type combinations with no real Pokémon (as identified in `research.ipynb`) are automatically excluded by this filter:
`bug/dragon`, `fire/fairy`, `ground/fairy`, `ice/poison`, `normal/bug`, `normal/ice`, `normal/rock`, `normal/steel`, `rock/ghost`.

---

## Strategy Pattern Class Design

### `MaximizeAdvantagesStrategy`

Implements the algorithm from `research.ipynb` "Single Function" section, ported to TypeScript.

```ts
class MaximizeAdvantagesStrategy implements Strategy {
  calculate(inputTeam: Pokemon[], typeIndex: TypeIndex) {
    // 1. For each opponent, find types that are super-effective against it
    const oppDisadvantages = inputTeam.map(opp => ({
      pokemon: opp,
      weaknesses: disadvantages(opp.typing),
    }));

    // 2. Count how many opponents each type beats
    const advCounter = new Map<TypeName, number>();
    for (const { weaknesses } of oppDisadvantages) {
      for (const t of weaknesses) {
        advCounter.set(t, (advCounter.get(t) ?? 0) + 1);
      }
    }

    // 3. Candidate type pool = all types that beat at least one opponent
    const effectiveTypes = [...advCounter.keys()];

    // 4. Enumerate all C(effectiveTypes, 8), group into 4 dual-typings, score
    let maxAdvs = 0;
    for (const combo of combinations(effectiveTypes, 8)) {
      const team = teamify(combo);
      const advs = vsAdvantages(team, inputTeam).length;
      if (advs > maxAdvs) maxAdvs = advs;
    }

    // 5. Collect all teams achieving max score, filtered to valid index entries
    const candidateTeams = [...combinations(effectiveTypes, 8)]
      .map(teamify)
      .filter(team => vsAdvantages(team, inputTeam).length === maxAdvs)
      .filter(team => team.every(typing => typingKey(typing) in typeIndex));

    return { advantageCount: maxAdvs, candidateTeams };
  }
}
```

### `MinimizeDisadvantagesStrategy` (stub)

```ts
class MinimizeDisadvantagesStrategy implements Strategy {
  calculate(_inputTeam: Pokemon[], _typeIndex: TypeIndex) {
    // TODO: implement minimum-disadvantage algorithm from research.ipynb
    // "Second Approach (min weaknesses specifically to opponent)"
    throw new Error('MinimizeDisadvantagesStrategy not yet implemented');
  }
}
```

---

## Key Algorithms (TypeScript)

### `teamify(types: TypeName[]): Typing[]`

Groups a flat list of types into pairs (dual-typings), consuming from the end:

```ts
function teamify(types: TypeName[]): Typing[] {
  const list = [...types]; // copy
  const team: Typing[] = [];
  const poke: TypeName[] = [];

  while (list.length > 0) {
    if (poke.length > 1) {
      team.push([...poke].reverse() as Typing);
      poke.length = 0;
    }
    poke.push(list.pop()!);
  }
  if (poke.length > 0) {
    team.push([...poke].reverse() as Typing);
  }
  return team.reverse();
}
```

### `disadvantages(typing: Typing): TypeName[]`

Returns all attacking types that are super-effective (multiplier > 1) against the given typing:

```ts
function disadvantages(typing: Typing): TypeName[] {
  const [type1, type2] = typing;
  const result: TypeName[] = [];
  for (let attacker = 0; attacker < 18; attacker++) {
    let scalar = TYPE_CHART[attacker][TYPE_INDEX[type1]];
    if (type2) scalar *= TYPE_CHART[attacker][TYPE_INDEX[type2]];
    if (scalar > 1) result.push(ALL_TYPES[attacker]);
  }
  return result;
}
```

### `vsAdvantages(myTeam: Typing[], oppTeam: Pokemon[]): Array<[TypeName, Pokemon]>`

Counts all (my_type → opp_pokemon) super-effective matchups:

```ts
function vsAdvantages(
  myTeam: Typing[],
  oppTeam: Pokemon[]
): Array<[TypeName, Pokemon]> {
  const result: Array<[TypeName, Pokemon]> = [];
  for (const myTyping of myTeam) {
    for (const myType of myTyping) {
      for (const opp of oppTeam) {
        let scalar = TYPE_CHART[TYPE_INDEX[myType]][TYPE_INDEX[opp.typing[0]]];
        if (opp.typing[1]) {
          scalar *= TYPE_CHART[TYPE_INDEX[myType]][TYPE_INDEX[opp.typing[1]]];
        }
        if (scalar > 1) result.push([myType, opp]);
      }
    }
  }
  return result;
}
```

### `combinations<T>(arr: T[], k: number): Generator<T[]>`

Standard combinations generator (no external dependency needed):

```ts
function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return; }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...rest];
    }
  }
}
```

### `randomizer(candidateTeams: Typing[][], typeIndex: TypeIndex): Pokemon[]`

Picks a random team from candidates and maps each typing to a random real Pokémon:

```ts
function randomizer(candidateTeams: Typing[][], typeIndex: TypeIndex): Pokemon[] {
  const typings = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];
  return typings.map(typing => {
    const key = typingKey(typing);
    const names = typeIndex[key];
    const name = names[Math.floor(Math.random() * names.length)];
    return { name, typing };
  });
}
```

---

## GitHub Actions Pipeline Design

### Workflow: `.github/workflows/deploy.yml`

```yaml
name: Build and Deploy

on:
  schedule:
    - cron: '0 6 * * *'   # daily at 06:00 UTC
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: app/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: app

      - name: Fetch Pokémon data
        run: node scripts/fetch-pokemon.js
        working-directory: app

      - name: Build static export
        run: npm run build
        working-directory: app

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          personal_token: ${{ secrets.DEPLOY_TOKEN }}
          external_repository: <owner>/<pages-repo>
          publish_branch: gh-pages
          publish_dir: app/out
```

**Key design decisions:**
- `fetch-pokemon.js` runs as a separate step (not `prebuild`) so a fetch failure is clearly visible in the Actions log and does not silently fall through.
- The deploy step only runs if the build step succeeds (default GitHub Actions behavior — a failed step stops the job).
- `DEPLOY_TOKEN` is a Personal Access Token with `repo` scope stored as a repository secret.
- `tmp/cache.json` is gitignored; the CI always fetches fresh data (no cache between runs).

---

## File/Directory Structure

```
./
├── research.ipynb                    # updated imports: from app.helpers, app.poketypings
├── champions-data/
│   └── champions-clean-lower         # source of truth for Champions pool
└── app/
    ├── helpers.py                    # moved from root
    ├── poketypings.py                # moved from root
    ├── fetch_typings.py              # moved from root
    ├── package.json
    ├── next.config.js                # output: 'export', basePath for GitHub Pages
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── scripts/
    │   └── fetch-pokemon.js          # Node.js port of fetch_typings.py
    ├── data/
    │   ├── pokemon.json              # generated at build time (gitignored)
    │   └── champions.json            # committed; derived from champions-clean-lower
    ├── lib/
    │   ├── typeChart.ts              # TYPE_CHART matrix, ALL_TYPES, TYPE_INDEX map
    │   ├── typings.ts                # typingKey(), teamify(), disadvantages(), vsAdvantages(), combinations(), randomizer()
    │   ├── buildTypeIndex.ts         # buildTypeIndex(pokemon[]) → TypeIndex
    │   └── strategies/
    │       ├── Strategy.ts           # Strategy interface
    │       ├── MaximizeAdvantagesStrategy.ts
    │       └── MinimizeDisadvantagesStrategy.ts
    ├── components/
    │   ├── PoolFilterDropdown.tsx
    │   ├── PokemonSlot.tsx
    │   ├── PokemonSelector.tsx
    │   ├── InputTeam.tsx
    │   ├── OutputTeam.tsx
    │   ├── AdvantageCountLabel.tsx
    │   ├── RandomizeButton.tsx
    │   └── ConfirmDialog.tsx
    ├── pages/
    │   └── index.tsx                 # main page; getStaticProps loads pokemon.json + champions.json, builds TypeIndex
    ├── styles/
    │   └── globals.css               # Tailwind directives
    └── tmp/
        └── cache.json                # gitignored; PokeAPI response cache
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Type Index round-trip

*For any* list of Pokémon objects, every Pokémon in the list should appear in `buildTypeIndex(list)` under the key corresponding to its typing, and no Pokémon should appear under any other key.

**Validates: Requirements 1.4**

### Property 2: Pool filter correctness

*For any* Pokémon database and any champions subset, when the "Pokémon Champions" pool filter is active, every Pokémon available in the selector should have its name in the champions subset, and no Pokémon outside the subset should appear.

**Validates: Requirements 2.3, 2.4**

### Property 3: `disadvantages` correctness

*For any* Pokémon typing (one or two types), every type returned by `disadvantages(typing)` should have a combined effectiveness multiplier strictly greater than 1 against that typing according to the type chart, and no type with multiplier ≤ 1 should be returned.

**Validates: Requirements 5.2**

### Property 4: `teamify` structural invariant

*For any* list of 2N type names (N ≥ 1), `teamify(list)` should produce exactly N Typing objects, and the multiset of all types across those Typings should equal the multiset of the input list.

**Validates: Requirements 5.4**

### Property 5: `calculate` returns maximum-advantage teams only

*For any* valid input team of 4 Pokémon, all teams returned by `MaximizeAdvantagesStrategy.calculate()` should have the same advantage count, and that count should be greater than or equal to the advantage count of any other team constructable from the effective type pool.

**Validates: Requirements 5.5, 5.7**

### Property 6: Returned teams exist in the type index

*For any* valid input team and type index, every Typing in every team returned by `MaximizeAdvantagesStrategy.calculate()` should have a corresponding key in the type index (i.e., at least one real Pokémon has that typing).

**Validates: Requirements 5.6**

---

## Error Handling

| Scenario | Handling |
|---|---|
| PokeAPI unreachable at build time | `fetch-pokemon.js` falls back to `tmp/cache.json`; if neither exists, the script exits with a non-zero code and the build fails with a clear error message. |
| Type combination has no real Pokémon | Excluded from `TypeIndex` at build time; `MaximizeAdvantagesStrategy` filters these out before returning candidate teams. |
| Input team has fewer than 4 Pokémon | Strategy is not called; Output_Team remains empty. |
| `candidateTeams` is empty after index filtering | UI shows a "No valid team found" message; Randomize button is hidden. |
| Pool filter change with filled slots | Confirmation dialog prevents accidental data loss. |
| Champions pool is empty for a given typing | That typing is absent from the champions `TypeIndex`; the Output_Team selector for that slot will show no options (edge case surfaced to user). |

---

## Testing Strategy

### Unit Tests (example-based)

- `buildTypeIndex`: verify correct key formation, verify empty-list entries are excluded, verify single-type and dual-type keys.
- `typingKey`: verify alphabetical sort, verify single-type key.
- `teamify`: verify 0, 1, 2, 4, 8 element inputs.
- `disadvantages`: verify known type matchups (e.g., fire is weak to water/rock/ground).
- `vsAdvantages`: verify count against a known input team.
- `MaximizeAdvantagesStrategy.calculate`: verify known input → known output for the example team from `research.ipynb`.
- Pool filter: verify champions filter excludes non-champions, all-pokemon filter includes everything.
- UI components: render tests for slot states (empty, filled), selector open/close, confirm dialog.

### Property-Based Tests

Using [fast-check](https://github.com/dubzzz/fast-check) (TypeScript PBT library). Each test runs a minimum of 100 iterations.

**Property 1 — Type Index round-trip**
```
// Feature: meta-gross, Property 1: Type Index round-trip
fc.assert(fc.property(fc.array(pokemonArb), pokemon => {
  const index = buildTypeIndex(pokemon);
  return pokemon.every(p => index[typingKey(p.typing)]?.includes(p.name));
}), { numRuns: 100 });
```

**Property 2 — Pool filter correctness**
```
// Feature: meta-gross, Property 2: Pool filter correctness
fc.assert(fc.property(fc.array(pokemonArb), fc.array(fc.string()), (db, champions) => {
  const filtered = applyPoolFilter(db, 'champions', champions);
  return filtered.every(p => champions.includes(p.name));
}), { numRuns: 100 });
```

**Property 3 — `disadvantages` correctness**
```
// Feature: meta-gross, Property 3: disadvantages correctness
fc.assert(fc.property(typingArb, typing => {
  const weaknesses = disadvantages(typing);
  return weaknesses.every(t =>
    TYPE_CHART[TYPE_INDEX[t]][TYPE_INDEX[typing[0]]] *
    (typing[1] ? TYPE_CHART[TYPE_INDEX[t]][TYPE_INDEX[typing[1]]] : 1) > 1
  );
}), { numRuns: 100 });
```

**Property 4 — `teamify` structural invariant**
```
// Feature: meta-gross, Property 4: teamify structural invariant
fc.assert(fc.property(fc.integer({ min: 1, max: 9 }).chain(n =>
  fc.array(typeNameArb, { minLength: n * 2, maxLength: n * 2 })
), types => {
  const team = teamify(types);
  const flat = team.flatMap(t => [...t]);
  return team.length === types.length / 2 &&
    flat.sort().join() === [...types].sort().join();
}), { numRuns: 100 });
```

**Property 5 — `calculate` returns maximum-advantage teams only**
```
// Feature: meta-gross, Property 5: calculate returns maximum-advantage teams only
fc.assert(fc.property(inputTeamArb, typeIndexArb, (inputTeam, typeIndex) => {
  const { advantageCount, candidateTeams } = strategy.calculate(inputTeam, typeIndex);
  return advantageCount > 0 &&
    candidateTeams.every(t => vsAdvantages(t, inputTeam).length === advantageCount);
}), { numRuns: 100 });
```

**Property 6 — Returned teams exist in the type index**
```
// Feature: meta-gross, Property 6: returned teams exist in the type index
fc.assert(fc.property(inputTeamArb, typeIndexArb, (inputTeam, typeIndex) => {
  const { candidateTeams } = strategy.calculate(inputTeam, typeIndex);
  return candidateTeams.every(team =>
    team.every(typing => typingKey(typing) in typeIndex)
  );
}), { numRuns: 100 });
```

### Integration Tests

- `fetch-pokemon.js` with mocked network: verify fallback to `tmp/cache.json`.
- `fetch-pokemon.js` with live network (CI only): verify `app/data/pokemon.json` is written and parseable.
- Full `next build` smoke test: verify the `out/` directory is produced and `index.html` exists.
