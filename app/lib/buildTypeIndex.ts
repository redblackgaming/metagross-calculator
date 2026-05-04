import { Pokemon, TypeIndex, typingKey } from './typings';

export function buildTypeIndex(pokemon: Pokemon[]): TypeIndex {
  const index: TypeIndex = {};
  for (const p of pokemon) {
    const key = typingKey(p.typing);
    if (!index[key]) index[key] = [];
    index[key].push(p.name);
  }
  // Remove entries with no pokemon (shouldn't happen but defensive)
  for (const key of Object.keys(index)) {
    if (index[key].length === 0) delete index[key];
  }
  return index;
}

export function buildFilteredTypeIndex(pokemon: Pokemon[], subset: string[]): TypeIndex {
  const subsetSet = new Set(subset);
  return buildTypeIndex(pokemon.filter(p => subsetSet.has(p.name)));
}
