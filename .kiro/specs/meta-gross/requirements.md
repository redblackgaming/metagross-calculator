# Requirements Document

## Introduction

Meta-Gross is a Next.js SSG web application that helps competitive Pokémon players build teams that counter a given opponent team. Users input up to 4 opponent Pokémon, and the app calculates a counter-team that maximizes type advantages. The Pokémon database is generated at build time from the PokeAPI GraphQL endpoint (via `fetch_typings.py`) and baked into the static site. The app is deployed daily to GitHub Pages via GitHub Actions at zero cost.

The name is a pun: "meta" (the competitive metagame) + "gross" (the metagame is gross) = Metagross (a Pokémon).

---

## Glossary

- **App**: The Meta-Gross Next.js SSG web application.
- **Pokemon_DB**: The JSON dataset of all Pokémon objects `{ name, typing: [type1, type2?] }`, generated at build time by `fetch_typings.py` and embedded as a static asset.
- **Typing**: A Pokémon's type combination — either one or two of the 18 canonical Pokémon types.
- **Input_Team**: The set of up to 4 opponent Pokémon selected by the user.
- **Output_Team**: The set of 4 Pokémon calculated by the App to have type advantages over the Input_Team.
- **Pokemon_Slot**: A rectangular UI element representing one position in either the Input_Team or Output_Team.
- **Pokemon_Selector**: The dropdown that appears when a Pokemon_Slot is clicked, allowing the user to search and select a Pokémon.
- **Pool_Filter**: The top-of-page dropdown that restricts which Pokémon are available for selection in the Input_Team.
- **Champions_Pool**: The subset of Pokémon whose names appear in `champions-data/champions-clean-lower`, corresponding to the "Pokémon Champions" game mode.
- **Strategy**: An algorithm (OOP Strategy pattern) that accepts an Input_Team and returns a set of candidate Output_Teams along with an advantage count.
- **Maximize_Advantages_Strategy**: The default Strategy that finds all 4-Pokémon teams maximizing the count of type-advantage matchups against the Input_Team, as implemented in `research.ipynb` under "Single Function".
- **Advantage_Count**: The integer number of (my_type → opponent_pokemon) super-effective matchups the Output_Team has against the Input_Team.
- **Type_Index**: A mapping from Typing → list of Pokémon names with that Typing, built at build time from the Pokemon_DB.
- **Randomize**: The action of selecting a new random team from the candidate Output_Teams produced by the active Strategy.
- **SSG**: Static Site Generation — all pages are pre-rendered to HTML at build time.
- **GitHub_Actions**: The CI/CD pipeline that builds and deploys the App once per day.
- **GitHub_Pages**: The free static hosting target for the deployed App.

---

## Requirements

### Requirement 1: Pokémon Database Generation at Build Time

**User Story:** As a developer, I want the Pokémon database to be fetched and embedded at build time, so that the deployed static site requires no runtime API calls.

#### Acceptance Criteria

1. THE App SHALL generate the Pokemon_DB JSON file by executing `fetch_typings.py` (or its JavaScript equivalent) during the Next.js build step.
2. THE App SHALL cache the raw PokeAPI response to `tmp/cache.json` so that repeated local builds do not re-fetch from the network.
3. THE App SHALL embed the Pokemon_DB as a static data file importable by Next.js pages at build time via `getStaticProps`.
4. THE App SHALL build the Type_Index from the Pokemon_DB at build time, mapping each Typing to the list of Pokémon names that share that Typing.
5. IF the PokeAPI GraphQL endpoint is unreachable during build, THEN THE App SHALL use the existing `tmp/cache.json` file and SHALL NOT fail the build.

---

### Requirement 2: Pool Filter

**User Story:** As a user, I want to filter which Pokémon are available for selection, so that I can focus on a specific game mode's roster.

#### Acceptance Criteria

