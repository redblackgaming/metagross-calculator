import * as fs from 'fs';
import * as path from 'path';
import { calculate } from '../calculate';
import { buildTypeIndex } from '../buildTypeIndex';
import { Pokemon } from '../typings';

// Load the real pokemon DB so the type index is accurate
const allPokemon: Pokemon[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../data/pokemon.json'), 'utf-8'),
);
const typeIndex = buildTypeIndex(allPokemon);

function byName(name: string): Pokemon {
  const p = allPokemon.find(p => p.name === name);
  if (!p) throw new Error(`Pokemon not found: ${name}`);
  return p;
}

describe('calculate', () => {
  test('6-pokemon input: sneasler / aerodactyl / garchomp / rotom-wash / excadrill / tyranitar', () => {
    const inputTeam: Pokemon[] = [
      byName('sneasler'),    // poison/fighting
      byName('aerodactyl'), // rock/flying
      byName('garchomp'),   // ground/dragon
      byName('rotom-wash'), // water/electric
      byName('excadrill'),  // steel/ground
      byName('tyranitar'),  // rock/dark
    ];

    const result = calculate(inputTeam, typeIndex, 6);

    console.log('advantageCount:', result.advantageCount);
    console.log('candidateTeams count:', result.candidateTeams.length);
    if (result.candidateTeams.length > 0) {
      console.log('example team:', result.candidateTeams[0]);
    }

    expect(result.advantageCount).toBeGreaterThan(0);
    expect(result.candidateTeams.length).toBeGreaterThan(0);

    for (const team of result.candidateTeams) {
      expect(team).toHaveLength(6);
    }

    // Every typing in every team must exist in the type index
    for (const team of result.candidateTeams) {
      for (const typing of team) {
        const key = [...typing].sort().join(',');
        expect(typeIndex).toHaveProperty(key);
      }
    }

    // All teams must share the same (maximum) advantage count
    const { vsAdvantages } = require('../typings');
    for (const team of result.candidateTeams) {
      expect(vsAdvantages(team, inputTeam).length).toBe(result.advantageCount);
    }
  });
});
