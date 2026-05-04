import { Strategy } from './Strategy';
import { Pokemon, TypeIndex, Typing } from '../typings';

export class MinimizeDisadvantagesStrategy implements Strategy {
  calculate(_inputTeam: Pokemon[], _typeIndex: TypeIndex, _teamSize: number): Promise<{ advantageCount: number; candidateTeams: Typing[][] }> {
    return Promise.reject(new Error('MinimizeDisadvantagesStrategy not yet implemented'));
  }
}