1. THE App SHALL display a Pool_Filter dropdown at the top of the main page.
2. THE Pool_Filter SHALL offer exactly two options: "Pokémon Champions" and "All Pokémon".
3. WHEN the user selects "Pokémon Champions", THE App SHALL restrict the Pokemon_Selector to only Pokémon whose names appear in the Champions_Pool list.
4. WHEN the user selects "All Pokémon", THE App SHALL make all Pokémon in the Pokemon_DB available in the Pokemon_Selector.
5. WHEN the Pool_Filter selection changes and the Input_Team has at least one filled slot, THE App SHALL display a confirmation dialog warning the user that changing the filter will clear the current Input_Team.
6. WHEN the user confirms the Pool_Filter change, THE App SHALL clear all currently selected Input_Team slots and reset the Output_Team.
7. WHEN the user cancels the Pool_Filter change, THE App SHALL revert the Pool_Filter to its previous selection and leave the Input_Team unchanged.

---

### Requirement 3: Input Team Selection

**User Story:** As a user, I want to select up to 4 opponent Pokémon, so that the app can calculate a counter-team for me.

#### Acceptance Criteria

1. THE App SHALL display 4 Pokemon_Slots on the right side of the main page, arranged vertically, representing the Input_Team.
2. WHEN a user clicks an empty Pokemon_Slot, THE App SHALL open a Pokemon_Selector dropdown for that slot.
3. THE Pokemon_Selector SHALL display a searchable list of Pokémon filtered by the active Pool_Filter.
4. WHEN the user selects a Pokémon from the Pokemon_Selector, THE App SHALL populate the clicked slot with that Pokémon and close the Pokemon_Selector.
5. WHEN the user selects a Pokémon and there is a subsequent empty slot, THE App SHALL automatically focus the Pokemon_Selector on the next empty slot.
6. WHEN the user selects a Pokémon and all 4 slots are now filled, THE App SHALL trigger the active Strategy to calculate the Output_Team.
7. WHEN a user clicks a filled Pokemon_Slot, THE App SHALL open the Pokemon_Selector pre-populated with the current selection, allowing the user to change it.
8. IF a user changes a filled slot, THEN THE App SHALL recalculate the Output_Team if all 4 slots remain filled, or SHALL clear the Output_Team if fewer than 4 slots are filled.

---

### Requirement 4: Output Team Display

**User Story:** As a user, I want to see a calculated counter-team on the left side of the screen, so that I can understand which Pokémon to use against my opponent.

#### Acceptance Criteria

1. THE App SHALL display 4 Pokemon_Slots on the left side of the main page, arranged vertically, representing the Output_Team.
2. WHILE the Input_Team has fewer than 4 Pokémon selected, THE App SHALL display the Output_Team slots as empty/placeholder.
3. WHEN the Output_Team is calculated, THE App SHALL display the Advantage_Count above or near the Output_Team slots.
4. THE App SHALL display the Advantage_Count as a plain numeric label in the format "X advantages" (e.g. "10 advantages"), where X is the integer count of super-effective matchups the Output_Team has against the Input_Team.

---

### Requirement 5: Maximize Advantages Strategy

**User Story:** As a user, I want the default counter-team calculation to maximize type advantages, so that my team has the best offensive coverage against the opponent.

#### Acceptance Criteria

1. THE Maximize_Advantages_Strategy SHALL accept an Input_Team of 4 Pokémon (each with a Typing) and return a set of candidate Output_Teams and the Advantage_Count.
2. THE Maximize_Advantages_Strategy SHALL compute, for each opponent Pokémon, the list of types that are super-effective against it (using the `disadvantages` function from `poketypings.py`).
3. THE Maximize_Advantages_Strategy SHALL collect all types that are super-effective against at least one opponent Pokémon into a candidate type pool.
4. THE Maximize_Advantages_Strategy SHALL enumerate all combinations of 8 types from the candidate pool, group them into 4 Typings of 2 types each (via `teamify`), and compute the number of super-effective (my_type → opponent_pokemon) matchups for each (via `vs_advantages`).
5. THE Maximize_Advantages_Strategy SHALL return only the teams that achieve the maximum Advantage_Count.
6. THE Maximize_Advantages_Strategy SHALL filter candidate teams to only those where every Typing exists in the Type_Index (i.e., at least one real Pokémon has that Typing).
7. FOR ALL valid Input_Teams, THE Maximize_Advantages_Strategy SHALL return an Advantage_Count greater than 0.

