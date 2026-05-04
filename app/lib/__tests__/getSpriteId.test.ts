import * as fs from 'fs';
import * as path from 'path';
import * as fsSync from 'fs';
import { getSpriteId, getSpriteUrl } from '../typings';
import type { Pokemon } from '../typings';

// Load the real pokemon DB
const allPokemon: Pokemon[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../data/pokemon.json'), 'utf-8'),
);

const SPRITES_DIR = path.join(__dirname, '../../public/sprites');
const FALLBACK_SUFFIXES = ['mf_n', 'uk_n', 'md_n', 'fd_n', 'fo_n', 'mo_n'];

/** Returns the first sprite filename that exists on disk for a given id, or null. */
function findExistingSprite(id: number): string | null {
  for (const suffix of FALLBACK_SUFFIXES) {
    const url = getSpriteUrl(id, suffix);           // e.g. /sprites/0479_000_uk_n.png
    const filename = path.basename(url);            // 0479_000_uk_n.png
    const fullPath = path.join(SPRITES_DIR, filename);
    if (fsSync.existsSync(fullPath)) return filename;
  }
  return null;
}

describe('getSpriteId', () => {
  test('rotom-wash resolves to rotom base form id', () => {
    const rotomWash = allPokemon.find(p => p.name === 'rotom-wash');
    const rotom = allPokemon.find(p => p.name === 'rotom');
    expect(rotomWash).toBeDefined();
    expect(rotom).toBeDefined();
    expect(getSpriteId(rotomWash!, allPokemon)).toBe(rotom!.id);
    expect(getSpriteId(rotomWash!, allPokemon)).toBe(479);
  });

  test('rotom-wash sprite id maps to a real file in public/sprites', () => {
    const rotomWash = allPokemon.find(p => p.name === 'rotom-wash')!;
    const found = findExistingSprite(getSpriteId(rotomWash, allPokemon));
    expect(found).not.toBeNull();
    console.log(`rotom-wash → sprite file: ${found}`);
  });

  test('landorus-therian resolves to lowest-id landorus form (645)', () => {
    const p = allPokemon.find(p => p.name === 'landorus-therian')!;
    expect(getSpriteId(p, allPokemon)).toBe(645);
    expect(findExistingSprite(645)).not.toBeNull();
  });

  test('darmanitan-galar-zen resolves to lowest-id darmanitan form (555)', () => {
    const p = allPokemon.find(p => p.name === 'darmanitan-galar-zen')!;
    expect(getSpriteId(p, allPokemon)).toBe(555);
    expect(findExistingSprite(555)).not.toBeNull();
  });

  test('non-form pokemon (garchomp) uses its own id', () => {
    const garchomp = allPokemon.find(p => p.name === 'garchomp')!;
    expect(getSpriteId(garchomp, allPokemon)).toBe(garchomp.id);
  });

  test('unknown base form falls back to original id', () => {
    const fakePokemon: Pokemon = { id: 9999, name: 'fakemon-special', typing: ['fire'] };
    expect(getSpriteId(fakePokemon, allPokemon)).toBe(9999);
  });
});
