import { TYPE_CHART, TYPE_INDEX, ALL_TYPES, TypeName } from './typeChart';

export type Typing = [TypeName] | [TypeName, TypeName];
export type Pokemon = { id: number; name: string; typing: Typing };
export type TypeIndex = Record<string, string[]>;

export function typingKey(typing: Typing): string {
  return [...typing].sort().join(',');
}

/**
 * Returns the path to a pokemon's default sprite.
 * Uses mf_n as the primary guess; PokemonSlot handles onError fallback.
 */
export function getSpriteUrl(id: number, suffix = 'mf_n'): string {
  const padded = String(id).padStart(4, '0');
  return `/sprites/${padded}_000_${suffix}.png`;
}

/**
 * Returns the sprite ID for a pokemon, accounting for special forms.
 * If the name contains a dash (e.g. "rotom-wash", "landorus-therian",
 * "darmanitan-galar-zen"), finds the pokemon with the lowest ID whose
 * name starts with the same first segment — i.e. the canonical base form.
 * Falls back to the original ID if no match is found.
 */
export function getSpriteId(pokemon: Pokemon, allPokemon: Pokemon[]): number {
  if (!pokemon.name.includes('-')) return pokemon.id;
  const prefix = pokemon.name.split('-')[0];
  // Find all pokemon whose name starts with this prefix, pick the one with lowest ID
  const candidates = allPokemon.filter(p => p.name === prefix || p.name.startsWith(prefix + '-'));
  if (candidates.length === 0) return pokemon.id;
  return candidates.reduce((min, p) => p.id < min ? p.id : min, candidates[0].id);
}

export function disadvantages(typing: Typing): TypeName[] {
  const [type1, type2] = typing;
  const result: TypeName[] = [];
  for (let attacker = 0; attacker < 18; attacker++) {
    let scalar = TYPE_CHART[attacker][TYPE_INDEX[type1]];
    if (type2) scalar *= TYPE_CHART[attacker][TYPE_INDEX[type2]];
    if (scalar > 1) result.push(ALL_TYPES[attacker]);
  }
  return result;
}

export function vsAdvantages(
  myTeam: Typing[],
  oppTeam: Pokemon[]
): Array<[TypeName, Pokemon]> {
  const result: Array<[TypeName, Pokemon]> = [];
  for (const myTyping of myTeam) {
    for (const myType of myTyping) {
      const myTypeIdx = TYPE_INDEX[myType];
      for (const opp of oppTeam) {
        const opp1Idx = TYPE_INDEX[opp.typing[0]];
        const opp2Idx = opp.typing[1] ? TYPE_INDEX[opp.typing[1]] : null;
        let scalar = TYPE_CHART[myTypeIdx][opp1Idx];
        if (opp2Idx !== null) scalar *= TYPE_CHART[myTypeIdx][opp2Idx];
        if (scalar > 1) result.push([myType, opp]);
      }
    }
  }
  return result;
}

export function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return; }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

/** Unordered: perfect matchings — always pin first element, iterate partners, recurse. */
function genVariationsUnordered(types: TypeName[]): Typing[][] {
  const odd = types.length % 2 === 1;
  const padded: (TypeName | null)[] = odd ? [...types, null] : [...types];

  function helper(s: (TypeName | null)[]): (TypeName | null)[][][] {
    if (s.length === 0) return [[]];
    const [first, ...rest] = s;
    const result: (TypeName | null)[][][] = [];
    for (let i = 0; i < rest.length; i++) {
      const partner = rest[i];
      const remaining = rest.filter((_, idx) => idx !== i);
      for (const sub of helper(remaining)) {
        result.push([[first, partner], ...sub]);
      }
    }
    return result;
  }

  return helper(padded).map(variation =>
    variation.map(pair => {
      const filtered = pair.filter((t): t is TypeName => t !== null);
      return filtered as Typing;
    })
  );
}

/** Ordered: recursive pick-every-pair — 90 pairings for 6 types. */
function genVariationsOrdered(types: TypeName[]): Typing[][] {
  if (types.length === 0) return [[]];
  if (types.length === 1) return [[[types[0]]]];

  const teams: Typing[][] = [];
  for (let i = 0; i < types.length; i++) {
    for (let j = i + 1; j < types.length; j++) {
      const l = types[i];
      const r = types[j];
      const remaining = types.filter((_, idx) => idx !== i && idx !== j);
      for (const subteam of genVariationsOrdered(remaining)) {
        teams.push([[l, r], ...subteam]);
      }
    }
  }
  return teams;
}

/**
 * Wrapper mirroring gen_variations(S, ordered) from the notebook.
 * ordered=true  → recursive pick-every-pair (90 for 6 types)
 * ordered=false → pinning algorithm (15 for 6 types)
 */
export function genVariations(types: TypeName[], ordered = false): Typing[][] {
  return ordered ? genVariationsOrdered(types) : genVariationsUnordered(types);
}

/**
 * Pairs the first half of a type list with the second half to form dual-type pokemon.
 * e.g. [A,B,C,D,E,F,G,H] → [(A,E),(B,F),(C,G),(D,H)]
 */
export function teamify(types: TypeName[]): Typing[] {
  if (types.length <= 4) {
    return types.map(t => [t] as Typing);
  }
  const first = types.slice(0, 4);
  const second = types.slice(4);
  return first.map((t, i) =>
    second[i] !== undefined ? [t, second[i]] : [t]
  ) as Typing[];
}

export function randomizer(candidateTeams: Typing[][], typeIndex: TypeIndex, allPokemon: Pokemon[]): Pokemon[] {
  const typings = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];
  const nameToId = new Map(allPokemon.map(p => [p.name, p.id]));
  return typings.map(typing => {
    const key = typingKey(typing);
    const names = typeIndex[key];
    const name = names[Math.floor(Math.random() * names.length)];
    return { id: nameToId.get(name) ?? 0, name, typing };
  });
}