---

### Requirement 6: Randomize Output Team

**User Story:** As a user, I want to shuffle the output team until I find one I like, so that I have variety in my counter-team options.

#### Acceptance Criteria

1. THE App SHALL display a "Randomize" button when the Output_Team is populated.
2. WHEN the user clicks "Randomize", THE App SHALL select a new random team from the candidate Output_Teams produced by the active Strategy.
3. WHEN the user clicks "Randomize", THE App SHALL update the Output_Team slots with the newly selected Pokémon.
4. WHEN the user clicks "Randomize", THE App SHALL update the displayed Advantage_Count to reflect the newly selected team.
5. WHILE there is only one candidate Output_Team, THE App SHALL disable the "Randomize" button.

---

### Requirement 7: Output Team Manual Override

**User Story:** As a user, I want to manually swap individual Pokémon in the output team, so that I can fine-tune the counter-team to my preferences.

#### Acceptance Criteria

1. WHEN a user clicks a filled Output_Team Pokemon_Slot, THE App SHALL open a Pokemon_Selector for that slot.
2. THE Pokemon_Selector for an Output_Team slot SHALL display only Pokémon that share the same Typing as the currently selected Pokémon in that slot, filtered to only those available in the active Pool_Filter.
3. WHEN the user selects a replacement Pokémon from the Output_Team Pokemon_Selector, THE App SHALL update that slot with the new Pokémon.
4. WHEN the user manually overrides an Output_Team slot, THE App SHALL preserve the Advantage_Count from the most recent Strategy calculation (since the Typing is unchanged).

---

### Requirement 8: Strategy Pattern Architecture

**User Story:** As a developer, I want the calculation logic to follow the Strategy design pattern, so that new counter-team algorithms can be added without modifying existing code.

#### Acceptance Criteria

1. THE App SHALL define a Strategy interface with a method `calculate(inputTeam, typeIndex)` that returns `{ advantageCount, candidateTeams }`.
2. THE App SHALL implement `Maximize_Advantages_Strategy` as a concrete Strategy class.
3. THE App SHALL implement a second Strategy subclass (stub) for the alternative algorithm from `research.ipynb`, with the method body left unimplemented for future completion.
4. THE App SHALL use the active Strategy via the interface, so that swapping strategies requires no changes to the UI layer.

---

### Requirement 9: Build and Deployment Pipeline

**User Story:** As a developer, I want the app to build and deploy automatically once per day, so that the Pokémon database stays reasonably up to date at zero hosting cost.

#### Acceptance Criteria

1. THE GitHub_Actions pipeline SHALL trigger on a daily schedule (once per 24 hours).
2. THE GitHub_Actions pipeline SHALL support manual trigger via `workflow_dispatch`.
3. THE GitHub_Actions pipeline SHALL run `fetch_typings.py` (or equivalent) to generate the Pokemon_DB before the Next.js build.
4. THE GitHub_Actions pipeline SHALL run `next build` to produce a fully static export.
5. THE GitHub_Actions pipeline SHALL deploy the static export to the `gh-pages` branch of the target GitHub_Pages repository using a deploy token stored as a repository secret.
6. IF the build step fails, THEN THE GitHub_Actions pipeline SHALL NOT deploy a broken build to GitHub_Pages.

---

### Requirement 10: Project File Organization

**User Story:** As a developer, I want all application code in the `./app` directory, so that the project structure is clean and the Python helper scripts are co-located with the build tooling.

#### Acceptance Criteria

1. THE App SHALL reside entirely within the `./app` directory, including all Next.js source files, configuration, and build scripts.
2. THE App SHALL move `helpers.py`, `poketypings.py`, and `fetch_typings.py` into the `./app` directory.
3. WHEN `helpers.py`, `poketypings.py`, and `fetch_typings.py` are moved, THE App SHALL update all import statements in `research.ipynb` to reflect the new paths.
4. THE App SHALL convert `poketypings.py` and `helpers.py` logic to JavaScript modules within `./app/lib/`, so that the type chart and Typing logic are available to Next.js at build time and runtime.
5. THE App SHALL use Tailwind CSS for all styling.
