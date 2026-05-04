export type TypeName =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const satisfies readonly TypeName[];

export const TYPE_INDEX: Record<TypeName, number> = {
  normal:   0,
  fire:     1,
  water:    2,
  electric: 3,
  grass:    4,
  ice:      5,
  fighting: 6,
  poison:   7,
  ground:   8,
  flying:   9,
  psychic:  10,
  bug:      11,
  rock:     12,
  ghost:    13,
  dragon:   14,
  dark:     15,
  steel:    16,
  fairy:    17,
};

// 18×18 type effectiveness matrix. Row = attacker, column = defender.
// Order: normal, fire, water, electric, grass, ice, fighting, poison,
//        ground, flying, psychic, bug, rock, ghost, dragon, dark, steel, fairy
export const TYPE_CHART = [
  // NOR   FIR   WTR   ELE   GRS   ICE   FIG   PSN   GRN   FLY   PSY   BUG   RCK   GST   DRA   DRK   STL   FRY
  [1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5,  0.0,  1.0,  1.0,  0.5,  1.0], // NORMAL
  [1.0,  0.5,  0.5,  1.0,  2.0,  2.0,  1.0,  1.0,  1.0,  1.0,  1.0,  2.0,  0.5,  1.0,  0.5,  1.0,  2.0,  1.0], // FIRE
  [1.0,  2.0,  0.5,  1.0,  0.5,  1.0,  1.0,  1.0,  2.0,  1.0,  1.0,  1.0,  2.0,  1.0,  0.5,  1.0,  1.0,  1.0], // WATER
  [1.0,  1.0,  2.0,  0.5,  0.5,  1.0,  1.0,  1.0,  0.0,  2.0,  1.0,  1.0,  1.0,  1.0,  0.5,  1.0,  1.0,  1.0], // ELECTRIC
  [1.0,  0.5,  2.0,  1.0,  0.5,  1.0,  1.0,  0.5,  2.0,  0.5,  1.0,  0.5,  2.0,  1.0,  0.5,  1.0,  0.5,  1.0], // GRASS
  [1.0,  0.5,  0.5,  1.0,  2.0,  0.5,  1.0,  1.0,  2.0,  2.0,  1.0,  1.0,  1.0,  1.0,  2.0,  1.0,  0.5,  1.0], // ICE
  [2.0,  1.0,  1.0,  1.0,  1.0,  2.0,  1.0,  0.5,  1.0,  0.5,  0.5,  0.5,  2.0,  0.0,  1.0,  2.0,  2.0,  0.5], // FIGHTING
  [1.0,  1.0,  1.0,  1.0,  2.0,  1.0,  1.0,  0.5,  0.5,  1.0,  1.0,  1.0,  0.5,  0.5,  1.0,  1.0,  0.0,  2.0], // POISON
  [1.0,  2.0,  1.0,  2.0,  0.5,  1.0,  1.0,  2.0,  1.0,  0.0,  1.0,  0.5,  2.0,  1.0,  1.0,  1.0,  2.0,  1.0], // GROUND
  [1.0,  1.0,  1.0,  0.5,  2.0,  1.0,  2.0,  1.0,  1.0,  1.0,  1.0,  2.0,  0.5,  1.0,  1.0,  1.0,  0.5,  1.0], // FLYING
  [1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  2.0,  2.0,  1.0,  1.0,  0.5,  1.0,  1.0,  1.0,  1.0,  0.0,  0.5,  1.0], // PSYCHIC
  [1.0,  0.5,  1.0,  1.0,  2.0,  1.0,  0.5,  0.5,  1.0,  0.5,  2.0,  1.0,  1.0,  0.5,  1.0,  2.0,  0.5,  0.5], // BUG
  [1.0,  2.0,  1.0,  1.0,  1.0,  2.0,  0.5,  1.0,  0.5,  2.0,  1.0,  2.0,  1.0,  1.0,  1.0,  1.0,  0.5,  1.0], // ROCK
  [0.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  2.0,  1.0,  1.0,  2.0,  1.0,  0.5,  1.0,  1.0], // GHOST
  [1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  2.0,  1.0,  0.5,  0.0], // DRAGON
  [1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5,  1.0,  1.0,  1.0,  2.0,  1.0,  1.0,  2.0,  1.0,  0.5,  1.0,  0.5], // DARK
  [1.0,  0.5,  0.5,  0.5,  1.0,  2.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  2.0,  1.0,  1.0,  1.0,  0.5,  2.0], // STEEL
  [1.0,  0.5,  1.0,  1.0,  1.0,  1.0,  2.0,  0.5,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  2.0,  2.0,  0.5,  1.0], // FAIRY
] as const;
